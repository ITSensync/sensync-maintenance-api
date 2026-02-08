import fs from "node:fs";
import path from "node:path";
import generateService from "../services/generate.service.js";

async function generateKorektif(req, res) {
  const result = await generateService.BAKorektif(req.body, req.files);

  res.json(result);

  /* const { buffer, filename } = await generateService.BAKorektif(req.body, req.files);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  res.send(buffer); */
}

async function generatePreventif(req, res) {
  const result = await generateService.BAPreventif(req.body, req.files);

  res.json(result);

  /* res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  res.send(buffer); */
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
  previewFile,
};
