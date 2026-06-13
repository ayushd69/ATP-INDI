import { useEffect, useState } from "react";
import { orders } from "../services/api.js";
import { getOrders } from "./sampleStockData.js";
import { formatINR, toINR } from "../utils/currency.js";

export default function Transactions() {
    const [items, setItems] = useState([]);
    const [localOrders, setLocalOrders] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        // Get current user from localStorage (same logic as Auth)
        const storedUser = localStorage.getItem("investpro-user");
        const userId = storedUser ? JSON.parse(storedUser)._id : null;

        // Fetch backend transactions
        orders
            .list()
            .then((data) => {
                if (!active) return;
                setItems(data);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.message || "Failed to load transactions");
            })
            .finally(() => {
                if (!active) return;
                if (userId) {
                    setLocalOrders(getOrders(userId));
                }
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    if (loading) {
        return <div className="p-6 text-slate-300">Loading transactions...</div>;
    }

    if (error) {
        return <div className="p-6 text-rose-300">{error}</div>;
    }

    const allTransactions = [
        ...items.map(t => ({
            ...t,
            source: "backend",
            symbol: t.stockId?.symbol
        })),
        ...localOrders.map(o => ({
            ...o,
            source: "local",
            symbol: o.stock?.symbol,
            _id: o.id
        }))
    ];

    return (
        <section className="space-y-4 p-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                <h2 className="mb-4 text-2xl font-semibold text-slate-100">Transactions</h2>
                {allTransactions.length === 0 && (
                    <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-300">
                        <p>No transactions yet. Start trading to see your orders here!</p>
                    </div>
                )}
                {allTransactions.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
                            <thead>
                                <tr>
                                    <th className="px-3 py-3">Stock</th>
                                    <th className="px-3 py-3">Type</th>
                                    <th className="px-3 py-3">Quantity</th>
                                    <th className="px-3 py-3">Price</th>
                                    <th className="px-3 py-3">Total</th>
                                    <th className="px-3 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {allTransactions.map((item) => (
                                    <tr key={item._id} className={`hover:bg-slate-900/50 ${item.source === "local" ? "bg-slate-900/30" : ""}`}>
                                        <td className="px-3 py-3">{item.symbol || "Unknown"}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.orderType === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                                                {item.orderType || "BUY"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">{item.quantity}</td>
                                        <td className="px-3 py-3">{formatINR(item.price)}</td>
                                        <td className="px-3 py-3 font-semibold">{formatINR(item.price * item.quantity)}</td>
                                        <td className="px-3 py-3 text-xs text-slate-400">
                                            {item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                                        </td>
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
