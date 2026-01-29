import express from "express";
import ChangenoteController from "../controller/changenote.controller.js";
import * as middlewares from "../middlewares.js";

const router = express.Router();

router.post("/", middlewares.verifyToken, ChangenoteController.add);
router.get("/", middlewares.verifyToken, ChangenoteController.get);
router.patch("/:id", middlewares.verifyToken, ChangenoteController.update);
router.delete("/:id", middlewares.verifyToken, ChangenoteController.destroy);

export default router
