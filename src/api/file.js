import express from "express";
import fileController from "../controller/file.controller.js";
import * as middlewares from "../middlewares.js";
import { uploadDokumentasi } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/", middlewares.verifyToken, fileController.getAll);
router.post("/upload", middlewares.verifyToken, uploadDokumentasi, fileController.uploadDokumentasi);

export default router;
