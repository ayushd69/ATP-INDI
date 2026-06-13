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
            // Get all pending buy orders, sorted by price (descending) and time (ascending)
            const buyOrders = await Order.find({
                stockId,
                orderType: "BUY",
                status: "PENDING",
            })
                .populate("userId")
                .sort({ price: -1, createdAt: 1 });

            // Get all pending sell orders, sorted by price (ascending) and time (ascending)
            const sellOrders = await Order.find({
                stockId,
                orderType: "SELL",
                status: "PENDING",
            })
                .populate("userId")
                .sort({ price: 1, createdAt: 1 });

            if (buyOrders.length === 0 || sellOrders.length === 0) {
                return { matched: 0, trades: [] };
            }

            const trades = [];

            // Try to match buy and sell orders
            for (const buyOrder of buyOrders) {
                if (buyOrder.quantity <= 0) continue;

                for (const sellOrder of sellOrders) {
                    if (sellOrder.quantity <= 0) continue;

                    // Check if prices match (buyer's price >= seller's price)
                    if (buyOrder.price >= sellOrder.price) {
                        const matchQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
                        const tradePrice = sellOrder.price; // Trade at seller's price (earlier order gets better deal)

                        const trade = await this.executeTrade(
                            buyOrder,
                            sellOrder,
                            matchQuantity,
                            tradePrice
                        );

                        if (trade) {
                            trades.push(trade);
                            buyOrder.quantity -= matchQuantity;
                            sellOrder.quantity -= matchQuantity;
                            console.log(
                                `[Matching Engine] Executed trade: BUY order ${buyOrder._id} matched SELL order ${sellOrder._id} qty=${matchQuantity} price=${tradePrice}`
                            );
                        }
                    }
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

            // Get buyer and seller users
            const buyer = await User.findById(buyerId);
            const seller = await User.findById(sellerId);

            if (!buyer || !seller) {
                throw new Error("Buyer or seller user not found");
            }

            // Check buyer has sufficient balance
            if (buyer.walletBalance < totalCost) {
                return null; // Cannot execute, insufficient funds
            }

            // Get or create portfolio items
            let buyerPortfolio = await Portfolio.findOne({
                userId: buyerId,
                stockId,
            });

            let sellerPortfolio = await Portfolio.findOne({
                userId: sellerId,
                stockId,
            });

            if (!sellerPortfolio || sellerPortfolio.quantity < quantity) {
                return null; // Seller doesn't have enough stock
            }

            // Update buyer portfolio
            if (buyerPortfolio) {
                const newQuantity = buyerPortfolio.quantity + quantity;
                const totalCostBasis =
                    buyerPortfolio.avgBuyPrice * buyerPortfolio.quantity + price * quantity;
                buyerPortfolio.avgBuyPrice = totalCostBasis / newQuantity;
                buyerPortfolio.quantity = newQuantity;
                await buyerPortfolio.save();
            } else {
                buyerPortfolio = await Portfolio.create({
                    userId: buyerId,
                    stockId,
                    quantity,
                    avgBuyPrice: price,
                });
                await User.findByIdAndUpdate(buyerId, {
                    $push: { portfolio: buyerPortfolio._id },
                });
            }

            // Update seller portfolio
            sellerPortfolio.quantity -= quantity;
            if (sellerPortfolio.quantity <= 0) {
                await Portfolio.findByIdAndDelete(sellerPortfolio._id);
                await User.findByIdAndUpdate(sellerId, {
                    $pull: { portfolio: sellerPortfolio._id },
                });
            } else {
                await sellerPortfolio.save();
            }

            // Update wallet balances
            buyer.walletBalance -= totalCost;
            seller.walletBalance += totalCost;
            await buyer.save();
            await seller.save();

            // Create transaction records
            const transaction = await Transaction.create({
                buyerId: buyerId,
                sellerId: sellerId,
                stockId: stockId,
                quantity,
                price,
                totalAmount: totalCost,
            });

            // Update order quantities
            buyOrder.quantity -= quantity;
            if (buyOrder.quantity === 0) {
                buyOrder.status = "COMPLETED";
            }
            await buyOrder.save();

            sellOrder.quantity -= quantity;
            if (sellOrder.quantity === 0) {
                sellOrder.status = "COMPLETED";
            }
            await sellOrder.save();

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
