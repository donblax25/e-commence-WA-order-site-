import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
// During local development allow the web dev server origin(s).
// Use a permissive origin check so browser requests from localhost:3000/3001 succeed.
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", publicRouter);
app.use("/api/admin", adminRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
});
