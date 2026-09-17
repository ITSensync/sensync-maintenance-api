import express from "express";
import changenote from "./changenote.js";
import document from "./document.js";
import generate from "./generate.js";
import log from "./log.js";
import photo from "./photo.js";
import users from "./user.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "API - SENSYNC MAINTENANCE API",
  });
});

router.use("/auth", users);
router.use("/changenote", changenote);
router.use("/document", document);
router.use("/generate", generate);
router.use("/log", log);
router.use("/photo", photo);

export default router;
