import express from "express";
import Order from "../models/Order.js";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import Stock from "../models/Stock.js";
import Transaction from "../models/Transaction.js";
import OrderMatchingEngine from "../matchingEngine.js";

const orderApp = express.Router();

orderApp.get("/", async (req, res) => {
    try {
        const query = {};
        if (req.query.userId) {
            query.userId = req.query.userId;
        }
        const orders = await Order.find(query).populate("userId stockId");
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
        const qty = Number(quantity);
        const pricePerShare = Number(price);

        if (!userId || !stockId || !orderType || !qty || !pricePerShare) {
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

        const totalCost = pricePerShare * qty;
        const userBalance = Number(user.walletBalance ?? 0);

        // Validate order based on type
        if (orderType === "BUY" && userBalance < totalCost) {
            return res.status(400).json({ message: "Insufficient wallet balance to place this buy order." });
        }

        if (orderType === "SELL") {
            const portfolio = await Portfolio.findOne({ userId, stockId });
            if (!portfolio || portfolio.quantity < qty) {
                return res.status(400).json({ message: "Not enough stock holdings to sell." });
            }
        }

        const isMarketBuy = Boolean(req.body.marketOrder) && orderType === "BUY";

        // Create order record first
        const order = await Order.create({
            userId,
            stockId,
            orderType,
            quantity: qty,
            price: pricePerShare,
            marketOrder: isMarketBuy,
            status: isMarketBuy ? "COMPLETED" : "PENDING",
        });

        let matchResult = { matched: 0, trades: [] };
        let transaction = null;

        if (isMarketBuy) {
            // Direct market buy: fill immediately without the matching engine.
            const buyerPortfolio = await Portfolio.findOne({ userId, stockId });
            if (buyerPortfolio) {
                const newQuantity = buyerPortfolio.quantity + quantity;
                const totalCostBasis = buyerPortfolio.avgBuyPrice * buyerPortfolio.quantity + price * quantity;
                buyerPortfolio.avgBuyPrice = totalCostBasis / newQuantity;
                buyerPortfolio.quantity = newQuantity;
                await buyerPortfolio.save();
            } else {
                const newPortfolio = await Portfolio.create({
                    userId,
                    stockId,
                    quantity,
                    avgBuyPrice: price,
                });
                await User.findByIdAndUpdate(userId, {
                    $push: { portfolio: newPortfolio._id },
                });
            }

            user.walletBalance -= totalCost;
            await user.save();

            transaction = await Transaction.create({
                buyerId: userId,
                sellerId: null,
                stockId,
                quantity,
                price,
                totalAmount: totalCost,
            });
        } else {
            // For limit orders, immediately trigger order matching to check if they can be filled
            // This ensures that if current price is favorable, the order gets completed right away
            console.log(`[Order API] Creating limit order for stock ${stock.symbol} at ${pricePerShare}, current price: ${stock.currentPrice}`);

            // Check if this BUY order can be filled immediately at current price
            if (orderType === "BUY" && pricePerShare >= stock.currentPrice) {
                console.log(`[Order API] BUY order price (${pricePerShare}) >= current price (${stock.currentPrice}), attempting immediate fill`);
                const immediateMarketFill = await OrderMatchingEngine.executeMarketFill(order, qty, stock.currentPrice);
                if (immediateMarketFill) {
                    console.log(`[Order API] BUY order was immediately filled at market price ${stock.currentPrice}`);
                    matchResult.matched += 1;
                    matchResult.trades.push(immediateMarketFill);
                }
            }
            // Check if SELL order can be filled immediately
            else if (orderType === "SELL" && pricePerShare <= stock.currentPrice) {
                console.log(`[Order API] SELL order price (${pricePerShare}) <= current price (${stock.currentPrice}), attempting immediate fill`);
                const immediateMarketFill = await OrderMatchingEngine.executeMarketFill(order, qty, stock.currentPrice);
                if (immediateMarketFill) {
                    console.log(`[Order API] SELL order was immediately filled at market price ${stock.currentPrice}`);
                    matchResult.matched += 1;
                    matchResult.trades.push(immediateMarketFill);
                }
            }

            // Then run normal matching engine for order book matching
            const engineResult = await OrderMatchingEngine.matchOrders(stockId);
            matchResult.matched += engineResult.matched;
            matchResult.trades = matchResult.trades.concat(engineResult.trades);
            matchResult.error = engineResult.error;
        }

        // Refresh order to get updated status
        const updatedOrder = await Order.findById(order._id).populate("userId stockId");
        const updatedUser = await User.findById(userId).select("name email walletBalance portfolio");

        res.status(201).json({
            message: "Order placed",
            order: updatedOrder,
            marketFilled: isMarketBuy,
            matchesFound: matchResult.matched,
            fullyMatched: updatedOrder.status === "COMPLETED",
            orderStatus: updatedOrder.status,
            trades: matchResult.trades || [],
            transaction: transaction ? transaction : undefined,
            user: updatedUser,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

orderApp.put("/:id", async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
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

// Endpoint to view pending orders for debugging
orderApp.get("/pending/stock/:stockId", async (req, res) => {
    try {
        const { stockId } = req.params;
        const stock = await Stock.findById(stockId);
        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        const buyOrders = await Order.find({
            stockId,
            orderType: "BUY",
            status: "PENDING",
        }).sort({ price: -1, createdAt: 1 });

        const sellOrders = await Order.find({
            stockId,
            orderType: "SELL",
            status: "PENDING",
        }).sort({ price: 1, createdAt: 1 });

        res.json({
            stock: {
                symbol: stock.symbol,
                currentPrice: stock.currentPrice,
            },
            buyOrders: buyOrders.map(o => ({
                _id: o._id,
                quantity: o.quantity,
                price: o.price,
                status: o.status,
                createdAt: o.createdAt,
                canFill: o.price >= stock.currentPrice,
            })),
            sellOrders: sellOrders.map(o => ({
                _id: o._id,
                quantity: o.quantity,
                price: o.price,
                status: o.status,
                createdAt: o.createdAt,
                canFill: o.price <= stock.currentPrice,
            })),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to get all pending orders
orderApp.get("/pending/all", async (req, res) => {
    try {
        const orders = await Order.find({
            status: "PENDING"
        }).populate("stockId").sort({ createdAt: -1 });

        const grouped = orders.reduce((acc, order) => {
            const symbol = order.stockId?.symbol || "UNKNOWN";
            if (!acc[symbol]) acc[symbol] = { BUY: [], SELL: [] };
            acc[symbol][order.orderType].push({
                _id: order._id,
                quantity: order.quantity,
                price: order.price,
                currentPrice: order.stockId?.currentPrice,
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
