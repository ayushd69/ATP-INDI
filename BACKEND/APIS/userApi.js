import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Portfolio from "../models/Portfolio.js";
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import Watchlist from "../models/Watchlist.js";

const userApp = express.Router();

const sanitizeUser = (user) => {
    const object = user?.toObject ? user.toObject() : user;
    if (object?.password) delete object.password;
    return object;
};

userApp.get("/", async (req, res) => {
    try {
        const users = await User.find().populate({
            path: "portfolio",
            populate: {
                path: "stockId",
            },
        });
        const sanitized = users.map(sanitizeUser);
        res.json(sanitized);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

userApp.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("portfolio");
        if (!user) return res.status(404).json({ message: "User not found." });
        res.json(sanitizeUser(user));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

userApp.put("/:id", async (req, res) => {
    try {
        const updates = { ...req.body };
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }
        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!user) return res.status(404).json({ message: "User not found." });
        res.json({ message: "User updated", user: sanitizeUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

userApp.delete("/:id", async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        res.json({ message: "User removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

userApp.post("/reset", async (req, res) => {
    try {
        await Portfolio.deleteMany({});
        await Order.deleteMany({});
        await Transaction.deleteMany({});
        await Watchlist.deleteMany({});
        await User.updateMany({}, { walletBalance: 100000, portfolio: [] });

        res.json({ message: "All users reset to ₹100,000 and all portfolios, orders, transactions, and watchlists cleared." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default userApp;
