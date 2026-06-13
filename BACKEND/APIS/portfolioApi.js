import express from "express";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";

const portfolioApp = express.Router();

portfolioApp.get("/", async (req, res) => {
    try {
        const portfolio = await Portfolio.find().populate("userId stockId");
        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

portfolioApp.get("/user/:userId", async (req, res) => {
    try {
        const portfolio = await Portfolio.find({ userId: req.params.userId }).populate("stockId");
        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

portfolioApp.post("/", async (req, res) => {
    try {
        const item = await Portfolio.create(req.body);
        await User.findByIdAndUpdate(req.body.userId, { $push: { portfolio: item._id } });
        res.status(201).json({ message: "Portfolio item added", item });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

portfolioApp.put("/:id", async (req, res) => {
    try {
        const item = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ message: "Portfolio item not found." });
        res.json({ message: "Portfolio updated", item });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

portfolioApp.delete("/:id", async (req, res) => {
    try {
        const item = await Portfolio.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: "Portfolio item not found." });
        await User.findByIdAndUpdate(item.userId, { $pull: { portfolio: item._id } });
        res.json({ message: "Portfolio item removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default portfolioApp;
