import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { formatINR } from "./utils/currency.js";
import * as api from "./services/api.js";
import Navbar from "./components/Navbar.jsx";
import AuthPanel from "./components/AuthPanel.jsx";
import StockList from "./components/StockList.jsx";
import StockDetails from "./components/StockDetails.jsx";
import Portfolio from "./components/Portfolio.jsx";
import Watchlist from "./components/Watchlist.jsx";
import OrderForm from "./components/OrderForm.jsx";
import Transactions from "./components/Transactions.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import { sampleStocks } from "./components/sampleStockData.js";

const viewComponents = {
  stocks: StockList,
  portfolio: Portfolio,
  watchlist: Watchlist,
  orders: OrderForm,
  transactions: Transactions,
  "admin-dashboard": AdminDashboard,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("stocks");
  const [stocks, setStocks] = useState(
    sampleStocks.map((stock) => ({
      ...stock,
      priceHistory: [stock.currentPrice],
    }))
  );
  const [selectedStock, setSelectedStock] = useState(null);

  const handleAuthUser = (account) => {
    setUser(account);
    setView(account?.isAdmin ? "admin-dashboard" : "stocks");
  };

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const socket = io(backendUrl, {
      transports: ["websocket"],
    });

    const updateStockState = (payload) => {
      setStocks((currentStocks) => {
        const nextBySymbol = {};
        currentStocks.forEach((stock) => {
          nextBySymbol[stock.symbol] = stock;
        });

        payload.forEach((updated) => {
          const existing = nextBySymbol[updated.symbol];
          const nextHistory = existing
            ? [...(existing.priceHistory ?? [existing.currentPrice]), updated.currentPrice].slice(-24)
            : [updated.currentPrice];

          nextBySymbol[updated.symbol] = {
            ...existing,
            ...updated,
            priceHistory: nextHistory,
          };
        });

        return Object.values(nextBySymbol);
      });

      setSelectedStock((current) => {
        if (!current) return current;
        const updatedSelected = payload.find((item) => item.symbol === current.symbol);
        if (!updatedSelected) return current;
        return {
          ...current,
          ...updatedSelected,
          priceHistory: [...(current.priceHistory ?? [current.currentPrice]), updatedSelected.currentPrice].slice(-24),
        };
      });
    };

    const loadStocks = async () => {
      try {
        const stocksData = await api.stocks.list();
        if (Array.isArray(stocksData) && stocksData.length > 0) {
          setStocks(
            stocksData.map((stock) => ({
              ...stock,
              priceHistory: [stock.currentPrice],
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load stocks from backend:", error);
      }
    };

    loadStocks();
    const refreshInterval = setInterval(loadStocks, 10000);
    socket.on("stockData", updateStockState);
    socket.on("stockUpdate", updateStockState);

    return () => {
      clearInterval(refreshInterval);
      socket.disconnect();
    };
  }, []);

  const CurrentView = view === "stock-details" ? StockDetails : viewComponents[view] || StockList;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {user ? (
        <>
          <Navbar user={user} view={view} onSelectView={setView} onLogout={() => { setUser(null); setView("stocks"); }} onUpdateUser={setUser} />
          <main className="mx-auto max-w-7xl p-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/20">
              <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h1 className="text-3xl font-semibold text-slate-100">
                  Welcome back, {user.name || user.mail || "Admin"}
                </h1>
                {!user?.isAdmin && (
                  <p className="mt-2 text-slate-300">
                    Wallet balance: {formatINR(user?.walletBalance ?? 0)}
                  </p>
                )}
              </div>
              <CurrentView
                userId={user._id}
                user={user}
                onUpdateUser={setUser}
                stocks={stocks}
                selectedStock={selectedStock}
                onSelectStock={(stock) => {
                  const latestStock = stocks.find((item) => item.symbol === stock.symbol) || stock;
                  setSelectedStock(latestStock);
                  setView("stock-details");
                }}
                onBack={() => setView("stocks")}
              />
            </div>
          </main>
        </>
      ) : (
        <div className="min-h-screen bg-slate-950 p-4">
          <AuthPanel onLogin={handleAuthUser} onRegister={handleAuthUser} />
        </div>
      )}
    </div>
  );
}
