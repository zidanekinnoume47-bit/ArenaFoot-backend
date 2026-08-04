const express = require("express");
const router = express.Router();

const matchController = require("../controllers/matchController");
const bracketController = require("../controllers/bracketController");


// Générer les matchs d'un tournoi
router.post(
  "/generate/:id",
  matchController.generateMatches
);

router.get(
  "/generate/:id",
  matchController.generateMatches
);

// Récupérer les matchs d'un tournoi
router.get(
  "/tournament/:id",
  matchController.getTournamentMatches
);


// Récupérer le bracket complet d'un tournoi
router.get(
  "/bracket/:id",
  matchController.getBracket
);


router.get(
"/",
matchController.getAllMatches
);

router.get(
"/player/:id/next",
matchController.getPlayerNextMatch
);

router.post(
"/finish",
matchController.finishMatch
);


module.exports = router;