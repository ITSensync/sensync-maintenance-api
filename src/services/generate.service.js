/* eslint-disable no-console */
/* eslint-disable node/prefer-global/buffer */
import fs from "node:fs";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import libre from "libreoffice-convert";
import PizZip from "pizzip";
import documentService from "./document.service.js";
import odooService from "./odoo.service.js";

const PARAF_PATH = "./templates/paraf_korektif.png";

async function BAKorektif(body, files) {
  const content = fs.readFileSync("./templates/template_korektif.docx", "binary");
  const imageModule = new ImageModule({
    getImage(tagValue) {
      // ✅ 1. static paraf
      if (tagValue === PARAF_PATH) {
        return fs.readFileSync(PARAF_PATH);
      }

      // ✅ 2. base64 image (ttd)
      if (typeof tagValue === "string" && tagValue.includes("base64,")) {
        const base64 = tagValue.split("base64,")[1];
        return Buffer.from(base64, "base64");
      }

      // ✅ 3. pure base64 tanpa prefix
      if (typeof tagValue === "string" && tagValue.length > 200) {
        return Buffer.from(tagValue, "base64");
      }

      return null;
    },

    getSize(img, tagValue, tagName) {
      if (tagName === "status") {
        return [40, 40]; // paraf kecil
      }

      if (
        tagName === "ttd_teknisi"
        || tagName === "ttd_pengawas_lapangan"
      ) {
        return [175, 100]; // tanda tangan besar
      }

      return [100, 50]; // default fallback
    },
  });

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    modules: [imageModule],
    paragraphLoop: true,
    linebreaks: true,
  });

  const itemsRaw = body.items
    ? JSON.parse(body.items)
    : [];

  const items = itemsRaw.map((x, i) => ({
    no: i + 1,
    ...x,
    status: x.status === "ok" ? PARAF_PATH : x.status,
  }));

  const now = new Date();

  const today = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  // format: Rabu, 4 Februari 2026
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  doc.render({
    nomor_ba: body.nomor_ba,
    site: body.site,
    teknisi: body.teknisi,
    pengawas_lapangan: body.pengawas_lapangan,
    lokasi: body.lokasi,
    tanggal,
    today,
    items,
    ttd_teknisi: body.ttd_teknisi,
    ttd_pengawas_lapangan: body.ttd_pengawas_lapangan,
  });

  const buf = doc.toBuffer();

  // fs.writeFileSync(`./tmp/ba_korektif_${body.site}.docx`, buf);

  // return `./tmp/ba_korektif_${body.site}.docx`;

  // convert to pdf
  const fileDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(now)
    .replace(/\//g, "-");

  const pdfBuf = await new Promise((resolve, reject) => {
    libre.convert(buf, ".pdf", "writer_pdf_Export", (err, done) => {
      if (err)
        reject(err);
      else resolve(done);
    });
  });

  // fs.writeFileSync(`./tmp/ba_korektif_${body.site}_${fileDate}.pdf`, pdfBuf);

  // UPLOAD TO ODOO
  const site = body.site;
  const filename = `ba_korektif_${body.site}_${fileDate}.pdf`;

  const resultOdoo = await odooService.mainProcess(pdfBuf, [`BA Pemeliharaan`, site, "Korektif"], filename);

  // add to database
  await documentService.add({
    catatan: "",
    link: resultOdoo.url,
  });

  // UPLOAD DOKUMENTASI KE ODOO
  for (const file of files) {
    await odooService.mainProcess(
      file.buffer,
      [`Maintenance Sparing ${body.lokasi}`, site, today],
      file.originalname,
    );
  }

  return {
    buffer: pdfBuf,
    filename: `ba_korektif_${body.site}_${fileDate}.pdf`,
  };
}

