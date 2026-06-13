import { useEffect, useState } from "react";
import { orders, transactions } from "../services/api.js";
import { formatINR } from "../utils/currency.js";

export default function Transactions({ userId }) {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const fetchData = async () => {
            if (!userId) {
                if (!active) return;
                setError("User not authenticated");
                setLoading(false);
                return;
            }

            try {
                const [ordersData, transactionsData] = await Promise.all([
                    orders.byUser(userId),
                    transactions.byUser(userId),
                ]);

                if (!active) return;
                setPendingOrders(Array.isArray(ordersData) ? ordersData.filter((o) => o.status === "PENDING") : []);
                setTradeHistory(Array.isArray(transactionsData) ? transactionsData : []);
            } catch (err) {
                if (!active) return;
                setError(err.message || "Failed to load transactions");
            } finally {
                if (!active) return;
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            active = false;
        };
    }, [userId]);

    if (loading) {
        return <div className="p-6 text-slate-300">Loading transactions...</div>;
    }

    if (error) {
        return <div className="p-6 text-rose-300">{error}</div>;
    }

    const getTradeType = (transaction) => {
        const currentUserId = userId?.toString();
        const buyerId = transaction.buyerId?._id?.toString?.() || transaction.buyerId?.toString?.();
        return buyerId === currentUserId ? "BUY" : "SELL";
    };

    const getTradeDate = (item) => {
        const date = item.timestamp || item.createdAt;
        return date ? new Date(date).toLocaleDateString() : "-";
    };

    return (
        <section className="space-y-6 p-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                <h2 className="mb-4 text-2xl font-semibold text-slate-100">Pending Orders</h2>
                {pendingOrders.length === 0 ? (
                    <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-300">
                        <p>No pending orders currently.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
                            <thead>
                                <tr>
                                    <th className="px-3 py-3">Stock</th>
                                    <th className="px-3 py-3">Type</th>
                                    <th className="px-3 py-3">Quantity</th>
                                    <th className="px-3 py-3">Price</th>
                                    <th className="px-3 py-3">Total</th>
                                    <th className="px-3 py-3">Status</th>
                                    <th className="px-3 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {pendingOrders.map((order) => (
                                    <tr key={order._id} className="hover:bg-slate-900/50">
                                        <td className="px-3 py-3">{order.stockId?.symbol || "Unknown"}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${order.orderType === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                                                {order.orderType}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">{order.quantity}</td>
                                        <td className="px-3 py-3">{formatINR(order.price)}</td>
                                        <td className="px-3 py-3 font-semibold">{formatINR(order.price * order.quantity)}</td>
                                        <td className="px-3 py-3">
                                            <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-300">
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-slate-400">{getTradeDate(order)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                <h2 className="mb-4 text-2xl font-semibold text-slate-100">Trade History</h2>
                {tradeHistory.length === 0 ? (
                    <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-300">
                        <p>No completed trades yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
                            <thead>
                                <tr>
                                    <th className="px-3 py-3">Stock</th>
                                    <th className="px-3 py-3">Type</th>
                                    <th className="px-3 py-3">Quantity</th>
                                    <th className="px-3 py-3">Price</th>
                                    <th className="px-3 py-3">Total</th>
                                    <th className="px-3 py-3">Role</th>
                                    <th className="px-3 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {tradeHistory.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-slate-900/50">
                                        <td className="px-3 py-3">{tx.stockId?.symbol || "Unknown"}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getTradeType(tx) === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                                                {getTradeType(tx)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">{tx.quantity}</td>
                                        <td className="px-3 py-3">{formatINR(tx.price)}</td>
                                        <td className="px-3 py-3 font-semibold">{formatINR(tx.totalAmount)}</td>
                                        <td className="px-3 py-3 text-xs text-slate-300">{getTradeType(tx) === "BUY" ? "Bought" : "Sold"}</td>
                                        <td className="px-3 py-3 text-xs text-slate-400">{getTradeDate(tx)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
