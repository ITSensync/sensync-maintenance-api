import express from "express";
import logController from "../controller/log.controller.js";
import * as middlewares from "../middlewares.js";

const router = express.Router();

router.post("/", middlewares.verifyToken, logController.add);
router.get("/", middlewares.verifyToken, logController.get);
router.patch("/:id", middlewares.verifyToken, logController.update);
router.delete("/:id", middlewares.verifyToken, logController.destroy);

export default router;
