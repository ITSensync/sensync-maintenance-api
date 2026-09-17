import photoService from "../services/photo.service.js";

async function getAll(req, res) {
  const result = await photoService.getAll({
    ...req.query,
    ...req.body,
  });

  res.status(result.status).send(result);
}

export default {
  getAll,
};
