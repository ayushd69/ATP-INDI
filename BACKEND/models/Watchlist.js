import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    stocks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stock",
        },
    ],
}, {
    timestamps: true,
});

const Watchlist = mongoose.model("Watchlist", watchlistSchema);
export default Watchlist;
