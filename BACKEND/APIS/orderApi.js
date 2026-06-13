import express from "express";
import Order from "../models/Order.js";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import Stock from "../models/Stock.js";
import OrderMatchingEngine from "../matchingEngine.js";

const orderApp = express.Router();

orderApp.get("/", async (req, res) => {
    try {
        const orders = await Order.find().populate("userId stockId");
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

orderApp.get("/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate("userId stockId");
        if (!order) return res.status(404).json({ message: "Order not found." });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

orderApp.post("/", async (req, res) => {
    try {
        const { userId, stockId, orderType, quantity, price } = req.body;

        if (!userId || !stockId || !orderType || !quantity || !price) {
            return res.status(400).json({ message: "userId, stockId, orderType, quantity, and price are required." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const stock = await Stock.findById(stockId);
        if (!stock) {
            return res.status(404).json({ message: "Stock not found." });
        }

        const totalCost = price * quantity;
        const userBalance = Number(user.walletBalance ?? 0);

        // Validate order based on type
        if (orderType === "BUY" && userBalance < totalCost) {
            return res.status(400).json({ message: "Insufficient wallet balance to place this buy order." });
        }

        if (orderType === "SELL") {
            const portfolio = await Portfolio.findOne({ userId, stockId });
            if (!portfolio || portfolio.quantity < quantity) {
                return res.status(400).json({ message: "Not enough stock holdings to sell." });
            }
        }

        // Create order with PENDING status
        const order = await Order.create({
            userId,
            stockId,
            orderType,
            quantity,
            price,
            status: "PENDING",
        });

        // Run matching engine to find and execute matches
        const matchResult = await OrderMatchingEngine.matchOrders(stockId);

        // Refresh order to get updated status
        const updatedOrder = await Order.findById(order._id).populate("userId stockId");
        const updatedUser = await User.findById(userId).select("name email walletBalance portfolio");

        res.status(201).json({
            message: "Order placed",
            order: updatedOrder,
            matchesFound: matchResult.matched,
            trades: matchResult.trades || [],
            user: updatedUser,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

orderApp.put("/:id", async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!order) return res.status(404).json({ message: "Order not found." });
        res.json({ message: "Order updated", order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

orderApp.delete("/:id", async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found." });
        res.json({ message: "Order deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to manually trigger order matching
orderApp.post("/match/all", async (req, res) => {
    try {
        const results = await OrderMatchingEngine.matchAllPendingOrders();
        const totalMatches = results.reduce((sum, r) => sum + r.matched, 0);
        res.json({ message: `Matched ${totalMatches} trades`, results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to match orders for a specific stock
orderApp.post("/match/:stockId", async (req, res) => {
    try {
        const { stockId } = req.params;
        const result = await OrderMatchingEngine.matchOrders(stockId);
        res.json({
            message: `Matched ${result.matched} trades for stock ${stockId}`,
            ...result,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to cancel old pending orders
orderApp.post("/cancel/old-orders", async (req, res) => {
    try {
        const { minutesOld } = req.body || {};
        const cancelled = await OrderMatchingEngine.cancelOldOrders(minutesOld || 1440);
        res.json({ message: `Cancelled ${cancelled} old pending orders` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default orderApp;
