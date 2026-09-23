const express = require("express");
const cors = require("cors");

// const authRoutes = require("./routes/auth.routes");
// const healthRoutes = require("./routes/health.routes");
// const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// --- Core middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // lets your Frontend dev's app call this API
    credentials: true,
  })
);
app.use(express.json()); // parse JSON request bodies

// --- Routes ---
// app.use("/api/health", healthRoutes);
// app.use("/api/auth", authRoutes);

// Add future route groups here, e.g.:
// app.use("/api/projects", projectRoutes);
// app.use("/api/tasks", taskRoutes);
// app.use("/api/ledger", ledgerRoutes);

// --- 404 + error handling (must be registered LAST) ---
// app.use(notFound);
// app.use(errorHandler);

module.exports = app;
