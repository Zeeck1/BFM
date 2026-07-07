// server/index.ts
// BFM Node.js API entry — Express backend (link preview + metadata).

import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[BFM] API listening on http://localhost:${env.port}`);
  console.log(`[BFM] Vite dev proxy: http://localhost:5173 → http://localhost:${env.port}/api`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[BFM] Port ${env.port} is already in use. Stop the old server:\n` +
        `  netstat -ano | findstr :${env.port}\n` +
        `  taskkill /PID <pid> /F\n` +
        `Then run npm run dev again.`,
    );
    process.exit(1);
  }
  throw err;
});
