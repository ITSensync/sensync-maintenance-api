import generateService from "../services/generate.service.js";

async function generateKorektif(req, res) {
  const filePath = await generateService.BAKorektif(req.body);

  res.download(filePath);
}

export default {
  generateKorektif,
};
