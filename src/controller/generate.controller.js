import generateService from "../services/generate.service.js";

async function generateKorektif(req, res) {
  const { buffer, filename } = await generateService.BAKorektif(req.body);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  res.send(buffer);

}

export default {
  generateKorektif,
};
