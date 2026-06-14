import express from "express";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import Stock from "../models/Stock.js";
import Order from "../models/Order.js";
import { config } from "../config.js";
import OrderMatchingEngine from "../matchingEngine.js";

const adminApp = express.Router();

// Market state variables
let marketState = {
    active: true,
    volatility: 2,
    lastUpdate: new Date(),
};

const getBody = (req) => req.body || {};

const createAdmin = async (mail, pass) => {
    const hashed = await bcrypt.hash(pass, 10);
    const admin = await Admin.findOneAndUpdate(
        { mail },
        { mail, pass: hashed },
        { upsert: true, setDefaultsOnInsert: true, new: true }
    );
    return admin;
};

adminApp.post("/register", async (req, res) => {
    try {
        const body = getBody(req);
        const mail = (body.mail ?? body.email)?.trim?.().toLowerCase();
        const pass = body.pass ?? body.password;
        if (!mail || !pass) {
            return res.status(400).json({ message: "Mail and pass are required." });
        }

        const existingAdmin = await Admin.findOne({ mail });
        if (existingAdmin) {
            return res.status(409).json({ message: "Admin already exists." });
        }

        const admin = await createAdmin(mail, pass);
        const result = admin.toObject();
        delete result.pass;
        result.isAdmin = true;
        result.name = "Admin";
        res.status(201).json({ message: "Admin created", admin: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

adminApp.post("/login", async (req, res) => {
    try {
        const body = getBody(req);
        const mail = (body.mail ?? body.email)?.trim?.().toLowerCase();
        const pass = body.pass ?? body.password;
        if (!mail || !pass) {
            return res.status(400).json({ message: "Mail and pass are required." });
        }

        let admin = await Admin.findOne({ mail });
        if (!admin) {
            const defaultMail = (config.ADMIN_EMAIL || "").trim().toLowerCase();
            const defaultPass = config.ADMIN_PASSWORD || "";
            if (defaultMail && mail === defaultMail && defaultPass) {
                admin = await createAdmin(defaultMail, defaultPass);
                console.log("Auto-seeded default admin:", defaultMail);
            }
        }

        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        const isValid = await bcrypt.compare(pass, admin.pass);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const result = admin.toObject();
        delete result.pass;
        result.isAdmin = true;
        result.name = "Admin";
        res.json({ message: "Admin login successful", admin: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Market state endpoints
adminApp.get("/market/state", (req, res) => {
    res.json(marketState);
});

adminApp.post("/market/toggle", (req, res) => {
    const { active } = req.body;
    marketState.active = active !== undefined ? active : !marketState.active;
    res.json({ message: "Market state updated", marketState });
});

adminApp.post("/market/volatility", (req, res) => {
    const { volatility } = req.body;
    if (volatility && volatility >= 1 && volatility <= 10) {
        marketState.volatility = volatility;
        res.json({ message: "Volatility updated", marketState });
    } else {
        res.status(400).json({ message: "Volatility must be between 1 and 10" });
    }
});

// Order Management Endpoints
adminApp.get("/orders/pending", async (req, res) => {
    try {
        const orders = await Order.find({
            status: "PENDING"
        }).populate("stockId userId").sort({ createdAt: -1 });

        const grouped = orders.reduce((acc, order) => {
            const symbol = order.stockId?.symbol || "UNKNOWN";
            if (!acc[symbol]) {
                acc[symbol] = {
                    stockId: order.stockId?._id,
                    currentPrice: order.stockId?.currentPrice,
                    BUY: [],
                    SELL: []
                };
            }
            acc[symbol][order.orderType].push({
                _id: order._id,
                userId: order.userId?._id,
                userName: order.userId?.name,
                quantity: order.quantity,
                price: order.price,
                status: order.status,
                createdAt: order.createdAt,
                canFill: order.orderType === "BUY"
                    ? order.price >= (order.stockId?.currentPrice || 0)
                    : order.price <= (order.stockId?.currentPrice || 0),
            });
            return acc;
        }, {});

        res.json({
            totalPending: orders.length,
            grouped,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to manually trigger order matching for all stocks
adminApp.post("/orders/match-all", async (req, res) => {
    try {
        console.log("[Admin API] Triggering order matching for all stocks");
        const results = await OrderMatchingEngine.matchAllPendingOrders();
        const totalMatches = results.reduce((sum, r) => sum + r.matched, 0);
        res.json({
            message: `Matched ${totalMatches} trades across all stocks`,
            totalMatches,
            results
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to manually trigger order matching for a specific stock
adminApp.post("/orders/match-stock/:stockId", async (req, res) => {
    try {
        const { stockId } = req.params;
        console.log(`[Admin API] Triggering order matching for stock ${stockId}`);

        const stock = await Stock.findById(stockId);
        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        const result = await OrderMatchingEngine.matchOrders(stockId);
        res.json({
            message: `Matched ${result.matched} trades for ${stock.symbol}`,
            stock: {
                _id: stock._id,
                symbol: stock.symbol,
                currentPrice: stock.currentPrice,
            },
            matches: result.matched,
            trades: result.trades,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to update stock price and trigger matching
adminApp.post("/stocks/:stockId/update-price", async (req, res) => {
    try {
        const { stockId } = req.params;
        const { newPrice, priceChange } = req.body;

        if (!newPrice || newPrice <= 0) {
            return res.status(400).json({ message: "Valid newPrice is required" });
        }

        const stock = await Stock.findByIdAndUpdate(
            stockId,
            {
                currentPrice: newPrice,
                priceChange: priceChange || 0
            },
            { returnDocument: "after" }
        );

        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        console.log(`[Admin API] Updated ${stock.symbol} price to ${newPrice}, triggering order matching`);

        // Trigger order matching for this stock
        const matchResult = await OrderMatchingEngine.matchOrders(stockId);

        res.json({
            message: `Stock price updated and ${matchResult.matched} orders matched`,
            stock: {
                _id: stock._id,
                symbol: stock.symbol,
                currentPrice: stock.currentPrice,
                priceChange: stock.priceChange,
            },
            orderMatches: matchResult.matched,
            trades: matchResult.trades,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default adminApp;
