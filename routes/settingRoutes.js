const express = require("express");

const router = express.Router();

const settingController = require("../controllers/settingController");

// Lire les paramètres
router.get("/", settingController.getSettings);

// Modifier les paramètres
router.put("/", settingController.updateSettings);

module.exports = router;