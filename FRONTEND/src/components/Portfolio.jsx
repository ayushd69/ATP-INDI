import { useEffect, useState } from "react";
import { portfolio, orders } from "../services/api.js";
import { formatINR, toINR } from "../utils/currency.js";

export default function Portfolio({ userId, user, onUpdateUser, stocks = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sellQuantities, setSellQuantities] = useState({});

  useEffect(() => {
    if (!userId) return;
    let active = true;

    setLoading(true);
    setError("");
    setFeedback("");

    portfolio
      .byUser(userId)
      .then((data) => {
        if (!active) return;
        setItems(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Unable to load portfolio.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const handleSellQuantityChange = (itemId, value) => {
    setSellQuantities((current) => ({
      ...current,
      [itemId]: Number(value),
    }));
  };

  const [sellModal, setSellModal] = useState({ open: false, item: null, quantity: 1, sellPrice: 0, profit: 0, proceeds: 0 });

  const openSellConfirm = (item) => {
    setError("");
    setFeedback("");
    const qty = Number(sellQuantities[item._id] ?? 1);
    if (qty < 1) {
      setError("Enter a sell quantity of at least 1.");
      return;
    }
    if (qty > item.quantity) {
      setError("You cannot sell more shares than you own.");
      return;
    }

    // Get current price from live stocks data
    const liveStock = stocks.find((s) => s._id === item.stockId?._id || s.symbol === item.stockId?.symbol);
    const sellPrice = liveStock?.currentPrice ?? item.stockId?.currentPrice ?? item.avgBuyPrice;
    const profitPerShare = sellPrice - item.avgBuyPrice;
    const totalProfit = profitPerShare * qty;
    const proceeds = sellPrice * qty;

    setSellModal({ open: true, item, quantity: qty, sellPrice, profit: totalProfit, proceeds });
  };

  const confirmSell = async () => {
    setError("");
    setFeedback("");
    const { item, quantity, sellPrice } = sellModal;
    if (!item) return;

    try {
      const response = await orders.create({
        userId,
        stockId: item.stockId._id,
        orderType: "SELL",
        quantity,
        price: sellPrice,
      });

      const profitLoss = response.realizedPnL ?? 0;
      const profitLossLabel = profitLoss >= 0 ? "gain" : "loss";
      setFeedback(
        `Sold ${quantity} ${item.stockId?.symbol || "shares"} at ${formatINR(sellPrice)} each. ${profitLossLabel}: ${formatINR(Math.abs(profitLoss))}.`
      );
      setSellQuantities((current) => ({ ...current, [item._id]: 1 }));
      if (onUpdateUser && response.user) {
        onUpdateUser(response.user);
      }
      // refresh portfolio
      const refreshed = await portfolio.byUser(userId);
      setItems(refreshed);
      setSellModal({ open: false, item: null, quantity: 1, sellPrice: 0, profit: 0, proceeds: 0 });
    } catch (err) {
      setError(err.message || "Unable to complete sell order.");
      setSellModal((s) => ({ ...s, open: false }));
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-300">Loading portfolio...</div>;
  }

  return (
    <section className="space-y-4 p-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="mb-4 text-2xl font-semibold text-slate-100">Portfolio</h2>

        {error && <div className="mb-4 rounded-2xl bg-rose-950 px-4 py-3 text-sm text-rose-300">{error}</div>}
        {feedback && <div className="mb-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-200">{feedback}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
            <thead>
              <tr>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">Quantity</th>
                <th className="px-3 py-3">Current Value</th>
                <th className="px-3 py-3">Unrealized P/L</th>
                <th className="px-3 py-3">Sell Qty</th>
                <th className="px-3 py-3">Sell</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-4 text-slate-400">
                    No portfolio items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  // Get current price from live stocks data
                  const liveStock = stocks.find((s) => s._id === item.stockId?._id || s.symbol === item.stockId?.symbol);
                  const currentPrice = liveStock?.currentPrice ?? item.stockId?.currentPrice ?? item.avgBuyPrice;
                  const currentValue = item.quantity * currentPrice;
                  const unrealized = item.quantity * (currentPrice - item.avgBuyPrice);
                  const unrealizedLabel = `${unrealized >= 0 ? "+" : "-"}${formatINR(Math.abs(unrealized))}`;

                  return (
                    <tr key={item._id} className="hover:bg-slate-900/50">
                      <td className="px-3 py-3">{item.stockId?.symbol || "Unknown"}</td>
                      <td className="px-3 py-3">{item.quantity}</td>
                      <td className="px-3 py-3">{formatINR(currentValue)}</td>
                      <td className={`px-3 py-3 ${unrealized >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {unrealizedLabel}
                      </td>
                      <td className="px-3 py-3 w-32">
                        <input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={sellQuantities[item._id] ?? 1}
                          onChange={(event) => handleSellQuantityChange(item._id, event.target.value)}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => openSellConfirm(item)}
                          className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {sellModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl bg-slate-950 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-100">Confirm Sell</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div>
                  <strong>Stock:</strong> {sellModal.item?.stockId?.symbol || "Unknown"}
                </div>
                <div>
                  <strong>Quantity:</strong> {sellModal.quantity}
                </div>
                <div>
                  <strong>Buy Price:</strong> {formatINR(sellModal.item?.avgBuyPrice ?? 0)}
                </div>
                <div>
                  <strong>Profit / Loss:</strong>{" "}
                  <span className={sellModal.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {sellModal.profit >= 0 ? "+" : "-"}{formatINR(Math.abs(sellModal.profit))}
                  </span>
                </div>
                <div>
                  <strong>Total:</strong> {formatINR(sellModal.proceeds)}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSellModal({ open: false, item: null, quantity: 1, sellPrice: 0, profit: 0, proceeds: 0 })}
                  className="rounded-2xl border border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSell}
                  className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
                >
                  Confirm Sell
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
