import express from "express";

import emojis from "./emojis.js";
import users from "./user.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "API - SENSYNC MAINTENANCE API",
  });
});

router.use("/emojis", emojis);
router.use("/auth", users);

export default router;
