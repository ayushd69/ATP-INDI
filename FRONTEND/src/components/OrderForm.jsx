import { useEffect, useState } from "react";
import { orders, stocks } from "../services/api.js";
import { sampleStocks } from "./sampleStockData.js";
import { formatINR } from "../utils/currency.js";

export default function OrderForm({ userId, user, onUpdateUser }) {
    const [stockItems, setStockItems] = useState([]);
    const [form, setForm] = useState({ stockId: "", orderType: "BUY", quantity: 1, price: 0 });
    const [feedback, setFeedback] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        stocks
            .list()
            .then((data) => {
                if (!active) return;
                if (data.length === 0) {
                    setStockItems(sampleStocks);
                    setForm((current) => ({ ...current, stockId: sampleStocks[0]?.symbol ?? "", price: sampleStocks[0]?.currentPrice ?? 0 }));
                } else {
                    setStockItems(data);
                    setForm((current) => ({ ...current, stockId: data[0]._id, price: data[0].currentPrice ?? 0 }));
                }
            })
            .catch(() => {
                if (!active) return;
                setStockItems(sampleStocks);
                setForm((current) => ({ ...current, stockId: sampleStocks[0]?.symbol ?? "", price: sampleStocks[0]?.currentPrice ?? 0 }));
            });

        return () => {
            active = false;
        };
    }, []);

    const handleInput = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: name === "quantity" || name === "price" ? Number(value) : value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setFeedback("");

        if (!userId) {
            setError("Please log in before placing an order.");
            return;
        }

        const totalValue = form.price * form.quantity;
        if (form.orderType === "BUY" && Number(user?.walletBalance ?? 0) < totalValue) {
            setError("Insufficient wallet balance to complete this purchase.");
            return;
        }

        try {
            const response = await orders.create({ ...form, userId });
            if (response.user && onUpdateUser) {
                onUpdateUser(response.user);
            }
            if (form.orderType === "SELL") {
                const profitLoss = response.realizedPnL ?? 0;
                const profitLossLabel = profitLoss >= 0 ? "gain" : "loss";
                setFeedback(
                    `Order sold successfully. ${profitLossLabel}: ${formatINR(Math.abs(profitLoss))}.`
                );
            } else {
                setFeedback(`Order ${form.orderType.toLowerCase()} submitted successfully.`);
            }
            setForm((current) => ({ ...current, quantity: 1 }));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <section className="space-y-4 p-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                <h2 className="mb-4 text-2xl font-semibold text-slate-100">Place Order</h2>
                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                        Stock
                        <select
                            name="stockId"
                            value={form.stockId}
                            onChange={(event) => {
                                const selected = stockItems.find((stock) => stock._id === event.target.value || stock.symbol === event.target.value);
                                setForm((current) => ({ ...current, stockId: event.target.value, price: selected?.currentPrice ?? current.price }));
                            }}
                            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                        >
                            {stockItems.map((stock) => (
                                <option key={stock._id ?? stock.symbol} value={stock._id ?? stock.symbol}>
                                    {stock.symbol} - {stock.companyName}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block text-sm text-slate-300">
                        Order Type
                        <select
                            name="orderType"
                            value={form.orderType}
                            onChange={handleInput}
                            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                        >
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                        </select>
                    </label>

                    <label className="block text-sm text-slate-300">
                        Quantity
                        <input
                            name="quantity"
                            type="number"
                            min="1"
                            value={form.quantity}
                            onChange={handleInput}
                            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                        />
                    </label>

                    <label className="block text-sm text-slate-300">
                        Price per Share
                        <input
                            name="price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.price}
                            onChange={handleInput}
                            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                        />
                    </label>

                    <div className="md:col-span-2 space-y-3">
                        {error && <div className="rounded-2xl bg-rose-950 px-4 py-3 text-sm text-rose-300">{error}</div>}
                        {feedback && <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-200">{feedback}</div>}
                        <button
                            type="submit"
                            className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                        >
                            Submit Order
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
