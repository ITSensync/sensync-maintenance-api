/* eslint-disable no-console */
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import api from "./api/index.js";
import { db } from "./config/db.config.js";

import * as middlewares from "./middlewares.js";

const app = express();

try {
  await db.authenticate();

  console.log('Connection to the database has been established successfully.');
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
