import express from "express";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import { config } from "../config.js";

const adminApp = express.Router();

// Market state variables
let marketState = {
    active: true,
    volatility: 2,
    lastUpdate: new Date(),
};

adminApp.post("/register", async (req, res) => {
    try {
        const mail = req.body.mail?.trim().toLowerCase();
        const pass = req.body.pass;
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
        // Accept either `mail`/`pass` (frontend) or `email`/`password`
        const mail = (req.body.mail ?? req.body.email)?.trim?.().toLowerCase();
        const pass = req.body.pass ?? req.body.password;
        if (!mail || !pass) {
            return res.status(400).json({ message: "Mail and pass are required." });
        }

        let admin = await Admin.findOne({ mail });
        // If admin not found, try to auto-seed the default admin for local setups
        if (!admin) {
            const defaultMail = (config.ADMIN_EMAIL || "").trim().toLowerCase();
            const defaultPass = config.ADMIN_PASSWORD || "";
            if (defaultMail && mail === defaultMail && defaultPass) {
                const hashed = await bcrypt.hash(defaultPass, 10);
                admin = await Admin.create({ mail: defaultMail, pass: hashed });
                console.log("Auto-seeded default admin:", defaultMail);
            }
        }

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
