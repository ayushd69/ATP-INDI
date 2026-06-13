import express from "express";
import Watchlist from "../models/Watchlist.js";

const watchlistApp = express.Router();

watchlistApp.get("/", async (req, res) => {
    try {
        const watchlists = await Watchlist.find().populate("userId stocks");
        res.json(watchlists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

watchlistApp.get("/user/:userId", async (req, res) => {
    try {
        const watchlist = await Watchlist.findOne({ userId: req.params.userId }).populate("stocks");
        if (!watchlist) return res.status(404).json({ message: "Watchlist not found." });
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

watchlistApp.post("/", async (req, res) => {
    try {
        const existing = await Watchlist.findOne({ userId: req.body.userId });
        if (existing) {
            existing.stocks = req.body.stocks || existing.stocks;
            await existing.save();
            return res.json({ message: "Watchlist updated", watchlist: existing });
        }

        const watchlist = await Watchlist.create(req.body);
        res.status(201).json({ message: "Watchlist created", watchlist });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

watchlistApp.put("/:id", async (req, res) => {
    try {
        const watchlist = await Watchlist.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!watchlist) return res.status(404).json({ message: "Watchlist not found." });
        res.json({ message: "Watchlist updated", watchlist });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

watchlistApp.delete("/:id", async (req, res) => {
    try {
        const watchlist = await Watchlist.findByIdAndDelete(req.params.id);
        if (!watchlist) return res.status(404).json({ message: "Watchlist not found." });
        res.json({ message: "Watchlist deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default watchlistApp;
