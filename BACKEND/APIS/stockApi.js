import express from "express";
import Stock from "../models/Stock.js";
import Portfolio from "../models/Portfolio.js";
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import Watchlist from "../models/Watchlist.js";
import User from "../models/User.js";
import { addStock, removeStock, updateStockInMemory } from "../liveStockData.js";

const stockApp = express.Router();

stockApp.get("/", async (req, res) => {
    try {
        const stocks = await Stock.find();
        res.json(stocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

stockApp.get("/:id", async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.id);
        if (!stock) return res.status(404).json({ message: "Stock not found." });
        res.json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

stockApp.post("/", async (req, res) => {
    try {
        const stock = await Stock.create(req.body);
        addStock(stock.toObject ? stock.toObject() : stock);
        res.status(201).json({ message: "Stock created", stock });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

stockApp.put("/:id", async (req, res) => {
    try {
        const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
        if (!stock) return res.status(404).json({ message: "Stock not found." });
        updateStockInMemory(stock.toObject ? stock.toObject() : stock);
        res.json({ message: "Stock updated", stock });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

stockApp.delete("/:id", async (req, res) => {
    try {
        const stock = await Stock.findByIdAndDelete(req.params.id);
        if (!stock) return res.status(404).json({ message: "Stock not found." });

        const stockId = stock._id;
        const portfolios = await Portfolio.find({ stockId }).select("_id userId");
        const portfolioIds = portfolios.map((item) => item._id);

        await Promise.all([
            Portfolio.deleteMany({ stockId }),
            Order.deleteMany({ stockId }),
            Transaction.deleteMany({ stockId }),
            Watchlist.updateMany({ stocks: stockId }, { $pull: { stocks: stockId } }),
            User.updateMany({ portfolio: { $in: portfolioIds } }, { $pull: { portfolio: { $in: portfolioIds } } }),
        ]);

        removeStock(stock.symbol);
        res.json({ message: "Stock deleted and related user data cleaned up" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default stockApp;
