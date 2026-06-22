/* eslint-disable node/no-process-env */
/* eslint-disable node/prefer-global/buffer */
import fs from "node:fs";
import path from "node:path";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";
// import ExcelJS from "exceljs";
import libre from "libreoffice-convert";
import PizZip from "pizzip";
import XlsxPopulate from "xlsx-populate";
import documentService from "./document.service.js";
import excelParserService from "./excel-parser.service.js";
import odooService from "./odoo.service.js";

const PARAF_PATH = "./templates/paraf_korektif.png";
const COD_GRAPH_PATH = "./tmp/cod_chart.png";
const PH_GRAPH_PATH = "./tmp/ph_chart.png";
const NH3N_GRAPH_PATH = "./tmp/nh3n_chart.png";
const DOCX_IMAGE_PX_PER_CM = 37.795;
const REPORT_CHART_SIZE = [
  Math.round(12 * DOCX_IMAGE_PX_PER_CM),
  Math.round(8 * DOCX_IMAGE_PX_PER_CM),
];
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const chartCanvas = new ChartJSNodeCanvas({
  width: 800,
  height: 500,
  backgroundColour: "white",
  plugins: {
    modern: ["chartjs-plugin-annotation"], // ✅ register di sini
  },
});

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

async function BAKorektif(body) {
  const site = normalizeSite(body.site);

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

  /* SENT TO CPI SHEET */
  await inputCPISpreadsheet({
    tanggal: toGoogleSheetsDate(),
    site,
    actualDuration: hitungDurasi(body.start_time, body.end_time),
  }, "Corrective");

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
  const filename = `berita_acara_${site}_${fileDate}.pdf`;

  const resultOdoo = await odooService.mainProcess(pdfBuf, [`BA Pemeliharaan`, site, "Korektif"], filename);

  // add to database
  await documentService.add({
    catatan: "",
    link: resultOdoo.url,
  });

  // UPLOAD DOKUMENTASI KE ODOO
  /* for (const file of files) {
    await odooService.mainProcess(
      file.buffer,
      [`Maintenance Sparing ${body.lokasi}`, site, today],
      file.originalname,
    );
  } */

  // TEMPORARY FILE FOR PREVIEW
  const id = crypto.randomUUID();
  const previewName = `${id}.pdf`;
  const locationFile = `${filename}_${previewName}`;
  fs.writeFileSync(`./tmp/${locationFile}`, pdfBuf);

  return {
    success: true,
    url: `preview/${locationFile}`,
  };

  /* return {
    buffer: pdfBuf,
    filename: `ba_korektif_${body.site}_${fileDate}.pdf`,
  }; */
  // return true;
}

async function BAPreventif(body) {
  Object.keys(body).forEach((key) => {
    body[key] = parseJSON(body[key]);
  });

  const site = normalizeSite(body.site);

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

  /* SENT TO CPI SHEET */
  await inputCPISpreadsheet({
    tanggal: toGoogleSheetsDate(),
    site,
    actualDuration: hitungDurasi(body.start_time, body.end_time),
  }, "Preventive");

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
    cod_sebelum: body.cod?.sebelum ?? "-",
    tss_sebelum: body.tss?.sebelum ?? "-",
    ph_sebelum: body.ph?.sebelum ?? "-",
    nh3n_sebelum: body.nh3n?.sebelum ?? "-",
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
    cod_sesudah: body.cod?.sesudah ?? "-",
    tss_sesudah: body.tss?.sesudah ?? "-",
    ph_sesudah: body.ph?.sesudah ?? "-",
    nh3n_sesudah: body.nh3n?.sesudah ?? "-",
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
  const filename = `berita_acara_${site}_${fileDate}.pdf`;

  const resultOdoo = await odooService.mainProcess(pdfBuf, [`Berita Acara`, site, "Preventif"], filename);

  // GENERATE KALIBRASI
  /* const result = await generateKalibrasi(body.kalibrasi, site, fileDate);
  await odooService.mainProcess(result.buffer, ["4. Kalibrasi & QC", site, today], result.filename); */

  // add to database
  await documentService.add({
    catatan: body.catatan,
    link: resultOdoo.url,
  });

  // UPLOAD DOKUMENTASI KE ODOO
  /* for (const file of files) {
    await odooService.mainProcess(
      file.buffer,
      [`Maintenance Sparing ${body.lokasi}`, site, today],
      file.originalname,
    );
  } */

  // TEMPORARY FILE FOR PREVIEW
  const id = crypto.randomUUID();
  const previewName = `${id}.pdf`;
  const locationFile = `${filename}_${previewName}`;
  fs.writeFileSync(`./tmp/${locationFile}`, pdfBuf);

  return {
    success: true,
    url: `preview/${locationFile}`,
  };

  // return true; // for debugging
}

