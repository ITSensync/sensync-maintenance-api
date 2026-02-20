import express from "express";
import generateController from "../controller/generate.controller.js";
import * as middlewares from "../middlewares.js";
import { uploadDokumentasi } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/korektif", middlewares.verifyToken, uploadDokumentasi, generateController.generateKorektif);
router.post("/preventif/:type", middlewares.verifyToken, uploadDokumentasi, generateController.generatePreventif);
router.post("/kalibrasi", middlewares.verifyToken, generateController.generateKalibrasi);
router.post("/bulanan", middlewares.verifyToken, uploadDokumentasi, generateController.generateBulanan);
router.post("/dokumentasi", middlewares.verifyToken, uploadDokumentasi, generateController.uploadDokumentasi);
router.get("/preview/:file", uploadDokumentasi, generateController.previewFile);

export default router;
