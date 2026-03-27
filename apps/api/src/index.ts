import cors from "cors";
import express from "express";
import { leagueRouter } from "./routes/league.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/league", leagueRouter);

app.listen(PORT, () => {
  console.log(`StrikeMate API running on http://localhost:${PORT}`);
});
