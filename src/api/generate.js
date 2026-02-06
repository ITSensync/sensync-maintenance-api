import express from "express";
import generateController from "../controller/generate.controller.js";
import * as middlewares from "../middlewares.js";
import { uploadDokumentasi } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/korektif", middlewares.verifyToken, uploadDokumentasi, generateController.generateKorektif);

export default router;
