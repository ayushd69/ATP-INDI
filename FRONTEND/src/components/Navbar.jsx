import { formatINR } from "../utils/currency.js";
import { useState } from "react";
import { users as usersApi } from "../services/api.js";

const menuItems = [
  { key: "stocks", label: "Stocks" },
  { key: "portfolio", label: "Portfolio" },
  { key: "watchlist", label: "Watchlist" },
  { key: "orders", label: "Orders" },
  { key: "transactions", label: "Transactions" },
];

export default function Navbar({ user, view, onSelectView, onLogout, onUpdateUser }) {
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState(1000);
  const [topupError, setTopupError] = useState("");
  const [topupSuccess, setTopupSuccess] = useState("");

  const handleTopup = async () => {
    setTopupError("");
    setTopupSuccess("");
    const amt = Number(topupAmount || 0);
    if (!amt || amt <= 0) {
      setTopupError("Enter a valid amount to add.");
      return;
    }
    if (!user?._id) {
      setTopupError("Please log in before adding funds.");
      return;
    }

    try {
      const newBalance = Number(user.walletBalance ?? 0) + amt;
      const res = await usersApi.update(user._id, { walletBalance: newBalance });
      if (res?.user) {
        setTopupSuccess("Wallet updated successfully.");
        onUpdateUser?.(res.user);
        setTimeout(() => {
          setShowTopup(false);
          setTopupAmount(1000);
          setTopupSuccess("");
        }, 900);
      } else {
        setTopupError("Failed to update wallet.");
      }
    } catch (err) {
      setTopupError(err.message || "Failed to add funds.");
    }
  };
  const activeItems = user?.isAdmin
    ? [
      { key: "stocks", label: "Stocks" },
      { key: "admin-dashboard", label: "Admin Dashboard" },
    ]
    : menuItems;

  return (
    <header className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900 px-4 py-4 text-slate-100 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-xl font-semibold">InvestPro</div>
        <div className="text-sm text-slate-400">
          {user ? `Signed in as ${user.name || user.mail || "Admin"}` : "Please sign in."}
        </div>
        {!user?.isAdmin && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-emerald-300">Wallet: {formatINR(user?.walletBalance ?? 0)}</div>
            <button
              type="button"
              onClick={() => setShowTopup(true)}
              className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Add Funds
            </button>
          </div>
        )}
      </div>

      {/* Top-up modal */}
      {showTopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-3xl bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100">Add Funds</h3>
            <p className="mt-2 text-sm text-slate-400">Enter amount to add to your wallet.</p>
            <div className="mt-4">
              <input
                type="number"
                min="1"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => { setShowTopup(false); setTopupAmount(1000); }}
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTopup}
                className="flex-1 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>
            {topupError && <div className="mt-3 text-sm text-rose-300">{topupError}</div>}
            {topupSuccess && <div className="mt-3 text-sm text-emerald-300">{topupSuccess}</div>}
          </div>
        </div>
      )}

      <nav className="flex flex-wrap gap-2">
        {activeItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectView(item.key)}
            className={`rounded-full border px-3 py-2 text-sm transition ${view === item.key
              ? "border-sky-500 bg-sky-500/10 text-sky-200"
              : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100"
              }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
      >
        Logout
      </button>
    </header>
  );
}
