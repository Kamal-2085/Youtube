import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Middleware configuration (MUST come before routes)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes - using dynamic import to ensure middleware runs first
const { default: router } = await import("./routes/user.routes.js");
app.use("/api/v1/users", router);

export default app;