async function BAPreventifBase(body) {
  Object.keys(body).forEach((key) => {
    body[key] = parseJSON(body[key]);
  });

  const content = fs.readFileSync("./templates/template_preventif_base.docx", "binary");
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

  doc.render({
    nomor_ba: body.nomor_ba,
    site: body.site,
    teknisi: body.teknisi,
    pengawas_lapangan: body.pengawas_lapangan,
    lokasi: body.lokasi,
    alamat: body.alamat,
    tanggal,
    today,
    ttd_teknisi: body.ttd_teknisi,
    ttd_pengawas_lapangan: body.ttd_pengawas_lapangan,

    // CHECKLIST STATUS
    pembersihan_fisik_status: body.pembersihan_fisik?.status ? "Dilakukan" : "Tidak dilakukan",
    pengecekan_status: body.pengecekan_pembersihan?.status ? "Dilakukan" : "Tidak dilakukan",
    gas_status: body.sensor_gas?.status ? "Terhubung" : "Tidak terhubung",
    meteorologi_status: body.sensor_meteorologi?.status ? "Terhubung" : "Tidak terhubung",
    partikulat_status: body.sensor_partikulat?.status ? "Terhubung" : "Tidak terhubung",
    kabel_koneksi_status: body.kabel_koneksi?.status ? "Baik" : "Bermasalah",
    backup_status: body.pencatatan_backup_data?.status ? "Dilakukan" : "Tidak dilakukan",
    catu_daya_status: body.catu_daya?.status ? "Berfungsi" : "Tidak Berfungsi",
    komunikasi_status: body.komunikasi_data?.status ? "Terhubung" : "Tidak terhubung",
    silika_status: body.silika_gel?.status ? "Dilakukan" : "Tidak dilakukan",
    running_text_status: body.display_running_text?.status ? "Berfungsi" : "Tidak berfungsi",
    pagar_status: body.pagar_pelindung?.status ? "Baik" : "Bermasalah",
    cctv_status: body.cctv?.status ? "Berfungsi" : "Tidak berfungsi",

    pembersihan_fisik_keterangan: body.pembersihan_fisik.keterangan,
    pengecekan_keterangan: body.pengecekan_pembersihan.keterangan,
    gas_keterangan: body.sensor_gas.keterangan,
    meteorologi_keterangan: body.sensor_meteorologi.keterangan,
    partikulat_keterangan: body.sensor_partikulat.keterangan,
    kabel_koneksi_keterangan: body.kabel_koneksi.keterangan,
    backup_keterangan: body.pencatatan_backup_data.keterangan,
    catu_daya_keterangan: body.catu_daya.keterangan,
    komunikasi_keterangan: body.komunikasi_data.keterangan,
    silika_keterangan: body.silika_gel.keterangan,
    running_text_keterangan: body.display_running_text.keterangan,
    pagar_keterangan: body.pagar_pelindung.keterangan,
    cctv_keterangan: body.cctv.keterangan,
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
  const filename = `berita_acara_${site}_${fileDate}.pdf`;

  const resultOdoo = await odooService.mainProcess(pdfBuf, [`BA Pemeliharaan`, site, "Preventif"], filename);

  // GENERATE KALIBRASI
  /* const result = await generateKalibrasi(body.kalibrasi, site, fileDate);
  await odooService.mainProcess(result.buffer, ["4. Kalibrasi & QC", site, today], result.filename); */

  // add to database
  await documentService.add({
    catatan: body.catatan || "",
    link: resultOdoo.url,
  });

  // UPLOAD DOKUMENTASI KE ODOO
  /* for (const file of files) {
    await odooService.mainProcess(
      file.buffer,
      [`Maintenance Sparing ${body.lokasi}`, site, today],
      file.originalname,
    );
  } */

  // TEMPORARY FILE FOR PREVIEW
  const id = crypto.randomUUID();
  const previewName = `${id}.pdf`;
  const locationFile = `${filename}_${previewName}`;
  fs.writeFileSync(`./tmp/${locationFile}`, pdfBuf);

  return {
    success: true,
    url: `preview/${locationFile}`,
  };
}

async function BABulanan(body) {
  const content = fs.readFileSync("./templates/template_bulanan_besland.docx", "binary");
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

  const items = itemsRaw.map((x, _i) => ({
    ...x,
  }));

  const now = new Date();

  const today = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  doc.render({
    nomor_ba: body.nomor_ba,
    site: body.site,
    teknisi: body.teknisi,
    pengawas_lapangan: body.pengawas_lapangan,
    jabatan1: body.jabatan1,
    jabatan2: body.jabatan2,
    lokasi: body.lokasi,
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
  const site = normalizeSite(body.site);
  const filename = `berita_acara_${site}_${fileDate}.pdf`;

  const resultOdoo = await odooService.mainProcess(pdfBuf, [`BA Pemeliharaan`, site, "Bulanan"], filename);

  // add to database
  await documentService.add({
    catatan: "",
    link: resultOdoo.url,
  });

  // UPLOAD DOKUMENTASI KE ODOO
  /* for (const file of files) {
    await odooService.mainProcess(
      file.buffer,
      [`Maintenance Sparing ${body.lokasi}`, site, today],
      file.originalname,
    );
  } */

  // TEMPORARY FILE FOR PREVIEW
  /* const id = crypto.randomUUID();
  const previewName = `${id}.pdf`; */
  const id = crypto.randomUUID();
  const previewName = `${id}.pdf`;
  const locationFile = `${filename}_${previewName}`;
  fs.writeFileSync(`./tmp/${locationFile}`, pdfBuf);

  return {
    success: true,
    url: `preview/${locationFile}`,
  };

  /* return {
    buffer: pdfBuf,
    filename: `ba_korektif_${body.site}_${fileDate}.pdf`,
  }; */
}

async function BAST(body, type) {
  const content = fs.readFileSync("./templates/template_serah_terima.docx", "binary");
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

  const items = itemsRaw.map((x, _i) => ({
    ...x,
  }));

  const now = new Date();

  const today = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  doc.render({
    nomor_ba: body.nomor_ba,
    site: body.site.toUpperCase(),
    teknisi: body.teknisi,
    pengawas_lapangan: body.pengawas_lapangan,
    jabatan1: body.jabatan1,
    jabatan2: body.jabatan2,
    lokasi: body.lokasi,
    type,
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
  const site = normalizeSite(body.site);
  const filename = `berita_acara_serah_terima_${site}_${fileDate}.pdf`;

  const resultOdoo = await odooService.mainProcess(pdfBuf, [`BA Pemeliharaan`, site, "Serah Terima"], filename);

  // add to database
  await documentService.add({
    catatan: "",
    link: resultOdoo.url,
  });

  // UPLOAD DOKUMENTASI KE ODOO
  /* for (const file of files) {
    await odooService.mainProcess(
      file.buffer,
      [`Maintenance Sparing ${body.lokasi}`, site, today],
      file.originalname,
    );
  } */

  // TEMPORARY FILE FOR PREVIEW
  /* const id = crypto.randomUUID();
  const previewName = `${id}.pdf`; */
  const id = crypto.randomUUID();
  const previewName = `${id}.pdf`;
  const locationFile = `${filename}_${previewName}`;
  fs.writeFileSync(`./tmp/${locationFile}`, pdfBuf);

  return {
    success: true,
    url: `preview/${locationFile}`,
  };
}

async function generateKalibrasi(body) {
  try {
    const data = body.kalibrasi;
    const now = new Date();

    const site = normalizeSite(body.site);

    const tanggal = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);

    const template = path.resolve("./templates/template_kalibrasi.xlsx");

    /* const filename = `kalibrasi_${site}_${tanggal}.xlsx`;
    const output = path.resolve(`./tmp/${filename}`);

    // copy template supaya file asli aman
    fs.copyFileSync(template, output);

    // buka file hasil copy (chart tetap ada)
    const workbook = await XlsxPopulate.fromFileAsync(output); */

    const workbook = await XlsxPopulate.fromFileAsync(template);

    const mapping = {
      cod: "COD",
      ph: "pH",
      tss: "TSS",
      nh3n: "NH3N",
    };

    for (const key in mapping) {
      if (!data[key])
        continue;

      const sheet = workbook.sheet(mapping[key]);
      const formulaCols = ["D", "E", "F", "G"]; // kolom dengan rumus
      const startRow = 3;
      const dataRows = data[key].length;
      const lastDataRow = startRow + dataRows - 1; // baris terakhir untuk data, sebelum Average

      data[key].forEach((item, index) => {
        const row = startRow + index;

        const regresion = linearRegression(data[key]);

        // isi data kolom A & B
        sheet.cell(`A${row}`).value(Number(item.larutan));
        sheet.cell(`B${row}`).value(Number(item.nilai));
        sheet.cell(`C${row}`).formula(`(B${row} - ${regresion.b}) / ${regresion.a}`);

        // copy rumus dari baris 3 ke baris data baru, hanya ganti nomor baris
        formulaCols.forEach((col) => {
          const formula = sheet.cell(`${col}3`).formula();
          if (formula && row <= lastDataRow) {
            // ganti hanya angka 3 dengan nomor baris baru, sisanya tetap
            const newFormula = formula.replace(/3/g, row);
            sheet.cell(`${col}${row}`).formula(newFormula);
          }
        });
      });
    }

    // save TANPA merusak chart
    const fileBuffer = await workbook.outputAsync();

    await odooService.mainProcess(fileBuffer, ["4. Kalibrasi & QC", site, tanggal], `kalibrasi_${site}_${tanggal}.xlsx`);

    return {
      status: 200,
      message: "Success Generate Kalibrasi File",
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

async function previewFile(filename) {
  return { filePath: `./tmp/${filename}` };
}

async function inputCPISpreadsheet(data, type) {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_CPI_ID, serviceAccountAuth);
    await doc.loadInfo();

    // Generate nama sheet sesuai bulan & tahun sekarang
    const now = new Date();
    const sheetName = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(now);

    let sheet = doc.sheetsByTitle[`CPI ${sheetName}`];

    if (!sheet) {
      sheet = await doc.addSheet({ title: `CPI ${sheetName}` });

      await sheet.loadCells("A3:G3");

      const headers = ["No", "Tanggal", "Site", "Maintenance", "Jenis Maintenance", "Planned Duration (jam)", "Actual Duration (jam)"];

      headers.forEach((header, i) => {
        const cell = sheet.getCell(2, i); // row index 2 = baris ke-3
        cell.value = header;
      });

      await sheet.loadCells("B4:B1000");
      for (let i = 4; i < 1000; i++) {
        const cell = sheet.getCell(i, 1); // kolom B
        cell.numberFormat = {
          type: "DATE",
          pattern: "mm/dd/yyyy",
        };
      }

      await sheet.saveUpdatedCells();
    }

    await sheet.loadHeaderRow(3);
    const rows = await sheet.getRows();

    const lastRow = rows.filter(row => row.get("No")).length;
    const nextNo = lastRow + 1;

    await sheet.addRow({
      "No": nextNo,
      "Tanggal": data.tanggal,
      "Site": data.site,
      "Maintenance": type,
      "Jenis Maintenance": data.jenisMaintenance,
      "Planned Duration (jam)": 3,
      "Actual Duration (jam)": data.actualDuration,
    });

    return {
      status: 200,
      message: "Success input data",
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: 500,
      message: error,
    };
  }
}

function formatTwoDecimals(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue.toFixed(2)
    : value;
}

function formatDecimalComma(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? String(value).replace(".", ",")
      : value;
  }

  if (typeof value !== "string") {
    return value;
  }

  return value.replace(/(-?\d+)\.(\d+)/g, "$1,$2");
}

function formatRowsDecimalComma(rows = []) {
  return rows.map(row => Object.fromEntries(
    Object.entries(row).map(([field, value]) => [field, formatDecimalComma(value)]),
  ));
}

function normalizePercent(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  const percentValue = Math.abs(numericValue * 100);

  return percentValue.toFixed(2);
}

function shouldFormatRowValue(fieldName) {
  return !["COD", "pH", "NH3N", "TSS", "cod", "ph", "nh3n", "tss"].includes(fieldName);
}

function pickSummaryValue(item = {}, aliases = []) {
  return aliases
    .map(alias => item?.[alias])
    .find(value => value !== undefined && value !== null && value !== "");
}

function getPersamaanValue(item = {}) {
  return formatTwoDecimals(pickSummaryValue(item, ["persamaan", "Persamaan"]));
}

function getR2Value(item = {}) {
  return formatTwoDecimals(pickSummaryValue(item, ["r2", "R2"]));
}

function getSensitivitasValue(item = {}) {
  return normalizePercent(pickSummaryValue(item, ["sensitivitas", "Sensitivitas"]));
}

function getBiasSebelumValue(item = {}) {
  return normalizePercent(pickSummaryValue(item, ["biasSebelum", "Bias", "bias"]));
}

function getBiasSesudahValue(item = {}) {
  return normalizePercent(pickSummaryValue(item, ["biasSesudah", "Bias_1", "bias_1"]));
}

function getAkurasiValue(item = {}) {
  return normalizePercent(pickSummaryValue(item, ["akurasi_1", "Akurasi_1"]));
}

function getRegressionSummary(rows = []) {
  const validRows = (rows ?? []).filter((item) => {
    const x = item?.COD
      ?? item?.cod
      ?? item?.pH
      ?? item?.ph
      ?? item?.NH3N
      ?? item?.nh3n
      ?? item?.TSS
      ?? item?.tss
      ?? item?.larutan
      ?? item?.Larutan;

    const y = item?.Sensor
      ?? item?.sensor
      ?? item?.nilai
      ?? item?.Nilai;

    return x !== undefined && x !== "" && y !== undefined && y !== "";
  });

  if (validRows.length < 2) {
    return {
      persamaan: "",
      r2: "",
      sensitivitas: "",
    };
  }

  const regression = linearRegression(validRows.map(item => ({
    larutan: item?.COD ?? item?.cod ?? item?.pH ?? item?.ph ?? item?.NH3N ?? item?.nh3n ?? item?.TSS ?? item?.tss ?? item?.larutan ?? item?.Larutan,
    nilai: item?.Sensor ?? item?.sensor ?? item?.nilai ?? item?.Nilai,
  })));

  const yValues = validRows.map(item => Number(item?.Sensor ?? item?.sensor ?? item?.nilai ?? item?.Nilai));
  const yMean = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;

  const ssRes = validRows.reduce((sum, item) => {
    const x = Number(item?.COD ?? item?.cod ?? item?.pH ?? item?.ph ?? item?.NH3N ?? item?.nh3n ?? item?.TSS ?? item?.tss ?? item?.larutan ?? item?.Larutan);
    const y = Number(item?.Sensor ?? item?.sensor ?? item?.nilai ?? item?.Nilai);
    const predicted = regression.a * x + regression.b;

    return sum + (y - predicted) ** 2;
  }, 0);

  const ssTot = yValues.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return {
    persamaan: `y = ${formatTwoDecimals(regression.a)}x + ${formatTwoDecimals(regression.b)}`,
    r2: formatTwoDecimals(Math.max(0, Math.min(1, r2))),
    sensitivitas: formatTwoDecimals(regression.a),
  };
}

function normalizeKalibrasiData(dataKalibrasi = {}) {
  const aliases = {
    cod: ["cod", "COD"],
    ph: ["ph", "pH"],
    nh3n: ["nh3n", "NH3N"],
    tss: ["tss", "TSS"],
  };

  const normalized = {};

  for (const [key, names] of Object.entries(aliases)) {
    const rawValue = names
      .map(name => dataKalibrasi[name])
      .find(value => value !== undefined);

    const source = rawValue ?? dataKalibrasi[key] ?? [];

    if (Array.isArray(source)) {
      const rows = source.slice(0, -1);

      let lastItem = {};
      if (key === "tss") {
        lastItem = source[source.length - 2] ?? {};
      }
      else {
        lastItem = source[source.length - 1] ?? {};
      }

      const regressionSummary = getRegressionSummary(rows);

      normalized[key] = {
        rows: rows.map(item => Object.fromEntries(
          Object.entries(item).map(([field, value]) => [field, shouldFormatRowValue(field) ? formatTwoDecimals(value) : value]),
        )),
        persamaan: regressionSummary.persamaan || getPersamaanValue(lastItem),
        r2: regressionSummary.r2 || getR2Value(lastItem),
        sensitivitas: regressionSummary.sensitivitas || getSensitivitasValue(lastItem),
        biasSebelum: getBiasSebelumValue(lastItem),
        biasSesudah: getBiasSesudahValue(lastItem),
        akurasi: getAkurasiValue(lastItem),
      };
      continue;
    }

    // const rows = (source?.rows ?? source?.Rows ?? source)?.slice(0, -1) ?? [];

    // normalized[key] = {
    //   ...(source ?? {}),
    //   rows: rows.map(item => Object.fromEntries(
    //     Object.entries(item).map(([field, value]) => [field, shouldFormatRowValue(field) ? formatTwoDecimals(value) : value]),
    //   )),
    //   persamaan: formatTwoDecimals(source?.persamaan ?? source?.Persamaan ?? ""),
    //   r2: formatTwoDecimals(source?.r2 ?? source?.R2 ?? ""),
    //   sensitivitas: normalizePercent(source?.sensitivitas ?? source?.Sensitivitas ?? ""),
    //   biasSebelum: normalizePercent(source?.biasSebelum ?? source?.Bias ?? source?.bias ?? ""),
    //   biasSesudah: normalizePercent(source?.biasSesudah ?? source?.Bias_1 ?? source?.bias_1 ?? ""),
    //   akurasi: normalizePercent(source?.akurasi ?? source?.Akurasi ?? ""),
    // };
  }

  return normalized;
}

async function generateReportKalibrasi(
  fileExcel,
  site,
  tanggalKalibrasi,
) {
  try {
    const siteNormalized = normalizeSite(site);

    const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(tanggalKalibrasi));

    const rawKalibrasi = await excelParserService.parseKalibrasiExcel(fileExcel);
    const dataKalibrasi = normalizeKalibrasiData(rawKalibrasi);

    const safe = {
      cod: dataKalibrasi.cod ?? {},
      ph: dataKalibrasi.ph ?? {},
      nh3n: dataKalibrasi.nh3n ?? {},
      tss: dataKalibrasi.tss ?? {},
    };

    // template word
    const content = fs.readFileSync(
      "./templates/template_report_kalibrasi.docx",
      "binary",
    );

    const zip = new PizZip(content);
    const imageModule = new ImageModule({
      getImage(tagValue) {
        if (tagValue === COD_GRAPH_PATH) {
          return fs.readFileSync(COD_GRAPH_PATH);
        }
        if (tagValue === PH_GRAPH_PATH) {
          return fs.readFileSync(PH_GRAPH_PATH);
        }
        if (tagValue === NH3N_GRAPH_PATH) {
          return fs.readFileSync(NH3N_GRAPH_PATH);
        }
      },

      getSize() {
        return REPORT_CHART_SIZE;
      },
    });

    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    });

    const nh3nRegressionRows = safe.nh3n.rows.length > 1;
    const regressionCharts = {
      cod_chart: await generateRegressionChart(safe.cod.rows, "COD", "Standar (mg/L)", "COD (mg/L)"),
      ph_chart: await generateRegressionChart(safe.ph.rows, "PH", "", ""),
      nh3n_chart: await generateRegressionChart(safe.nh3n.rows, "NH3N", "Standar (mg/L)", "NH3N (mg/L)"),
    };

    fs.writeFileSync(COD_GRAPH_PATH, regressionCharts.cod_chart);
    fs.writeFileSync(PH_GRAPH_PATH, regressionCharts.ph_chart);
    if (nh3nRegressionRows) {
      fs.writeFileSync(NH3N_GRAPH_PATH, regressionCharts.nh3n_chart);
    }

    doc.render({
      site: siteNormalized.toUpperCase(),
      tanggal: tanggalFormatted,

      // COD
      cod_rows: formatRowsDecimalComma(safe.cod.rows ?? []),
      cod_persamaan: formatDecimalComma(safe.cod.persamaan),
      cod_r2: formatDecimalComma(safe.cod.r2),
      cod_sensitivitas: formatDecimalComma(safe.cod.sensitivitas),
      cod_bias_sebelum: formatDecimalComma(safe.cod.biasSebelum),
      cod_bias_sesudah: formatDecimalComma(safe.cod.biasSesudah),
      cod_akurasi: formatDecimalComma(safe.cod.akurasi),
      cod_chart: COD_GRAPH_PATH,

      // PH
      ph_rows: formatRowsDecimalComma(safe.ph.rows ?? []),
      ph_persamaan: formatDecimalComma(safe.ph.persamaan),
      ph_r2: formatDecimalComma(safe.ph.r2),
      ph_sensitivitas: formatDecimalComma(safe.ph.sensitivitas),
      ph_bias_sebelum: formatDecimalComma(safe.ph.biasSebelum),
      ph_bias_sesudah: formatDecimalComma(safe.ph.biasSesudah),
      ph_akurasi: formatDecimalComma(safe.ph.akurasi),
      ph_chart: PH_GRAPH_PATH,

      // NH3N
      nh3n_rows: formatRowsDecimalComma(safe.nh3n.rows ?? []),
      showNh3nRegression: nh3nRegressionRows,
      nh3n_persamaan: formatDecimalComma(safe.nh3n.persamaan),
      nh3n_r2: formatDecimalComma(safe.nh3n.r2),
      nh3n_sensitivitas: formatDecimalComma(safe.nh3n.sensitivitas),
      nh3n_bias_sebelum: formatDecimalComma(safe.nh3n.biasSebelum),
      nh3n_bias_sesudah: formatDecimalComma(safe.nh3n.biasSesudah),
      nh3n_akurasi: formatDecimalComma(safe.nh3n.akurasi),
      nh3n_chart: nh3nRegressionRows ? NH3N_GRAPH_PATH : null,

      // TSS
      tss_rows: formatRowsDecimalComma(safe.tss.rows ?? []),
      tss_bias_sebelum: formatDecimalComma(safe.tss.biasSebelum),
      tss_bias_sesudah: formatDecimalComma(safe.tss.biasSesudah),
      tss_akurasi: formatDecimalComma(safe.tss.akurasi),

    });

    const docxBuffer = doc.toBuffer();

    // const fileDate = dayjs()
    //   .format("DD-MM-YYYY");

    const filename = `kalibrasi_${siteNormalized}_${tanggalFormatted}.docx`;

    // fs.writeFileSync(`./tmp/${filename}`, docxBuffer);

    return {
      filename,
      buffer: docxBuffer,
    };
  }
  catch (error) {
    console.error("generateReportKalibrasi error:", error);

    return {
      status: 500,
      message: error.message ?? "Gagal membuat dokumen kalibrasi.",
    };
  }
}

export async function generateRegressionChart(rows, label = "Regression", xLabel = "Standar (mg/L)", yLabel = "Nilai") {
  const points = rows
    .map(extractRegressionPoint)
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (points.length < 2)
    return null;

  const regression = linearRegression(points.map(p => ({ larutan: p.x, nilai: p.y })));

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));

  // Hitung R²
  const yValues = points.map(p => p.y);
  const yMean = yValues.reduce((sum, v) => sum + v, 0) / yValues.length;
  const ssRes = points.reduce((sum, p) => sum + (p.y - (regression.a * p.x + regression.b)) ** 2, 0);
  const ssTot = yValues.reduce((sum, v) => sum + (v - yMean) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  const lineData = [
    { x: minX, y: regression.a * minX + regression.b },
    { x: maxX, y: regression.a * maxX + regression.b },
  ];

  // Format label persamaan
  const sign = regression.b >= 0 ? "+" : "-";
  const equationText = `y = ${regression.a.toFixed(4)}x ${sign} ${Math.abs(regression.b).toFixed(2)}`;
  const r2Text = `R² = ${r2.toFixed(4)}`;

  const config = {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Data Sensor",
          data: points,
          pointRadius: 5,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
        },
        {
          label: "Regression Line",
          data: lineData,
          type: "line",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          borderDash: [5, 3],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: label,
          font: { size: 18 },
        },
        legend: {
          display: false, // sembunyikan legend biar mirip Excel
        },
        // ✅ Annotation persamaan & R²
        annotation: {
          annotations: {
            equationLabel: {
              type: "label",
              xScaleID: "x",
              yScaleID: "y",
              xValue: maxX,
              yValue: regression.a * maxX + regression.b,
              xAdjust: -80, // geser kiri supaya tidak terpotong
              yAdjust: 30,
              content: [equationText, r2Text],
              font: { size: 16 },
              textAlign: "center",
              color: "black",
              backgroundColor: "rgba(255,255,255,0.7)",
              padding: 4,
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: xLabel },
          ticks: {
            font: { size: 12 },
          },
          min: 0,
        },
        y: {
          title: { display: true, text: yLabel },
          ticks: {
            font: { size: 12 },
          },
        }, // ✅ pakai parameter
      },
    },
  };

  return await chartCanvas.renderToBuffer(config);
}

