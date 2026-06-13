import express from "express";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";

const adminApp = express.Router();

// Market state variables
let marketState = {
    active: true,
    volatility: 2,
    lastUpdate: new Date(),
};

adminApp.post("/register", async (req, res) => {
    try {
        const { mail, pass } = req.body;
        if (!mail || !pass) {
            return res.status(400).json({ message: "Mail and pass are required." });
        }

        const existingAdmin = await Admin.findOne({ mail });
        if (existingAdmin) {
            return res.status(409).json({ message: "Admin already exists." });
        }

        const hashed = await bcrypt.hash(pass, 10);
        const admin = await Admin.create({ mail, pass: hashed });
        const result = admin.toObject();
        delete result.pass;
        result.isAdmin = true;
        result.name = "Admin";
        res.status(201).json({ message: "Admin created", admin: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

adminApp.post("/login", async (req, res) => {
    try {
        const { mail, pass } = req.body;
        if (!mail || !pass) {
            return res.status(400).json({ message: "Mail and pass are required." });
        }

        const admin = await Admin.findOne({ mail });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        const isValid = await bcrypt.compare(pass, admin.pass);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const result = admin.toObject();
        delete result.pass;
        result.isAdmin = true;
        result.name = "Admin";
        res.json({ message: "Admin login successful", admin: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Market state endpoints
adminApp.get("/market/state", (req, res) => {
    res.json(marketState);
});

adminApp.post("/market/toggle", (req, res) => {
    const { active } = req.body;
    marketState.active = active !== undefined ? active : !marketState.active;
    res.json({ message: "Market state updated", marketState });
});

adminApp.post("/market/volatility", (req, res) => {
    const { volatility } = req.body;
    if (volatility && volatility >= 1 && volatility <= 10) {
        marketState.volatility = volatility;
        res.json({ message: "Volatility updated", marketState });
    } else {
        res.status(400).json({ message: "Volatility must be between 1 and 10" });
    }
});

export default adminApp;
