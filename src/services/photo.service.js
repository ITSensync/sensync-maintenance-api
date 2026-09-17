import odooService from "./odoo.service.js";

function normalizeFolderPath(folderPath, idDevice) {
  const input = folderPath ?? idDevice;
  const path = Array.isArray(input) ? input : [input];

  return path
    .filter(name => typeof name === "string")
    .flatMap(name => name.split("/").map(part => part.trim()))
    .filter(Boolean);
}

async function getAll(body = {}) {
  try {
    const idDevice = body.id_device ?? body.idDevice;

    if (typeof idDevice !== "string" || !idDevice.trim()) {
      return {
        status: 400,
        message: "id_device wajib diisi",
        data: [],
      };
    }

    const folderPath = normalizeFolderPath(
      body.folder_path ?? body.folderPath ?? body.folder,
      idDevice,
    );
    const photos = await odooService.getFolderPhotos(folderPath);

    return {
      status: 200,
      message: "get photo data successful",
      data: photos,
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      message: error.message,
      data: [],
    };
  }
}

async function upload(files, body) {
  try {
    Object.keys(body).forEach((key) => {
      body[key] = parseJSON(body[key]);
    });

    const site = normalizeSite(body.site);

    const now = new Date();

    const today = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);

    let location;

    if (body.type === "sparing") {
      location = [`Maintenance Sparing ${body.domisili}`, site, today];
    }
    else if (body.type === "aqms") {
      location = [`AQMS ${site}`, today];
    }
    else if (body.type === "aqms_mini") {
      location = [`Mini Partikulat`, `${site}`, today];
    }

    for (const file of files) {
      await odooService.mainProcess(
        file.buffer,
        location,
        file.originalname,
      );
    }

    return {
      status: 200,
      message: "Success Upload File",
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: 500,
      message: error.message,
    };
  }
}

function parseJSON(val) {
  try {
    return JSON.parse(val);
  }
  catch {
    return val;
  }
}

function normalizeSite(site) {
  switch (site) {
    case "Sinar Sukses Mandiri":
      site = "SSM";
      break;
    case "Bintang Cipta Perkasa":
      site = "BCP";
      break;
    case "Indorama Synthetics Div. Spinning":
      site = "Spinning";
      break;
    case "Besland Pertiwi":
      site = "Besland";
      break;
    case "Papyrus Sakti":
      site = "Papyrus";
      break;
    case "Sari Dumai Oleo":
      site = "SDO";
      break;
    case "Ayoe Indotama Textile":
      site = "Ayoetex";
      break;
    default:
      break;
  }
  return site;
}

export default {
  getAll,
  upload,
};
