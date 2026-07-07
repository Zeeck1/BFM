// server/app.ts

import cors from "cors";
import express from "express";
import { fetchPreviewRouter } from "./routes/fetchPreview.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", fetchPreviewRouter);

  return app;
}
