import generateService from "../services/generate.service.js";

async function generateKorektif(req, res) {
  const { buffer, filename } = await generateService.BAKorektif(req.body, req.files);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  res.send(buffer);
}

async function generatePreventif(req, res) {
  const { buffer, filename } = await generateService.BAPreventif(req.body, req.files);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  res.send(buffer);
}

export default {
  generateKorektif,
  generatePreventif,
};
