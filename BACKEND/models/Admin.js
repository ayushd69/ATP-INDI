import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    mail: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    pass: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
