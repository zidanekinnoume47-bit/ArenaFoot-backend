const express = require("express");
const router = express.Router();

const tournamentController = require("../controllers/tournamentController");

// 1. Créer un tournoi
router.post("/create", tournamentController.createTournament);

// 2. Afficher tous les tournois
router.get("/", tournamentController.getTournaments);

// 3. Inscription à un tournoi
router.post("/join", tournamentController.joinTournament);

// 4. Tournois d'un joueur
router.get("/player/:id", tournamentController.getPlayerTournaments);

// 5. Participants d'un tournoi
router.get("/:id/players", tournamentController.getTournamentPlayers);

// 6. Arbre des matchs / Bracket d'un tournoi (Route Publique)
router.get("/:id/bracket", tournamentController.getBracket);

// 7. Détail d'un tournoi spécifique (Doit être en dernier car /:id attrape tout)
router.get("/:id", tournamentController.getTournament);

module.exports = router;