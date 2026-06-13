import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
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
    orderType: {
        type: String,
        enum: ["BUY", "SELL"],
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ["PENDING", "COMPLETED", "CANCELLED"],
        default: "PENDING",
    },
}, {
    timestamps: true,
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
