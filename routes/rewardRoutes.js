const express = require("express");
const router = express.Router();

const rewardController = require("../controllers/rewardController");
const adminAuth = require("../middleware/adminAuth");


// ==========================================
// Créer une récompense
// ADMIN UNIQUEMENT
// ==========================================

router.post(
    "/create",
    adminAuth,
    rewardController.createReward
);


// ==========================================
// Envoyer une récompense
// ADMIN UNIQUEMENT
// ==========================================

router.post(
    "/send/:id",
    adminAuth,
    rewardController.sendReward
);


module.exports = router;