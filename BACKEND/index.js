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

const normalizeOrigin = (value) => {
    if (!value) return null;
    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) return null;
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return normalized.toLowerCase();
};

const parseOrigins = (value) => {
    if (!value) return [];
    return value
        .split(",")
        .map(normalizeOrigin)
        .filter(Boolean);
};

const allowedOrigins = Array.from(
    new Set([
        ...parseOrigins(process.env.FRONTEND_URL),
        ...parseOrigins(process.env.VITE_API_BASE),
        ...parseOrigins(config.FRONTEND_URL),
    ])
);

console.log("Express CORS allowed origins:", allowedOrigins);

const app = express();
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn("Blocked CORS request from origin:", origin);
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        preflightContinue: false,
    })
);
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
