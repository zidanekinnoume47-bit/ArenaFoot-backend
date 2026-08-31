const express = require("express");

const router = express.Router();

const roomController =
    require("../controllers/roomController");

const auth =
    require("../middleware/auth");


// ==========================================
// 🔐 CRÉER UNE SALLE
// Utilisateur connecté obligatoire
// ==========================================

router.post(
    "/create",
    auth,
    roomController.createRoom
);


// ==========================================
// 🔐 AJOUTER LE CODE DE SALLE
// Utilisateur connecté obligatoire
// ==========================================

router.put(
    "/code",
    auth,
    roomController.addCode
);


// ==========================================
// 🔐 VOIR UNE SALLE
// ==========================================

router.get(
    "/:id",
    auth,
    roomController.getRoom
);


// ==========================================
// 🔐 VOIR LES SALLES
// ==========================================

router.get(
    "/",
    auth,
    roomController.getAllRooms
);


module.exports = router;