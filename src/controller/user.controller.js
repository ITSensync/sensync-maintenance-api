import userService from "../services/user.service.js";

async function login(req, res) {
  const result = await userService.login(req.body);
  res.status(result.status).send(result)
}

export default {
  login,
}