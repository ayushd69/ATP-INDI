import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authApi from "./APIS/authApi.js";
import userApi from "./APIS/userApi.js";
import stockApi from "./APIS/stockApi.js";
import portfolioApi from "./APIS/portfolioApi.js";
import orderApi from "./APIS/orderApi.js";
import transactionApi from "./APIS/transactionApi.js";
import watchlistApi from "./APIS/watchlistApi.js";
import adminApi from "./APIS/adminApi.js";

dotenv.config();

const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express.json());

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
