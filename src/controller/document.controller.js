import documentService from "../services/document.service.js";

async function getOne(req, res) {
  const { id } = req.params;
  const result = await documentService.getOne(id);
  res.status(result.status).send(result);
}

async function getAll(req, res) {
  const result = await documentService.getAll();
  res.status(result.status).send(result);
}

async function getLatest(req, res) {
  const result = await documentService.getLatest();
  res.status(result.status).send(result);
}

async function add(req, res) {
  const result = await documentService.add(req.body);
  res.status(result.status).send(result);
}

async function update(req, res) {
  const { id } = req.params;
  const result = await documentService.update(req.body, id);
  res.status(result.status).send(result);
}

async function destroy(req, res) {
  const { id } = req.params;
  const result = await documentService.destroy(id);
  res.status(result.status).send(result);
}

export default {
  getOne,
  getAll,
  add,
  update,
  destroy,
  getLatest,
};
