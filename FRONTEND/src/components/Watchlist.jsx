import { useMemo } from "react";
import { getWatchlist } from "./sampleStockData.js";
import { formatINR } from "../utils/currency.js";

export default function Watchlist({ userId, stocks = [], onSelectStock }) {
    const watchlist = useMemo(() => (userId ? getWatchlist(userId) : []), [userId]);

    const liveWatchlist = useMemo(() => {
        return watchlist.map((stock) => {
            const latest = stocks.find((item) => item.symbol === stock.symbol);
            return latest ? { ...stock, ...latest } : stock;
        });
    }, [stocks, watchlist]);

    return (
        <section className="space-y-4 p-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                <h2 className="mb-4 text-2xl font-semibold text-slate-100">Watchlist</h2>
                {!userId ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-slate-400">
                        Please log in to see your watchlist.
                    </div>
                ) : !watchlist || watchlist.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-slate-400">
                        No watchlist items found. Add stocks from the Stocks view.
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {liveWatchlist.map((stock) => (
                            <li
                                key={stock.symbol}
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelectStock?.(stock)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        onSelectStock?.(stock);
                                    }
                                }}
                                className="cursor-pointer rounded-3xl border border-slate-800 bg-slate-900 p-4 text-slate-200 shadow-sm transition hover:border-sky-500 hover:bg-slate-950"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-lg font-semibold">{stock.symbol}</div>
                                        <div className="text-sm text-slate-400">{stock.companyName}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-slate-100">{formatINR(stock.currentPrice)}</div>
                                        <div className="text-sm text-slate-400">Volume {stock.volume ?? 0}</div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
