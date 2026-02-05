/* eslint-disable node/prefer-global/buffer */
import fs from "node:fs";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import libre from "libreoffice-convert";
import PizZip from "pizzip";

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

  const items = body.items.map((x, i) => ({
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

  fs.writeFileSync(`./tmp/ba_korektif_${body.site}_${fileDate}.pdf`, pdfBuf);

  return `./tmp/ba_korektif_${body.site}_${fileDate}.pdf`;
}

export default {
  BAKorektif,
};
