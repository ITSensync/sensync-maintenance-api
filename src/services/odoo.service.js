/* eslint-disable no-console */
/* eslint-disable node/no-process-env */

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import mime from "mime-types";
import { CookieJar } from "tough-cookie";

const jar = new CookieJar();

const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
  }),
);

const ODOO_URL = process.env.ODOO_URL;
const DB = process.env.ODOO_DB;
const USERNAME = process.env.ODOO_USERNAME;
const PASSWORD = process.env.ODOO_PASSWORD;

async function odooLogin() {
  const res = await client.post(`${ODOO_URL}/web/session/authenticate`, {
    jsonrpc: "2.0",
    params: {
      db: DB,
      login: USERNAME,
      password: PASSWORD,
    },
  });

  if (!res.data.result?.uid) {
    throw new Error("Login gagal (credential / DB salah)");
  }

  console.log("✅ Login OK:", res.data.result.uid);
}

async function callKw(model, method, args = [], kwargs = {}) {
  const res = await client.post(`${ODOO_URL}/web/dataset/call_kw`, {
    jsonrpc: "2.0",
    method: "call",
    params: { model, method, args, kwargs },
  });

  if (res.data.error)
    throw new Error(JSON.stringify(res.data.error));

  return res.data.result;
}

async function getOrCreateFolder(name, parentId = null) {
  const domain = [
    ["name", "=", name],
    ["type", "=", "folder"],
  ];

  if (parentId) {
    domain.push(["folder_id", "=", parentId]);
  }

  const found = await callKw(
    "documents.document",
    "search_read",
    [domain],
    { fields: ["id"], limit: 1 },
  );

  if (found.length)
    return found[0].id;

  return await callKw("documents.document", "create", [
    {
      name,
      type: "folder",
      folder_id: parentId || false,
    },
  ]);
}

async function searchFolder(cookie, name) {
  const payload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "documents.document",
      method: "search_read",
      args: [[["name", "=", name], ["type", "=", "folder"]]],
      kwargs: { fields: ["id", "name"], limit: 1 },
    },
  };

  const res = await axios.post(
    `${ODOO_URL}/web/dataset/call_kw`,
    payload,
    { headers: { Cookie: cookie } },
  );

  console.log(res.data);

  return res.data.result[0]?.id || null;
}

async function uploadBuffer(buffer, filename, folderId) {
  const base64 = buffer.toString("base64");

  // 1️⃣ create
  const docId = await callKw("documents.document", "create", [
    {
      name: filename,
      datas: base64,
      mimetype: mime.lookup(filename) || "application/octet-stream",
      folder_id: folderId,
    },
  ]);

  // 2️⃣ ambil token
  const [doc] = await callKw(
    "documents.document",
    "read",
    [[docId]],
    { fields: ["attachment_id"] },
  );

  const attachmentId = doc.attachment_id?.[0];

  if (!attachmentId) {
    throw new Error("Attachment Odoo tidak ditemukan untuk dokumen");
  }

  const [attachment] = await callKw(
    "ir.attachment",
    "read",
    [[attachmentId]],
    { fields: ["access_token"] },
  );

  const url = `${ODOO_URL}/web/content/${attachmentId}?download=true`;

  const publicUrl = attachment.access_token
    ? `${ODOO_URL}/web/content/${attachmentId}?access_token=${attachment.access_token}`
    : url;

  return {
    id: docId,
    attachmentId,
    url,
    publicUrl,
  };
}

async function mainProcess(buffer, folderPath = [], fileName) {
  await odooLogin();

  let parentId = null;

  // buat / cari folder berurutan
  for (const name of folderPath) {
    parentId = await getOrCreateFolder(name, parentId);
  }

  const result = await uploadBuffer(buffer, fileName, parentId);

  console.log("✅ Upload OK:", result);

  return result;
}

async function getFolderFiles(folderPath = []) {
  await odooLogin();

  let parentId = null;

  for (const name of folderPath) {
    const domain = [
      ["name", "=", name],
      ["type", "=", "folder"],
    ];

    if (parentId) {
      domain.push(["folder_id", "=", parentId]);
    }

    const folders = await callKw(
      "documents.document",
      "search_read",
      [domain],
      { fields: ["id"], limit: 1 },
    );

    if (!folders.length) {
      return [];
    }

    parentId = folders[0].id;
  }

  if (!parentId) {
    return [];
  }

  const files = await callKw(
    "documents.document",
    "search_read",
    [[
      ["folder_id", "=", parentId],
      ["type", "!=", "folder"],
    ]],
    {
      fields: ["id", "name", "mimetype", "access_token", "create_date"],
      order: "create_date desc",
    },
  );

  return files.map(file => ({
    id: file.id,
    name: file.name,
    mimetype: file.mimetype,
    createdAt: file.create_date,
    url: `${ODOO_URL}/web/content/${file.id}?download=true`,
    publicUrl: file.access_token
      ? `${ODOO_URL}/web/content/${file.id}?access_token=${file.access_token}`
      : null,
  }));
}

async function findFolderId(folderPath = []) {
  let parentId = null;

  for (const name of folderPath) {
    const domain = [
      ["name", "=", name],
      ["type", "=", "folder"],
    ];

    if (parentId) {
      domain.push(["folder_id", "=", parentId]);
    }

    const folders = await callKw(
      "documents.document",
      "search_read",
      [domain],
      { fields: ["id"], limit: 1 },
    );

    if (!folders.length) {
      return null;
    }

    parentId = folders[0].id;
  }

  return parentId;
}

function formatPhoto(file) {
  const attachmentId = file.attachment_id?.[0];

  return {
    id: file.id,
    attachmentId,
    name: file.name,
    mimetype: file.mimetype,
    createdAt: file.create_date,
    url: `${ODOO_URL}/web/content/${attachmentId}?download=false`,
    publicUrl: file.access_token
      ? `${ODOO_URL}/web/content/${attachmentId}?access_token=${file.access_token}`
      : null,
  };
}

async function getFolderPhotos(folderPath = []) {
  await odooLogin();

  const siteFolderId = await findFolderId(folderPath);

  if (!siteFolderId) {
    return [];
  }

  const dateFolders = await callKw(
    "documents.document",
    "search_read",
    [[
      ["folder_id", "=", siteFolderId],
      ["type", "=", "folder"],
    ]],
    {
      fields: ["id", "name", "create_date"],
      order: "create_date desc",
    },
  );

  const photosByDate = [];

  for (const dateFolder of dateFolders) {
    const files = await callKw(
      "documents.document",
      "search_read",
      [[
        ["folder_id", "=", dateFolder.id],
        ["type", "!=", "folder"],
      ]],
      {
        fields: ["id", "name", "mimetype", "attachment_id", "create_date"],
        order: "create_date desc",
      },
    );

    const attachmentIds = files
      .map(file => file.attachment_id?.[0])
      .filter(Boolean);

    const accessTokens = new Map();

    if (attachmentIds.length) {
      // generate_access_token mengisi field access_token di DB
      // DAN mengembalikan token-nya langsung, urut sesuai attachmentIds
      const tokens = await callKw(
        "ir.attachment",
        "generate_access_token",
        [attachmentIds],
      );

      attachmentIds.forEach((id, i) => {
        accessTokens.set(id, tokens[i]);
      });
    }

    photosByDate.push({
      tanggal: dateFolder.name,
      data: files.map(file => formatPhoto({
        ...file,
        access_token: accessTokens.get(file.attachment_id?.[0]),
      })),
    });
  }

  return photosByDate;
}

export default {
  odooLogin,
  searchFolder,
  mainProcess,
  getFolderFiles,
  getFolderPhotos,
};
