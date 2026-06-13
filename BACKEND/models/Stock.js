import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    companyName: {
        type: String,
        required: true,
        trim: true,
    },
    currentPrice: {
        type: Number,
        required: true,
    },
    priceChange: {
        type: Number,
        default: 0,
    },
    volume: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

const Stock = mongoose.model("Stock", stockSchema);
export default Stock;
