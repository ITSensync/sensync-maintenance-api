import express from "express";
import userController from "../controller/user.controller.js";

const router = express.Router();

router.post("/login", userController.login);

export default router
