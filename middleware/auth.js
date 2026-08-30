const express = require("express");
const router = express.Router();

const tournamentController = require("../controllers/tournamentController");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

// ==========================================
// 🌍 ROUTES PUBLIQUES
// ==========================================

// Afficher tous les tournois
router.get(
    "/",
    tournamentController.getTournaments
);

// Détail d'un tournoi
router.get(
    "/:id",
    tournamentController.getTournament
);

// Participants d'un tournoi
router.get(
    "/:id/players",
    tournamentController.getTournamentPlayers
);

// Bracket public
router.get(
    "/:id/bracket",
    tournamentController.getBracket
);


// ==========================================
// 🔐 ROUTES UTILISATEUR CONNECTÉ
// ==========================================

// Inscription à un tournoi
router.post(
    "/join",
    auth,
    tournamentController.joinTournament
);

// Tournois du joueur connecté
router.get(
    "/player/:id",
    auth,
    tournamentController.getPlayerTournaments
);


// ==========================================
// 👑 ROUTES ADMIN
// ==========================================

// Créer un tournoi
router.post(
    "/create",
    adminAuth,
    tournamentController.createTournament
);


module.exports = router;