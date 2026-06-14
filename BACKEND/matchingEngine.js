import Order from "./models/Order.js";
import Portfolio from "./models/Portfolio.js";
import Stock from "./models/Stock.js";
import User from "./models/User.js";
import Transaction from "./models/Transaction.js";

class OrderMatchingEngine {
    /**
     * Match pending orders for a specific stock
     * @param {string} stockId - The stock ID to match orders for
     */
    static async matchOrders(stockId) {
        try {
            const stock = await Stock.findById(stockId);
            if (!stock) {
                return { matched: 0, trades: [] };
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

            const trades = [];
            let buyIndex = 0;
            let sellIndex = 0;

            while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
                const buyOrder = buyOrders[buyIndex];
                const sellOrder = sellOrders[sellIndex];

                if (buyOrder.quantity <= 0) {
                    buyIndex += 1;
                    continue;
                }
                if (sellOrder.quantity <= 0) {
                    sellIndex += 1;
                    continue;
                }

                if (buyOrder.price < sellOrder.price) {
                    break;
                }

                const matchQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
                const tradePrice = sellOrder.price;

                const trade = await this.executeTrade(
                    buyOrder,
                    sellOrder,
                    matchQuantity,
                    tradePrice
                );

                if (trade) {
                    trades.push(trade);
                    console.log(
                        `[Matching Engine] Executed trade: BUY order ${buyOrder._id} matched SELL order ${sellOrder._id} qty=${matchQuantity} price=${tradePrice}`
                    );
                }

                if (buyOrder.quantity === 0) {
                    buyIndex += 1;
                }
                if (sellOrder.quantity === 0) {
                    sellIndex += 1;
                }
            }

            const marketFills = await this.fillOrdersAtMarketPrice(stockId, stock.currentPrice);
            return { matched: trades.length + marketFills.length, trades: trades.concat(marketFills) };
        } catch (error) {
            console.error("Matching engine error:", error);
            return { matched: 0, trades: [], error: error.message };
        }
    }

    static async executeMarketFill(order, quantity, price) {
        try {
            const totalCost = price * quantity;
            const userId = order.userId?._id ?? order.userId;
            const stockId = order.stockId?._id ?? order.stockId;
            const user = await User.findById(userId);
            if (!user) {
                throw new Error("Order user not found");
            }

            const portfolio = await Portfolio.findOne({ userId, stockId });
            const saveOperations = [];

            if (order.orderType === "BUY") {
                if (user.walletBalance < totalCost) {
                    return null;
                }

                if (portfolio) {
                    const newQuantity = portfolio.quantity + quantity;
                    const totalCostBasis = portfolio.avgBuyPrice * portfolio.quantity + price * quantity;
                    portfolio.avgBuyPrice = totalCostBasis / newQuantity;
                    portfolio.quantity = newQuantity;
                    saveOperations.push(portfolio.save());
                } else {
                    const newPortfolio = await Portfolio.create({
                        userId,
                        stockId,
                        quantity,
                        avgBuyPrice: price,
                    });
                    saveOperations.push(
                        User.findByIdAndUpdate(userId, {
                            $push: { portfolio: newPortfolio._id },
                        })
                    );
                }

                user.walletBalance -= totalCost;
                saveOperations.push(user.save());
            } else {
                if (!portfolio || portfolio.quantity < quantity) {
                    return null;
                }

                portfolio.quantity -= quantity;
                if (portfolio.quantity <= 0) {
                    saveOperations.push(Portfolio.findByIdAndDelete(portfolio._id));
                    saveOperations.push(
                        User.findByIdAndUpdate(userId, {
                            $pull: { portfolio: portfolio._id },
                        })
                    );
                } else {
                    saveOperations.push(portfolio.save());
                }

                user.walletBalance += totalCost;
                saveOperations.push(user.save());
            }

            order.quantity -= quantity;
            if (order.quantity === 0) {
                order.status = "COMPLETED";
            }
            saveOperations.push(order.save());

            const transaction = await Transaction.create({
                buyerId: order.orderType === "BUY" ? userId : undefined,
                sellerId: order.orderType === "SELL" ? userId : undefined,
                stockId,
                quantity,
                price,
                totalAmount: totalCost,
            });

            await Promise.all(saveOperations);

            return {
                orderId: order._id,
                quantity,
                price,
                totalCost,
                transactionId: transaction._id,
                buyerId: transaction.buyerId,
                sellerId: transaction.sellerId,
            };
        } catch (error) {
            console.error("Market fill execution error:", error);
            return null;
        }
    }