async function BAPreventif(body, files) {
  Object.keys(body).forEach((key) => {
    body[key] = parseJSON(body[key]);
  });

  const content = fs.readFileSync("./templates/template_preventif.docx", "binary");
  const imageModule = new ImageModule({
    getImage(tagValue) {
      // ✅ 1. static paraf
      if (tagValue === PARAF_PATH) {
        return fs.readFileSync(PARAF_PATH);
      }

      // ✅ 2. base64 image (ttd)
      if (typeof tagValue === "string" && tagValue.includes("base64,")) {
        const base64 = tagValue.split("base64,")[1];
        return Buffer.from(base64, "base64");
      }

      // ✅ 3. pure base64 tanpa prefix
      if (typeof tagValue === "string" && tagValue.length > 200) {
        return Buffer.from(tagValue, "base64");
      }

      return null;
    },

    getSize(img, tagValue, tagName) {
      if (tagName === "status") {
        return [40, 40]; // paraf kecil
      }

      if (
        tagName === "ttd_teknisi"
        || tagName === "ttd_pengawas_lapangan"
      ) {
        return [175, 100]; // tanda tangan besar
      }

      return [100, 50]; // default fallback
    },
  });

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    modules: [imageModule],
    paragraphLoop: true,
    linebreaks: true,
  });

  const now = new Date();

  const today = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  // format: Rabu, 4 Februari 2026
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  /* CONVERT INPUT SEBELUM/SESUDAH */
  const statusIcon = (val) => {
    if (val === "ok")
      return "V";
    if (val === "not_ok")
      return "-";
    return "";
  };

  const getStatus = (key, when) =>
    statusIcon(body[key]?.[when]);

  doc.render({
    nomor_ba: body.nomor_ba,
    site: body.site,
    teknisi: body.teknisi,
    pengawas_lapangan: body.pengawas_lapangan,
    lokasi: body.lokasi,
    tanggal,
    today,
    ttd_teknisi: body.ttd_teknisi,
    ttd_pengawas_lapangan: body.ttd_pengawas_lapangan,

    // CHECKLIST SEBELUM
    tampilan_sebelum: getStatus("tampilan", "sebelum"),
    internet_sebelum: getStatus("internet", "sebelum"),
    minipc_sebelum: getStatus("minipc", "sebelum"),
    sensor_sebelum: getStatus("sensor", "sebelum"),
    bersih_sebelum: getStatus("bersih", "sebelum"),
    chamber_sebelum: getStatus("chamber", "sebelum"),
    pembacaan_sebelum: getStatus("pembacaan", "sebelum"),
    kalibrasi_sebelum: getStatus("kalibrasi_selesai", "sebelum"),
    cod_sebelum: body.cod.sebelum,
    tss_sebelum: body.tss.sebelum,
    ph_sebelum: body.ph.sebelum,
    nh3n_sebelum: body.nh3n.sebelum,
    connector_sebelum: getStatus("connector", "sebelum"),
    flowmeter_sebelum: getStatus("flowmeter", "sebelum"),
    pompa_sebelum: getStatus("pompa", "sebelum"),
    data_sebelum: getStatus("data", "sebelum"),

    // CHECKLIST SESUDAH
    tampilan_sesudah: getStatus("tampilan", "sesudah"),
    internet_sesudah: getStatus("internet", "sesudah"),
    minipc_sesudah: getStatus("minipc", "sesudah"),
    sensor_sesudah: getStatus("sensor", "sesudah"),
    bersih_sesudah: getStatus("bersih", "sesudah"),
    chamber_sesudah: getStatus("chamber", "sesudah"),
    pembacaan_sesudah: getStatus("pembacaan", "sesudah"),
    kalibrasi_sesudah: getStatus("kalibrasi_selesai", "sesudah"),
    cod_sesudah: body.cod.sesudah,
    tss_sesudah: body.tss.sesudah,
    ph_sesudah: body.ph.sesudah,
    nh3n_sesudah: body.nh3n.sesudah,
    connector_sesudah: getStatus("connector", "sesudah"),
    flowmeter_sesudah: getStatus("flowmeter", "sesudah"),
    pompa_sesudah: getStatus("pompa", "sesudah"),
    data_sesudah: getStatus("data", "sesudah"),

    keterangan: body.keterangan,
    catatan: body.catatan,
  });

  const buf = doc.toBuffer();

  // fs.writeFileSync(`./tmp/ba_preventif_${body.site}.docx`, buf);

  // return `./tmp/ba_korektif_${body.site}.docx`;

  // convert to pdf
  const fileDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(now)
    .replace(/\//g, "-");

  const pdfBuf = await new Promise((resolve, reject) => {
    libre.convert(buf, ".pdf", "writer_pdf_Export", (err, done) => {
      if (err)
        reject(err);
      else resolve(done);
    });
  });

  // fs.writeFileSync(`./tmp/ba_korektif_${body.site}_${fileDate}.pdf`, pdfBuf); //for debugging

  // UPLOAD TO ODOO
  const site = body.site;
  const filename = `ba_preventif_${body.site}_${fileDate}.pdf`;

  const resultOdoo = await odooService.mainProcess(pdfBuf, [`BA Pemeliharaan`, site, "Preventif"], filename);

  // add to database
  await documentService.add({
    catatan: body.catatan,
    link: resultOdoo.url,
  });

  // UPLOAD DOKUMENTASI KE ODOO
  for (const file of files) {
    await odooService.mainProcess(
      file.buffer,
      [`Maintenance Sparing ${body.lokasi}`, site, today],
      file.originalname,
    );
  }

  return {
    buffer: pdfBuf,
    filename: `ba_preventif_${body.site}_${fileDate}.pdf`,
  };

  // return true; //for debugging
}

function parseJSON(val) {
  try {
    return JSON.parse(val);
  }
  catch {
    return val;
  }
}

export default {
  BAKorektif,
  BAPreventif,
};
