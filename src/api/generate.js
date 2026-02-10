import express from "express";
import generateController from "../controller/generate.controller.js";
import * as middlewares from "../middlewares.js";
// import { uploadDokumentasi } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/korektif", middlewares.verifyToken, generateController.generateKorektif);
router.post("/preventif", middlewares.verifyToken, generateController.generatePreventif);
router.post("/kalibrasi", middlewares.verifyToken, generateController.generateKalibrasi);
router.get("/preview/:file", generateController.previewFile);

export default router;
