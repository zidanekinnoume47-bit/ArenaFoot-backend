const express = require("express");

const router = express.Router();

const paymentController =
    require("../controllers/paymentController");

const auth =
    require("../middleware/auth");


// ==========================================
// 🔐 CRÉER UN PAIEMENT
// Utilisateur connecté obligatoire
// ==========================================

router.post(
    "/create",
    auth,
    paymentController.createPayment
);


// ==========================================
// 🔒 VALIDATION MANUELLE
// Actuellement désactivée dans le controller
// ==========================================

router.post(
    "/validate",
    auth,
    paymentController.validatePayment
);


// ==========================================
// 🔔 WEBHOOK FEDAPAY
// NE PAS mettre auth ici
// FedaPay appelle directement cette route
// ==========================================

router.post(
    "/webhook",
    paymentController.webhook
);


module.exports = router;