/* eslint-disable no-console */
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import api from "./api/index.js";
import { db } from "./config/db.config.js";

import * as middlewares from "./middlewares.js";
import { Changenote } from "./model/Changenote.js";
import { Document } from "./model/Document.js";
import { User } from "./model/User.js";

const app = express();

try {
  await db.authenticate();

  User.sync({ alter: true });
  Changenote.sync({ alter: true });
  Document.sync({ alter: true });

  console.log("Connection to the database has been established successfully.");
}
catch (error) {
  console.error("Unable to connect to database:", error);
}

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/v1", api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
