import http from "http";
import { Server } from "socket.io";
import { stockData, updateStockPrices } from "./liveStockData.js";
import Stock from "./models/Stock.js";
import mongoose from "mongoose";
import { config } from "./config.js";
import bcrypt from "bcrypt";
import app from "./index.js";
import Admin from "./models/Admin.js";
import OrderMatchingEngine from "./matchingEngine.js";

const PORT = config.PORT;
const MONGODB_URI = config.MONGODB_URI;

const normalizeOrigin = (value) => {
    if (!value) return null;
    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) return null;
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return normalized.toLowerCase();
};

const parseOrigins = (value) => {
    if (!value) return [];
    return value
        .split(",")
        .map((item) => normalizeOrigin(item))
        .filter(Boolean);
};

const allowedOrigins = Array.from(
    new Set([
        ...parseOrigins(config.FRONTEND_URL),
        ...parseOrigins(process.env.FRONTEND_URL),
        ...parseOrigins(process.env.VITE_API_BASE),
    ])
);

console.log("Socket.IO CORS allowed origins:", allowedOrigins);

const ensureAdmin = async () => {
    const mail = (config.ADMIN_EMAIL || "admine@gmail.com").trim().toLowerCase();
    const pass = config.ADMIN_PASSWORD || "admine123";

    const hashed = await bcrypt.hash(pass, 10);
    await Admin.findOneAndUpdate(
        { mail },
        { mail, pass: hashed },
        { upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`Admin account ensured: ${mail}`);
};

const syncStockDataToDatabase = async () => {
    try {
        const bulkOps = stockData.map((s) => ({
            updateOne: {
                filter: { symbol: s.symbol },
                update: {
                    $set: {
                        companyName: s.companyName,
                        currentPrice: s.currentPrice,
                        priceChange: s.priceChange ?? 0,
                        volume: s.volume ?? 0,
                    },
                },
                upsert: true,
            },
        }));

        if (bulkOps.length > 0) {
            await Stock.bulkWrite(bulkOps, { ordered: false });
        }
    } catch (syncErr) {
        console.error("Failed to sync live stockData to DB:", syncErr);
    }
};

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    },
});

// Market state
let marketState = {
    active: true,
    volatility: 2,
};

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.emit("stockData", stockData);
    socket.emit("marketState", marketState);

    // Admin controls for market simulation
    socket.on("marketToggle", (data) => {
        marketState.active = data.active;
        io.emit("marketState", marketState);
        console.log(`Market toggled to: ${marketState.active ? "OPEN" : "CLOSED"}`);
    });

    socket.on("setVolatility", (data) => {
        if (data.volatility >= 1 && data.volatility <= 10) {
            marketState.volatility = data.volatility;
            io.emit("marketState", marketState);
            console.log(`Volatility set to: ${marketState.volatility}%`);
        }
    });

    socket.on("updatePrices", async () => {
        updateStockPrices(marketState.volatility);
        io.emit("stockUpdate", stockData);
        await syncStockDataToDatabase();
        try {
            const results = await OrderMatchingEngine.matchAllPendingOrders();
            const totalMatches = results.reduce((sum, r) => sum + r.matched, 0);
            if (totalMatches > 0) {
                console.log(`[Matching Engine] Matched ${totalMatches} trades after manual price update`);
            }
        } catch (error) {
            console.error("[Matching Engine] Error after manual price update:", error);
        }
        console.log("Prices manually updated by admin");
    });

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

mongoose
    .connect(MONGODB_URI)
    .then(async () => {
        console.log(`MongoDB connected to ${MONGODB_URI}`);
        await ensureAdmin();
        // Ensure built-in live stocks exist in the database (persist them)
        try {
            const bulkOps = stockData.map((s) => ({
                updateOne: {
                    filter: { symbol: s.symbol },
                    update: {
                        $set: {
                            companyName: s.companyName,
                            currentPrice: s.currentPrice,
                            priceChange: s.priceChange ?? 0,
                            volume: s.volume ?? 0,
                        },
                    },
                    upsert: true,
                },
            }));

            if (bulkOps.length > 0) {
                await Stock.bulkWrite(bulkOps, { ordered: false });
            }
            console.log("Live stockData synced to MongoDB.");
        } catch (syncErr) {
            console.error("Failed to sync live stockData to DB:", syncErr);
        }
        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });

        setInterval(async () => {
            updateStockPrices(marketState.volatility);
            io.emit("stockUpdate", stockData);
            await syncStockDataToDatabase();
        }, 3000);

        // Run order matching engine every 5 seconds
        setInterval(async () => {
            try {
                const results = await OrderMatchingEngine.matchAllPendingOrders();
                const totalMatches = results.reduce((sum, r) => sum + r.matched, 0);
                if (totalMatches > 0) {
                    console.log(`[Matching Engine] Matched ${totalMatches} trades`);
                }
            } catch (error) {
                console.error("[Matching Engine] Error:", error);
            }
        }, 5000);
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });
