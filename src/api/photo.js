import express from "express";
import photoController from "../controller/photo.controller.js";
import * as middlewares from "../middlewares.js";
import { uploadDokumentasi } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/", middlewares.verifyToken, photoController.getAll);
router.post("/dokumentasi", middlewares.verifyToken, uploadDokumentasi, photoController.uploadDokumentasi);

export default router;
