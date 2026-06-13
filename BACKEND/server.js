import http from "http";
import { Server } from "socket.io";
import { stockData, updateStockPrices } from "./liveStockData.js";
import Stock from "./models/Stock.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import app from "./index.js";
import Admin from "./models/Admin.js";
import OrderMatchingEngine from "./matchingEngine.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ind_pro";


const ensureAdmin = async () => {
    const mail = process.env.ADMIN_EMAIL || "admine@gmail.com";
    const pass = process.env.ADMIN_PASSWORD || "admine123";

    const existingAdmin = await Admin.findOne({ mail });
    if (existingAdmin) {
        console.log(`Admin already exists: ${mail}`);
        return;
    }

    const hashed = await bcrypt.hash(pass, 10);
    await Admin.create({ mail, pass: hashed });
    console.log(`Admin account created: ${mail}`);
};

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST"],
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

    socket.on("updatePrices", () => {
        updateStockPrices(marketState.volatility);
        io.emit("stockUpdate", stockData);
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
            for (const s of stockData) {
                await Stock.findOneAndUpdate(
                    { symbol: s.symbol },
                    {
                        $set: {
                            companyName: s.companyName,
                            currentPrice: s.currentPrice,
                            priceChange: s.priceChange ?? 0,
                            volume: s.volume ?? 0,
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
            console.log("Live stockData synced to MongoDB.");
        } catch (syncErr) {
            console.error("Failed to sync live stockData to DB:", syncErr);
        }
        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });

        setInterval(() => {
            updateStockPrices(marketState.volatility);
            io.emit("stockUpdate", stockData);
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
