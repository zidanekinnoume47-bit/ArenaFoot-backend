const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");
const rewardController = require("../controllers/rewardController");


// ==========================================
// 🔐 AUTHENTIFICATION ADMIN
// Ces routes NE doivent PAS avoir adminAuth
// ==========================================

router.post(
  "/login",
  adminController.login
);

router.post(
  "/forgot-password",
  adminController.forgotPassword
);

router.post(
  "/verify-reset-code",
  adminController.verifyResetCode
);

router.post(
  "/reset-password",
  adminController.resetPassword
);


// ==========================================
// 🔒 ROUTES ADMIN PROTÉGÉES
// ==========================================

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

router.get(
  "/payments",
  adminAuth,
  adminController.getPayments
);

router.post(
  "/test-players/:id",
  adminAuth,
  adminController.createTestPlayers
);

router.post(
  "/tournament/:id/generate-bracket",
  adminAuth,
  adminController.generateBracket
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

router.get(
  "/rewards",
  adminAuth,
  adminController.getRewards
);

router.put(
  "/reward/:id",
  adminAuth,
  rewardController.sendReward
);


module.exports = router;