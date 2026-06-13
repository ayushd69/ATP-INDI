import dotenv from "dotenv";
dotenv.config();

export const config = {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/ind_pro",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173,https://atp-indi-frontend.vercel.app",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admine@gmail.com",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admine123",
};
