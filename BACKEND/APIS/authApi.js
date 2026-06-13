import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const authApp = express.Router();

const sanitizeUser = (user) => {
    const object = user?.toObject ? user.toObject() : user;
    if (object?.password) delete object.password;
    return object;
};

authApp.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already in use." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, walletBalance: 100000 });
        const result = sanitizeUser(user);

        res.status(201).json({ message: "User registered successfully", user: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

authApp.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        res.json({ message: "Login successful", user: sanitizeUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default authApp;
