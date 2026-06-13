import express from "express";
import Stock from "../models/Stock.js";
import { addStock } from "../liveStockData.js";

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
        const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!stock) return res.status(404).json({ message: "Stock not found." });
        res.json({ message: "Stock updated", stock });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

stockApp.delete("/:id", async (req, res) => {
    try {
        const stock = await Stock.findByIdAndDelete(req.params.id);
        if (!stock) return res.status(404).json({ message: "Stock not found." });
        res.json({ message: "Stock deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default stockApp;
