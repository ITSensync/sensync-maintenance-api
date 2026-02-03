import express from "express";
import documentController from "../controller/document.controller.js";
import * as middlewares from "../middlewares.js";

const router = express.Router();

router.get("/", middlewares.verifyToken, documentController.getAll);
router.get("/:id", middlewares.verifyToken, documentController.getOne);
router.get("/get/latest", middlewares.verifyToken, documentController.getLatest);
router.post("/", middlewares.verifyToken, documentController.add);
router.patch("/:id", middlewares.verifyToken, documentController.update);
router.delete("/:id", middlewares.verifyToken, documentController.destroy);

export default router;
