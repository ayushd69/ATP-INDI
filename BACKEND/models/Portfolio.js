import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    stockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    avgBuyPrice: {
        type: Number,
        required: true,
        min: 0,
    },
}, {
    timestamps: true,
});

portfolioSchema.index({ userId: 1, stockId: 1 });

const Portfolio = mongoose.model("Portfolio", portfolioSchema);
export default Portfolio;
