import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    walletBalance: {
        type: Number,
        default: 100000,
    },
    portfolio: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Portfolio",
        },
    ],
}, {
    timestamps: true,
});

const User = mongoose.model("User", userSchema);
export default User;
