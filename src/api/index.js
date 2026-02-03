import express from "express";
import changenote from "./changenote.js";
import document from "./document.js";
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

export default router;
