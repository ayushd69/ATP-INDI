import { useEffect, useState, useMemo } from "react";
import { users, stocks, orders } from "../services/api.js";
import { formatINR } from "../utils/currency.js";
import io from "socket.io-client";

export default function AdminDashboard({ stocks: liveStocks = [] }) {
  // ===== STATE MANAGEMENT =====
  const [activeTab, setActiveTab] = useState("overview");
  const [traders, setTraders] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [socket, setSocket] = useState(null);

  // Modal/Form states
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({ symbol: "", companyName: "", currentPrice: "" });
  const [marketActive, setMarketActive] = useState(true);
  const [volatility, setVolatility] = useState(2);

  // ===== INITIALIZE DATA =====
  useEffect(() => {
    fetchAllData();
    const newSocket = io();
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const [tradersData, stocksData, transactionsData] = await Promise.all([
        users.list().catch(() => []),
        stocks.list().catch(() => []),
        orders.list().catch(() => []),
      ]);
      setTraders(tradersData || []);
      setAllStocks(stocksData || []);
      setAllTransactions(transactionsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== STOCK MANAGEMENT =====
  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      await stocks.create({
        symbol: stockForm.symbol.toUpperCase(),
        companyName: stockForm.companyName,
        currentPrice: parseFloat(stockForm.currentPrice),
        priceChange: 0,
        volume: 0,
      });
      setStockForm({ symbol: "", companyName: "", currentPrice: "" });
      setShowStockForm(false);
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStock = async (stockId) => {
    if (window.confirm("Delete this stock?")) {
      try {
        await stocks.delete(stockId);
        fetchAllData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleResetUsers = async () => {
    if (!window.confirm("Reset all user accounts to ₹100,000 and clear portfolios/orders/watchlists?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await users.resetAll();
      setSuccess("All users reset to ₹100,000 and portfolio/order/watchlist data cleared.");
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user and all related data?")) return;
    try {
      setError("");
      setSuccess("");
      await users.remove(userId);
      setSuccess("User deleted successfully.");
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  // ===== ANALYTICS CALCULATIONS =====
  const analytics = useMemo(() => {
    let totalWalletCash = 0;
    let totalHoldingsValuation = 0;
    let totalSharesCount = 0;

    traders.forEach((trader) => {
      totalWalletCash += trader.walletBalance ?? 0;
      trader.portfolio?.forEach((item) => {
        const currentPrice = item.stockId?.currentPrice ?? item.avgBuyPrice ?? 0;
        totalHoldingsValuation += (item.quantity ?? 0) * currentPrice;
        totalSharesCount += item.quantity ?? 0;
      });
    });

    return {
      userCount: traders.length,
      walletCapital: totalWalletCash,
      holdingsValuation: totalHoldingsValuation,
      sharesTraded: totalSharesCount,
      totalTransactions: allTransactions.length,
      averageTradeValue: allTransactions.length > 0
        ? allTransactions.reduce((sum, t) => sum + (t.totalValue ?? 0), 0) / allTransactions.length
        : 0,
    };
  }, [traders, allTransactions]);

  const averagePriceChange = useMemo(() => {
    if (allStocks.length === 0) return 0;
    return allStocks.reduce((sum, s) => sum + (s.priceChange ?? 0), 0) / allStocks.length;
  }, [allStocks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-300">Loading admin dashboard...</div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-100">Admin Dashboard</h1>
            <p className="text-slate-400 mt-1">Stock market simulation management</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition text-sm"
            >
              Refresh
            </button>
            <button
              onClick={handleResetUsers}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition text-sm"
            >
              Reset Users
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-950 border border-red-900 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-emerald-950 border border-emerald-900 rounded-lg text-emerald-300 text-sm">
            {success}
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-4 overflow-x-auto">
          {["overview", "stocks", "users", "transactions", "market"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === tab
                ? "bg-sky-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Total Users</p>
                <p className="text-3xl font-bold text-sky-400">{analytics.userCount}</p>
                <p className="text-xs text-slate-500 mt-2">Active traders</p>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Wallet Capital</p>
                <p className="text-2xl font-bold text-emerald-400">{formatINR(analytics.walletCapital)}</p>
                <p className="text-xs text-slate-500 mt-2">Total user liquidity</p>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Holdings Value</p>
                <p className="text-2xl font-bold text-violet-400">{formatINR(analytics.holdingsValuation)}</p>
                <p className="text-xs text-slate-500 mt-2">Market-indexed valuation</p>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Shares Held</p>
                <p className="text-3xl font-bold text-amber-400">{analytics.sharesTraded}</p>
                <p className="text-xs text-slate-500 mt-2">Across portfolios</p>
              </div>
            </div>

            {/* MARKET STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-4">Market Overview</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Listed Stocks</span>
                    <span className="text-white font-semibold">{allStocks.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Avg Price Change</span>
                    <span className={`font-semibold ${averagePriceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {averagePriceChange.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Market Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${marketActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                      {marketActive ? "ACTIVE" : "CLOSED"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-4">Transaction Stats</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Transactions</span>
                    <span className="text-white font-semibold">{analytics.totalTransactions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Avg Trade Value</span>
                    <span className="text-white font-semibold">{formatINR(analytics.averageTradeValue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Top Stock</span>
                    <span className="text-white font-semibold">
                      {allStocks.length > 0
                        ? allStocks.reduce((max, s) => (s.currentPrice > max.currentPrice ? s : max)).symbol
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stocks" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowStockForm(!showStockForm)}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition text-sm font-medium"
              >
                {showStockForm ? "Cancel" : "Add Stock"}
              </button>
            </div>

            {showStockForm && (
              <form onSubmit={handleAddStock} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Stock Symbol (e.g., AAPL)"
                  value={stockForm.symbol}
                  onChange={(e) => setStockForm({ ...stockForm, symbol: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={stockForm.companyName}
                  onChange={(e) => setStockForm({ ...stockForm, companyName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Current Price"
                  value={stockForm.currentPrice}
                  onChange={(e) => setStockForm({ ...stockForm, currentPrice: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  step="0.01"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-sky-600 text-white rounded px-3 py-2 hover:bg-sky-500 transition text-sm font-medium"
                >
                  Create Stock
                </button>
              </form>
            )}

            <div className="grid gap-3">
              {allStocks.map((stock) => (
                <div key={stock._id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{stock.symbol}</p>
                    <p className="text-sm text-slate-400">{stock.companyName}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-semibold text-white">{formatINR(stock.currentPrice)}</p>
                    <p className={`text-sm ${stock.priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {stock.priceChange >= 0 ? "+" : ""}{stock.priceChange.toFixed(2)}%
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteStock(stock._id)}
                    className="px-3 py-1 bg-red-900 text-red-300 rounded hover:bg-red-800 transition text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Showing {traders.length} registered traders</p>
            <div className="grid gap-3">
              {traders.map((trader) => (
                <div key={trader._id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{trader.name}</p>
                      <p className="text-sm text-slate-400">{trader.email}</p>
                      <p className="text-xs text-slate-500 mt-1">Joined: {new Date(trader.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Balance</p>
                      <p className="font-semibold text-emerald-400">{formatINR(trader.walletBalance || 0)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                    Holdings: {trader.portfolio?.length || 0} | Watchlist: {trader.watchlist?.length || 0}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700 flex justify-end gap-2">
                    <button
                      onClick={() => handleDeleteUser(trader._id)}
                      className="px-3 py-1 bg-red-900 text-red-300 rounded hover:bg-red-800 transition text-xs"
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Recent {allTransactions.length} transactions</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-700">
                  <tr className="text-slate-400">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Stock</th>
                    <th className="text-right py-3 px-4">Quantity</th>
                    <th className="text-right py-3 px-4">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {allTransactions.slice(0, 10).map((tx, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-300">{tx.userId?.name || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${tx.type === "buy" ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                          {tx.type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{tx.stockId?.symbol || "—"}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{tx.quantity}</td>
                      <td className="py-3 px-4 text-right text-white font-semibold">{formatINR(tx.totalValue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "market" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Market Simulation Controls</h3>

              <div className="space-y-4">
                {/* Market Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 font-medium">Market Status</p>
                    <p className="text-sm text-slate-400">Toggle market open/closed state</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketActive}
                      onChange={(e) => {
                        setMarketActive(e.target.checked);
                        socket?.emit("marketToggle", { active: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>

                {/* Volatility Control */}
                <div>
                  <label className="block text-slate-300 font-medium mb-2">
                    Price Volatility: <span className="text-sky-400">{volatility}%</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={volatility}
                    onChange={(e) => {
                      const newVol = parseInt(e.target.value);
                      setVolatility(newVol);
                      socket?.emit("setVolatility", { volatility: newVol });
                    }}
                    className="w-full accent-sky-600"
                  />
                  <p className="text-xs text-slate-400 mt-1">Adjust price movement intensity (1-10%)</p>
                </div>

                {/* Update Prices Button */}
                <div className="pt-4 border-t border-slate-700">
                  <button
                    onClick={() => {
                      socket?.emit("updatePrices", {});
                      alert("Stock prices updated and broadcast to all clients");
                    }}
                    className="w-full px-4 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition font-medium text-sm"
                  >
                    Force Price Update
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Market Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Market Status</p>
                  <p className={`text-lg font-semibold ${marketActive ? "text-emerald-400" : "text-red-400"}`}>
                    {marketActive ? "OPEN" : "CLOSED"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Current Volatility</p>
                  <p className="text-lg font-semibold text-amber-400">{volatility}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
