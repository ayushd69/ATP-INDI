export const stockData = [
    {
        symbol: "ADANIENT",
        companyName: "Adani Enterprises Ltd.",
        sector: "Energy",
        currentPrice: 3734.22,
        priceChange: -3.45,
        volume: 1823400,
        marketCap: "$180B",
        week52High: 3890.5,
        week52Low: 3050.2,
        peRatio: 22.3,
        dividendYield: "0.25%",
    },
    {
        symbol: "ONGC",
        companyName: "Oil & Natural Gas Corp.",
        sector: "Energy",
        currentPrice: 1236.46,
        priceChange: -0.79,
        volume: 2546700,
        marketCap: "$87B",
        week52High: 1305.8,
        week52Low: 1040.2,
        peRatio: 18.1,
        dividendYield: "1.12%",
    },
    {
        symbol: "NTPC",
        companyName: "NTPC Limited",
        sector: "Utilities",
        currentPrice: 1150.61,
        priceChange: 2.37,
        volume: 1324500,
        marketCap: "$91B",
        week52High: 1205.3,
        week52Low: 980.6,
        peRatio: 17.8,
        dividendYield: "1.40%",
    },
    {
        symbol: "TCS",
        companyName: "Tata Consultancy Services Ltd.",
        sector: "Technology",
        currentPrice: 3478.5,
        priceChange: 12.25,
        volume: 1897000,
        marketCap: "$215B",
        week52High: 3580.4,
        week52Low: 2850.0,
        peRatio: 29.6,
        dividendYield: "1.08%",
    },
    {
        symbol: "INFY",
        companyName: "Infosys Ltd.",
        sector: "Technology",
        currentPrice: 1680.1,
        priceChange: -4.1,
        volume: 1589300,
        marketCap: "$94B",
        week52High: 1750.2,
        week52Low: 1380.7,
        peRatio: 24.2,
        dividendYield: "1.05%",
    },
    {
        symbol: "RELIANCE",
        companyName: "Reliance Industries Ltd.",
        sector: "Conglomerate",
        currentPrice: 2602.8,
        priceChange: 8.4,
        volume: 3051200,
        marketCap: "$230B",
        week52High: 2675.0,
        week52Low: 2190.4,
        peRatio: 32.1,
        dividendYield: "0.63%",
    },
    {
        symbol: "HDFCBANK",
        companyName: "HDFC Bank Ltd.",
        sector: "Financial",
        currentPrice: 1547.7,
        priceChange: 5.75,
        volume: 2754000,
        marketCap: "$133B",
        week52High: 1575.5,
        week52Low: 1230.3,
        peRatio: 21.4,
        dividendYield: "0.84%",
    },
    {
        symbol: "SBI",
        companyName: "State Bank of India",
        sector: "Financial",
        currentPrice: 690.55,
        priceChange: -2.15,
        volume: 4912000,
        marketCap: "$75B",
        week52High: 720.0,
        week52Low: 540.8,
        peRatio: 12.8,
        dividendYield: "1.62%",
    },
];

export const addStock = (stock) => {
    if (!stock || !stock.symbol) return;
    if (stockData.some((item) => item.symbol === stock.symbol)) return;
    stockData.push({
        ...stock,
        symbol: stock.symbol.toUpperCase(),
        priceChange: stock.priceChange ?? 0,
        volume: stock.volume ?? 0,
        currentPrice: stock.currentPrice ?? 0,
    });
};

export const updateStockPrices = (volatilityPercent = 2) => {
    const volatility = volatilityPercent / 100;
    stockData.forEach((stock) => {
        const priceChange = Number(((Math.random() * 2 - 1) * volatility * stock.currentPrice).toFixed(2));
        stock.currentPrice = Math.max(1, Number((stock.currentPrice + priceChange).toFixed(2)));
        stock.currentPrice = Math.min(stock.currentPrice, 10000);
        stock.priceChange = priceChange;
        stock.volume = Math.max(0, stock.volume + Math.round(Math.random() * 1200 - 600));
        stock.lastUpdated = new Date().toISOString();
    });
};
