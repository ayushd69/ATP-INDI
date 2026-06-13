import express from "express";
import Transaction from "../models/Transaction.js";

const transactionApp = express.Router();

transactionApp.get("/", async (req, res) => {
    try {
        const transactions = await Transaction.find().populate("buyerId sellerId stockId");
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

transactionApp.get("/:id", async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).populate("buyerId sellerId stockId");
        if (!transaction) return res.status(404).json({ message: "Transaction not found." });
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

transactionApp.post("/", async (req, res) => {
    try {
        const transaction = await Transaction.create(req.body);
        res.status(201).json({ message: "Transaction created", transaction });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

transactionApp.delete("/:id", async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id);
        if (!transaction) return res.status(404).json({ message: "Transaction not found." });
        res.json({ message: "Transaction deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default transactionApp;
