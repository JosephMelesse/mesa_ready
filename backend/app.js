import express from "express";
import cors from "cors";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

export function createApp() {
  const app = express();

  const allowed = process.env.CORS_ORIGIN;
  app.use(cors({ origin: allowed?.length ? allowed : true }));

  app.use(express.json());

  app.use("/api", apiRoutes);

  app.use("/api", notFound);

  app.use(errorHandler);
  return app;
}
