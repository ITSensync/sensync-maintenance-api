import express from "express";

import emojis from "./emojis.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "API - SENSYNC MAINTENANCE API",
  });
});

router.use("/emojis", emojis);

export default router;
