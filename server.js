require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000
}));

app.use(express.json());

// =======================
// Routes
// =======================

const userRoutes = require("./routes/userRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const matchRoutes = require("./routes/matchRoutes");
const roomRoutes = require("./routes/roomRoutes");
const adminRoutes = require("./routes/adminRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const mobilePaymentRoutes = require("./routes/mobileRoutes");
const bracketRoutes = require("./routes/bracketRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const settingRoutes = require("./routes/settingRoutes");

console.log("userRoutes :", typeof userRoutes);
console.log("tournamentRoutes :", typeof tournamentRoutes);
console.log("paymentRoutes :", typeof paymentRoutes);
console.log("matchRoutes :", typeof matchRoutes);
console.log("roomRoutes :", typeof roomRoutes);
console.log("adminRoutes :", typeof adminRoutes);
console.log("rewardRoutes :", typeof rewardRoutes);
console.log("mobilePaymentRoutes :", typeof mobilePaymentRoutes);
console.log("bracketRoutes :", typeof bracketRoutes);
console.log("rankingRoutes :", typeof rankingRoutes);

// =======================
// Accueil API
// =======================

app.get("/", (req, res) => {
    res.json({
        message: "Bienvenue sur ArenaFoot API"
    });
});

// =======================
// Retour FedaPay
// =======================

app.get("/payment-success", (req, res) => {

    console.log("Retour FedaPay :", req.query);

    const { status, id } = req.query;

    res.redirect(
        `http://localhost:5173/dashboard?status=${status}&transaction=${id}`
    );

});

// =======================
// Routes API
// =======================

console.log("CHARGEMENT USERS");
app.use("/api/users", userRoutes);

console.log("CHARGEMENT TOURNAMENTS");
app.use("/api/tournaments", tournamentRoutes);

console.log("CHARGEMENT PAYMENTS");
app.use("/api/payments", paymentRoutes);

console.log("CHARGEMENT MATCHES");
app.use("/api/matches", matchRoutes);

console.log("CHARGEMENT ROOMS");
app.use("/api/rooms", roomRoutes);

console.log("CHARGEMENT ADMIN");
app.use("/api/admin", adminRoutes);

console.log("CHARGEMENT REWARDS");
app.use("/api/rewards", rewardRoutes);

console.log("CHARGEMENT MOBILE");
app.use("/api/mobile-payment", mobilePaymentRoutes);

console.log("CHARGEMENT BRACKET");
app.use("/api/bracket", bracketRoutes);

console.log("CHARGEMENT RANKING");
app.use("/api/ranking", rankingRoutes);

console.log("CHARGEMENT SETTINGS");
app.use("/api/settings", settingRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});