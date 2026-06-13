import Order from "./models/Order.js";
import Portfolio from "./models/Portfolio.js";
import User from "./models/User.js";
import Transaction from "./models/Transaction.js";

class OrderMatchingEngine {
    /**
     * Match pending orders for a specific stock
     * @param {string} stockId - The stock ID to match orders for
     */
    static async matchOrders(stockId) {
        try {
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

            if (buyOrders.length === 0 || sellOrders.length === 0) {
                return { matched: 0, trades: [] };
            }

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

            return { matched: trades.length, trades };
        } catch (error) {
            console.error("Matching engine error:", error);
            return { matched: 0, trades: [], error: error.message };
        }
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
