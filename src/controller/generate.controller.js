import fs from "node:fs";
import path from "node:path";
import generateService from "../services/generate.service.js";

async function generateKorektif(req, res) {
  const result = await generateService.BAKorektif(req.body);

  res.json(result);

  /* const { buffer, filename } = await generateService.BAKorektif(req.body, req.files);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  res.send(buffer); */
}

async function generatePreventif(req, res) {
  const type = req.params.type;
  let result;
  if (type === "base") {
    result = await generateService.BAPreventifBase(req.body);
  }
  else {
    result = await generateService.BAPreventif(req.body);
  }

  res.json(result);

  /* res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  res.send(buffer); */
}

async function generateBulanan(req, res) {
  const result = await generateService.BABulanan(req.body);

  res.json(result);

  /* res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  res.send(buffer); */
}

async function generateBAST(req, res) {
  const type = req.params.type?.toString().toUpperCase();
  const result = await generateService.BAST(req.body, type);

  res.json(result);
}

async function generateKalibrasi(req, res) {
  const result = await generateService.generateKalibrasi(req.body);

  res.status(result.status).send(result);
}

async function uploadDokumentasi(req, res) {
  const result = await generateService.upload(req.files, req.body);

  res.status(result.status).send(result);
}

async function previewFile(req, res) {
  const filePath = path.resolve("./tmp", req.params.file);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline");

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(err);
      return;
    }

    fs.unlink(filePath, () => { });
  });
}

export default {
  generateKorektif,
  generatePreventif,
  generateKalibrasi,
  generateBulanan,
  generateBAST,
  uploadDokumentasi,
  previewFile,
};
