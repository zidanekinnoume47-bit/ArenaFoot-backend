const express = require("express");

const router = express.Router();

const settingController = require("../controllers/settingController");
const adminAuth = require("../middleware/adminAuth");

// Lire les paramètres
router.get(
    "/",
    settingController.getSettings
);

// Modifier les paramètres
router.put(
    "/",
    adminAuth,
    settingController.updateSettings
);

module.exports = router;