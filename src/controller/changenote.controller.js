import changenoteService from "../services/changenote.service.js";

async function add(req, res) {
  const result = await changenoteService.add(req.body);
  res.status(result.status).send(result);
}
async function update(req, res) {
  const { id } = req.params;
  const result = await changenoteService.update(req.body, id);
  res.status(result.status).send(result);
}
async function get(req, res) {
  const result = await changenoteService.getAll(req.body);
  res.status(result.status).send(result);
}
async function destroy(req, res) {
  const { id } = req.params;
  const result = await changenoteService.destroy(id);
  res.status(result.status).send(result);
}

export default {
  add,
  update,
  get,
  destroy,
};