function extractRegressionPoint(item = {}) {
  const x = item?.COD
    ?? item?.cod
    ?? item?.pH
    ?? item?.ph
    ?? item?.NH3N
    ?? item?.nh3n
    ?? item?.TSS
    ?? item?.tss
    ?? item?.larutan
    ?? item?.Larutan;

  const y = item?.Sensor
    ?? item?.sensor
    ?? item?.nilai
    ?? item?.Nilai;

  return {
    x: Number(x),
    y: Number(y),
  };
}

function hitungDurasi(start_time, end_time) {
  const [startJam, startMenit] = start_time.split(":").map(Number);
  const [endJam, endMenit] = end_time.split(":").map(Number);

  const startTotal = startJam * 60 + startMenit;
  const endTotal = endJam * 60 + endMenit;

  const selisihMenit = endTotal - startTotal;
  const durasi = selisihMenit / 60;

  return Number.parseFloat(durasi.toFixed(1));
}

function toGoogleSheetsDate(date = new Date()) {
  const startDate = new Date(1899, 11, 30);
  const diff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
  return diff;
}

function linearRegression(data) {
  const n = data.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  data.forEach((item) => {
    const x = Number(item.larutan);
    const y = Number(item.nilai);

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const a
    = (n * sumXY - sumX * sumY)
      / (n * sumX2 - sumX * sumX);

  const b = (sumY - a * sumX) / n;

  return { a, b };
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
  BAPreventifBase,
  BABulanan,
  BAST,
  previewFile,
  generateKalibrasi,
  generateReportKalibrasi,
  normalizeKalibrasiData,
  upload,
  inputCPISpreadsheet,
};
