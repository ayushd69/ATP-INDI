import { useMemo, useState } from "react";
import { addToWatchlist, getWatchlist } from "./sampleStockData.js";
import { formatINR, toINR } from "../utils/currency.js";
import { orders } from "../services/api.js";

export default function StockList({ userId, user, onUpdateUser, stocks = [], onSelectStock }) {
  const [watchlistVersion, setWatchlistVersion] = useState(0);
  const watchlist = useMemo(() => {
    if (!userId || watchlistVersion < 0) return [];
    return getWatchlist(userId);
  }, [userId, watchlistVersion]);
  const [feedback, setFeedback] = useState("");
  const [orderModal, setOrderModal] = useState({ open: false, stock: null, quantity: "1", orderType: "BUY" });
  const items = stocks.length > 0 ? stocks : [];

  const handleAddToWatchlist = (stock) => {
    if (!userId) {
      setFeedback("Please log in to add stocks to your watchlist.");
      return;
    }

    addToWatchlist(userId, stock);
    setWatchlistVersion((current) => current + 1);
    setFeedback(`${stock.symbol} added to your watchlist.`);
  };

  const openOrderModal = (stock) => {
    if (!userId) {
      setFeedback("Please log in to place an order.");
      return;
    }
    setOrderModal({ open: true, stock, quantity: "1", orderType: "BUY" });
  };

  const closeOrderModal = () => {
    setOrderModal({ open: false, stock: null, quantity: "1", orderType: "BUY" });
  };

  const confirmOrder = async () => {
    const { stock, quantity, orderType } = orderModal;
    const qty = Number(quantity);

    if (!qty || qty < 1) {
      setFeedback("Please enter a valid quantity.");
      return;
    }

    if (!stock._id) {
      setFeedback("Unable to place order until live stock data is loaded.");
      return;
    }

    const orderCost = stock.currentPrice * qty;
    if (orderType === "BUY" && Number(user?.walletBalance ?? 0) < orderCost) {
      setFeedback("Insufficient wallet balance to complete this purchase.");
      return;
    }

    try {
      const response = await orders.create({
        userId,
        stockId: stock._id,
        orderType,
        quantity: qty,
        price: stock.currentPrice,
      });
      if (response.user && onUpdateUser) {
        onUpdateUser(response.user);
      }
      setFeedback(`✓ ${orderType === "BUY" ? "Purchased" : "Sold"} ${qty} ${stock.symbol} shares at ${formatINR(stock.currentPrice)}`);
      closeOrderModal();
    } catch (err) {
      setFeedback(err.message || "Failed to place order.");
    }
  };

  return (
    <section className="space-y-4 p-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">Available Stocks</h2>
          </div>
          <span className="rounded-full bg-slate-900 px-4 py-2 text-sm text-slate-300">{items.length} stocks</span>
        </div>

        {feedback && <div className="mb-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-200">{feedback}</div>}

        {items.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            No stocks available.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((stock) => {
              const isPositive = (stock.priceChange ?? 0) >= 0;
              const changeColor = isPositive ? "text-emerald-400" : "text-rose-400";
              const changeSign = isPositive ? "+" : "";
              const isWatched = watchlist.some((item) => item.symbol === stock.symbol);

              return (
                <article key={stock.symbol} className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-sky-500 hover:bg-slate-950">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">{stock.symbol}</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-100">{stock.companyName}</h3>
                    </div>
                    <div className="rounded-2xl bg-slate-800 px-3 py-2 text-sm text-slate-300">Live</div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/80 px-4 py-3">
                      <span className="text-slate-400">Price</span>
                      <span className="text-lg font-semibold text-slate-100">{formatINR(stock.currentPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/80 px-4 py-3">
                      <span className="text-slate-400">Change</span>
                      <span className={`${changeColor} text-lg font-semibold`}>{changeSign}{formatINR(Math.abs(stock.priceChange))}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/80 px-4 py-3">
                      <span className="text-slate-400">Volume</span>
                      <span className="text-slate-100">{stock.volume ?? 0}</span>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleAddToWatchlist(stock)}
                      className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                    >
                      {isWatched ? "In Watchlist" : "Watchlist"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectStock?.(stock)}
                      className="rounded-2xl border border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => openOrderModal(stock)}
                      className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                    >
                      Trade
                    </button>
                  </div>

                </article>
              );
            })}
          </div>
        )}
      </div>

      {orderModal.open && orderModal.stock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-3xl bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-100">
              {orderModal.orderType === "BUY" ? "Buy" : "Sell"} {orderModal.stock.symbol}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Current Price: {formatINR(orderModal.stock.currentPrice)}
            </p>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-300">
                Order Type
                <select
                  value={orderModal.orderType}
                  onChange={(e) => setOrderModal({ ...orderModal, orderType: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={orderModal.quantity}
                  onChange={(e) => setOrderModal({ ...orderModal, quantity: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="rounded-2xl bg-slate-900 p-3">
                <p className="text-sm text-slate-400">Total {orderModal.orderType === "BUY" ? "Cost" : "Proceeds"}:</p>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  {formatINR(orderModal.stock.currentPrice * Number(orderModal.quantity || 0))}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeOrderModal}
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmOrder}
                className="flex-1 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Confirm {orderModal.orderType === "BUY" ? "Buy" : "Sell"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
