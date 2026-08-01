const express = require("express");

const router = express.Router();


const adminController =
require("../controllers/adminController");

const adminAuth =
require("../middleware/adminAuth");

console.log("ADMIN CONTROLLER :", adminController);
console.log("ADMIN AUTH :", adminAuth);

router.get(
"/players",
adminAuth,
adminController.players
);



router.get(
"/tournaments",
adminAuth,
adminController.tournaments
);



router.put(
"/payment/:id",
adminAuth,
adminController.validatePayment
);



// Création temporaire de joueurs de test
router.post(
"/test-players/:id",
adminAuth,
adminController.createTestPlayers
);



module.exports = router;