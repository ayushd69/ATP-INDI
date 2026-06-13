import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { config } from "./config.js";
import authApi from "./APIS/authApi.js";
import userApi from "./APIS/userApi.js";
import stockApi from "./APIS/stockApi.js";
import portfolioApi from "./APIS/portfolioApi.js";
import orderApi from "./APIS/orderApi.js";
import transactionApi from "./APIS/transactionApi.js";
import watchlistApi from "./APIS/watchlistApi.js";
import adminApi from "./APIS/adminApi.js";
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.VITE_API_BASE
];
const frontendUrls = config.FRONTEND_URL;
frontendUrls.split(",").forEach(url => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
        allowedOrigins.push(trimmed);
    }
});

const app = express();
app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express.json());

// Ensure database connection before handling requests
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState === 1) {
        return next();
    }
    try {
        const MONGODB_URI = config.MONGODB_URI;
        await mongoose.connect(MONGODB_URI);
        console.log("Database connected dynamically in middleware");
        next();
    } catch (err) {
        console.error("Database connection failed in middleware:", err);
        res.status(500).json({ error: "Database connection failed" });
    }
});

app.use("/api/auth", authApi);
app.use("/api/users", userApi);
app.use("/api/stocks", stockApi);
app.use("/api/portfolio", portfolioApi);
app.use("/api/orders", orderApi);
app.use("/api/transactions", transactionApi);
app.use("/api/watchlists", watchlistApi);
app.use("/api/admin", adminApi);

app.get("/", (req, res) => {
    res.json({ status: "Backend running" });
});

export default app;
