const express = require("express");
const router = express.Router();

const tournamentController = require("../controllers/tournamentController");

// 1. Créer un tournoi
router.post("/create", tournamentController.createTournament);

// 2. Afficher tous les tournois
router.get("/", tournamentController.getTournaments);

// 3. Inscription à un tournoi
router.post("/join", tournamentController.joinTournament);

router.get(
"/player/:id",
tournamentController.getPlayerTournaments
);

router.get("/:id/players", tournamentController.getTournamentPlayers);

// 5. Détail d'un tournoi spécifique (Doit être en dernier car /:id attrape tout)
router.get("/:id", tournamentController.getTournament);



module.exports = router;