const express = require("express");

const router = express.Router();

const settingController = require("../controllers/settingController");
const adminAuth = require("../middleware/adminAuth");

// ==========================================
// 🌍 PARAMÈTRES PUBLICS
// ==========================================

router.get(
    "/",
    settingController.getSettings
);


// ==========================================
// 🔒 MODIFICATION RÉSERVÉE À L'ADMIN
// ==========================================

router.put(
    "/",
    adminAuth,
    settingController.updateSettings
);


module.exports = router;