    static async fillOrdersAtMarketPrice(stockId, currentPrice) {
        const fills = [];

        const pendingBuyOrders = await Order.find({
            stockId,
            orderType: "BUY",
            status: "PENDING",
            price: { $gte: currentPrice },
        }).sort({ price: -1, createdAt: 1 });

        for (const buyOrder of pendingBuyOrders) {
            if (buyOrder.quantity <= 0) continue;
            const fill = await this.executeMarketFill(buyOrder, buyOrder.quantity, currentPrice);
            if (fill) {
                fills.push(fill);
            }
        }

        const pendingSellOrders = await Order.find({
            stockId,
            orderType: "SELL",
            status: "PENDING",
            price: { $lte: currentPrice },
        }).sort({ price: 1, createdAt: 1 });

        for (const sellOrder of pendingSellOrders) {
            if (sellOrder.quantity <= 0) continue;
            const fill = await this.executeMarketFill(sellOrder, sellOrder.quantity, currentPrice);
            if (fill) {
                fills.push(fill);
            }
        }

        return fills;
    }

    /**
     * Execute a single trade between buyer and seller
     */
    static async executeTrade(buyOrder, sellOrder, quantity, price) {
        try {
            const totalCost = price * quantity;
            const buyerId = buyOrder.userId?._id ?? buyOrder.userId;
            const sellerId = sellOrder.userId?._id ?? sellOrder.userId;
            const stockId = buyOrder.stockId?._id ?? buyOrder.stockId;

            const [buyer, seller] = await Promise.all([
                User.findById(buyerId),
                User.findById(sellerId),
            ]);

            if (!buyer || !seller) {
                throw new Error("Buyer or seller user not found");
            }

            const [buyerPortfolio, sellerPortfolio] = await Promise.all([
                Portfolio.findOne({ userId: buyerId, stockId }),
                Portfolio.findOne({ userId: sellerId, stockId }),
            ]);

            if (!sellerPortfolio || sellerPortfolio.quantity < quantity) {
                return null;
            }

            if (buyer.walletBalance < totalCost) {
                return null;
            }

            const saveOperations = [];

            if (buyerPortfolio) {
                const newQuantity = buyerPortfolio.quantity + quantity;
                const totalCostBasis = buyerPortfolio.avgBuyPrice * buyerPortfolio.quantity + price * quantity;
                buyerPortfolio.avgBuyPrice = totalCostBasis / newQuantity;
                buyerPortfolio.quantity = newQuantity;
                saveOperations.push(buyerPortfolio.save());
            } else {
                const newPortfolio = await Portfolio.create({
                    userId: buyerId,
                    stockId,
                    quantity,
                    avgBuyPrice: price,
                });
                saveOperations.push(
                    User.findByIdAndUpdate(buyerId, {
                        $push: { portfolio: newPortfolio._id },
                    })
                );
            }

            if (sellerPortfolio.quantity <= 0) {
                saveOperations.push(Portfolio.findByIdAndDelete(sellerPortfolio._id));
                saveOperations.push(
                    User.findByIdAndUpdate(sellerId, {
                        $pull: { portfolio: sellerPortfolio._id },
                    })
                );
            } else {
                sellerPortfolio.quantity -= quantity;
                saveOperations.push(sellerPortfolio.save());
            }

            buyer.walletBalance -= totalCost;
            seller.walletBalance += totalCost;
            saveOperations.push(buyer.save(), seller.save());

            buyOrder.quantity -= quantity;
            if (buyOrder.quantity === 0) {
                buyOrder.status = "COMPLETED";
            }
            saveOperations.push(buyOrder.save());

            sellOrder.quantity -= quantity;
            if (sellOrder.quantity === 0) {
                sellOrder.status = "COMPLETED";
            }
            saveOperations.push(sellOrder.save());

            const transaction = await Transaction.create({
                buyerId,
                sellerId,
                stockId,
                quantity,
                price,
                totalAmount: totalCost,
            });

            await Promise.all(saveOperations);

            return {
                buyOrderId: buyOrder._id,
                sellOrderId: sellOrder._id,
                quantity,
                price,
                totalCost,
                transactionId: transaction._id,
                buyerId: buyer._id,
                sellerId: seller._id,
            };
        } catch (error) {
            console.error("Trade execution error:", error);
            return null;
        }
    }

    /**
     * Check and match all pending orders
     */
    static async matchAllPendingOrders() {
        try {
            // Get all unique stocks with pending orders
            const stocksWithOrders = await Order.distinct("stockId", {
                status: "PENDING",
            });

            const results = [];

            for (const stockId of stocksWithOrders) {
                const result = await this.matchOrders(stockId);
                results.push({ stockId, ...result });
            }

            return results;
        } catch (error) {
            console.error("Error matching all pending orders:", error);
            return [];
        }
    }

    /**
     * Cancel pending orders that are too old (optional cleanup)
     * @param {number} minutesOld - Cancel orders older than this many minutes
     */
    static async cancelOldOrders(minutesOld = 1440) {
        try {
            const cutoffTime = new Date(Date.now() - minutesOld * 60 * 1000);
            const result = await Order.updateMany(
                {
                    status: "PENDING",
                    createdAt: { $lt: cutoffTime },
                },
                { status: "CANCELLED" }
            );
            return result.modifiedCount;
        } catch (error) {
            console.error("Error cancelling old orders:", error);
            return 0;
        }
    }
}

export default OrderMatchingEngine;
