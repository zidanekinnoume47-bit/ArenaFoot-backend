const express = require("express");
const router = express.Router();

const matchController = require("../controllers/matchController");
const adminAuth = require("../middleware/adminAuth");


// Générer les matchs d'un tournoi
router.post(
  "/generate/:id",
  adminAuth,
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
adminAuth,
matchController.getAllMatches
);

router.get(
"/player/:id/next",
matchController.getPlayerNextMatch
);

router.post(
  "/finish",
  adminAuth,
  matchController.finishMatch
);




module.exports = router;