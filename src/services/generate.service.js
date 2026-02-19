/* eslint-disable node/prefer-global/buffer */
import fs from "node:fs";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
// import ExcelJS from "exceljs";
import libre from "libreoffice-convert";
import PizZip from "pizzip";
import XlsxPopulate from "xlsx-populate";
import documentService from "./document.service.js";
import odooService from "./odoo.service.js";

const PARAF_PATH = "./templates/paraf_korektif.png";

async function BAKorektif(body) {
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
  let site = body.site;
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
    default:
      break;
  }

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
  /* const id = crypto.randomUUID();
  const previewName = `${id}.pdf`; */
  fs.writeFileSync(`./tmp/${filename}`, pdfBuf);

  return {
    success: true,
    url: `preview/${filename}`,
  };

  /* return {
    buffer: pdfBuf,
    filename: `ba_korektif_${body.site}_${fileDate}.pdf`,
  }; */
}

async function BAPreventif(body) {
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
  let site = body.site;
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
    default:
      break;
  }
  const filename = `berita_acara_${site}_${fileDate}.pdf`;

  const resultOdoo = await odooService.mainProcess(pdfBuf, [`BA Pemeliharaan`, site, "Preventif"], filename);

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
  /* const id = crypto.randomUUID();
  const previewName = `${id}.pdf`; */
  fs.writeFileSync(`./tmp/${filename}`, pdfBuf);

  return {
    success: true,
    url: `preview/${filename}`,
  };

  // return true; // for debugging
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
  let site = body.site;
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
    default:
      break;
  }
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
  fs.writeFileSync(`./tmp/${filename}`, pdfBuf);

  return {
    success: true,
    url: `preview/${filename}`,
  };

  /* return {
    buffer: pdfBuf,
    filename: `ba_korektif_${body.site}_${fileDate}.pdf`,
  }; */
}

async function generateKalibrasi(body) {
  try {
    const data = body.kalibrasi;
    const now = new Date();

    let site = body.site;
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
      default:
        break;
    }

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
      const formulaCols = ["C", "D", "E", "F", "G"]; // kolom dengan rumus
      const startRow = 3;
      const dataRows = data[key].length;
      const lastDataRow = startRow + dataRows - 1; // baris terakhir untuk data, sebelum Average

      data[key].forEach((item, index) => {
        const row = startRow + index;

        // isi data kolom A & B
        sheet.cell(`A${row}`).value(Number(item.larutan));
        sheet.cell(`B${row}`).value(Number(item.nilai));

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

    let site = body.site;
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
      default:
        break;
    }

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
  BABulanan,
  previewFile,
  generateKalibrasi,
  upload,
};
