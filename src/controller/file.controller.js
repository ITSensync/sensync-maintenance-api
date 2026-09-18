import fileService from "../services/file.service.js";

async function getAll(req, res) {
  const result = await fileService.getAll({
    ...req.query,
    ...req.body,
  });

  res.status(result.status).send(result);
}

async function uploadDokumentasi(req, res) {
  const result = await fileService.upload(req.files, req.body);

  res.status(result.status).send(result);
}

export default {
  getAll,
  uploadDokumentasi,
};
