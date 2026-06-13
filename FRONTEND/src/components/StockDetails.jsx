import { useMemo } from "react";
import { formatINR } from "../utils/currency.js";

function buildChartData(stock) {
    if (!stock) {
        return [];
    }

    if (stock.priceHistory?.length > 1) {
        return stock.priceHistory.map((value) => value);
    }

    const price = stock.currentPrice || 0;
    const points = 24;
    const data = [price];
    let current = price;

    for (let i = 1; i < points; i += 1) {
        const change = (Math.random() - 0.5) * price * 0.02;
        current = Math.max(0, current + change);
        data.push(current);
    }

    return data;
}

function makeSvgPath(values, width, height, padding) {
    if (values.length === 0) return "";

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);
    const step = (width - padding * 2) / (values.length - 1);

    return values
        .map((value, index) => {
            const x = padding + index * step;
            const y = padding + ((max - value) / range) * (height - padding * 2);
            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
}

export default function StockDetails({ selectedStock, onBack }) {
    const chartData = useMemo(() => buildChartData(selectedStock), [selectedStock]);
    const path = useMemo(() => makeSvgPath(chartData, 720, 220, 20), [chartData]);
    const latest = chartData[chartData.length - 1] ?? 0;
    const first = chartData[0] ?? 0;
    const gain = latest - first;
    const gainLabel = gain >= 0 ? `+${formatINR(gain)}` : formatINR(gain);

    if (!selectedStock) {
        return (
            <section className="space-y-4 p-6">
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-300">
                    <div className="text-lg font-semibold text-slate-100">No stock selected.</div>
                    <p className="mt-2 text-slate-400">Please choose a stock from the Stocks page.</p>
                    <button
                        type="button"
                        onClick={onBack}
                        className="mt-6 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                    >
                        Back to Stocks
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-6 p-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{selectedStock.symbol}</p>
                    <h1 className="mt-2 text-3xl font-semibold text-slate-100">{selectedStock.companyName}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">Detailed stock information, price history, and quick trade actions for the selected security.</p>
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                    Back to Stocks
                </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="text-sm text-slate-400">Current Price</div>
                            <div className="mt-2 text-4xl font-semibold text-slate-100">{formatINR(selectedStock.currentPrice)}</div>
                        </div>
                        <div className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-300">
                            {gainLabel} ({first ? ((gain / first) * 100).toFixed(2) : "0.00"}%)
                        </div>
                    </div>

                    <div className="h-64 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                        <svg viewBox="0 0 720 220" className="h-full w-full">
                            <defs>
                                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={path} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" />
                            <path d={`${path} L 700 200 L 20 200 Z`} fill="url(#chartGradient)" opacity="0.35" />
                        </svg>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                        <h2 className="text-xl font-semibold text-slate-100">Stock Snapshot</h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {[
                                { label: "Sector", value: selectedStock.sector },
                                { label: "Market Cap", value: selectedStock.marketCap?.replace("$", "₹") },
                                { label: "52W High", value: formatINR(selectedStock.week52High) },
                                { label: "52W Low", value: formatINR(selectedStock.week52Low) },
                                { label: "P/E Ratio", value: selectedStock.peRatio },
                                { label: "Dividend Yield", value: selectedStock.dividendYield },
                            ].map((item) => (
                                <div key={item.label} className="rounded-3xl bg-slate-900/80 p-4 text-slate-200">
                                    <div className="text-sm text-slate-400">{item.label}</div>
                                    <div className="mt-2 text-lg font-semibold text-slate-100">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                        <h2 className="text-xl font-semibold text-slate-100">Trade Summary</h2>
                        <div className="mt-6 space-y-4 text-sm text-slate-300">
                            <p><span className="font-semibold text-slate-100">Price change:</span> {selectedStock.priceChange >= 0 ? "+" : ""}{formatINR(selectedStock.priceChange)}</p>
                            <p><span className="font-semibold text-slate-100">Volume:</span> {selectedStock.volume?.toLocaleString()}</p>
                            <p><span className="font-semibold text-slate-100">52-week range:</span> {formatINR(selectedStock.week52Low)} - {formatINR(selectedStock.week52High)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
