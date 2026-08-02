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
    "/player/:id",
    adminAuth,
    adminController.getPlayer
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

router.put(
    "/ban/:id",
    adminAuth,
    adminController.banPlayer
);

router.delete(
    "/tournament/:id",
    adminAuth,
    adminController.deleteTournament
);

router.get(
    "/tournament/:id/players",
    adminAuth,
    adminController.getTournamentPlayers
);

router.delete(
    "/player/:id",
    adminAuth,
    adminController.deletePlayer
);

module.exports = router;