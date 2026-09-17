import express from "express";
import photoController from "../controller/photo.controller.js";
import * as middlewares from "../middlewares.js";

const router = express.Router();

router.post("/", middlewares.verifyToken, photoController.getAll);

export default router;
