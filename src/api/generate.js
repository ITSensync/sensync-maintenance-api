import express from "express";
import generateController from "../controller/generate.controller.js";
import * as middlewares from "../middlewares.js";

const router = express.Router();

router.post("/", middlewares.verifyToken, generateController.generateKorektif);

export default router;
