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

const getBody = (req) => req.body || {};

const createAdmin = async (mail, pass) => {
    const hashed = await bcrypt.hash(pass, 10);
    const admin = await Admin.findOneAndUpdate(
        { mail },
        { mail, pass: hashed },
        { upsert: true, setDefaultsOnInsert: true, new: true }
    );
    return admin;
};

adminApp.post("/register", async (req, res) => {
    try {
        const body = getBody(req);
        const mail = (body.mail ?? body.email)?.trim?.().toLowerCase();
        const pass = body.pass ?? body.password;
        if (!mail || !pass) {
            return res.status(400).json({ message: "Mail and pass are required." });
        }

        const existingAdmin = await Admin.findOne({ mail });
        if (existingAdmin) {
            return res.status(409).json({ message: "Admin already exists." });
        }

        const admin = await createAdmin(mail, pass);
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
        const body = getBody(req);
        const mail = (body.mail ?? body.email)?.trim?.().toLowerCase();
        const pass = body.pass ?? body.password;
        if (!mail || !pass) {
            return res.status(400).json({ message: "Mail and pass are required." });
        }

        let admin = await Admin.findOne({ mail });
        if (!admin) {
            const defaultMail = (config.ADMIN_EMAIL || "").trim().toLowerCase();
            const defaultPass = config.ADMIN_PASSWORD || "";
            if (defaultMail && mail === defaultMail && defaultPass) {
                admin = await createAdmin(defaultMail, defaultPass);
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
