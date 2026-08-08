const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

router.post("/register", userController.register);

router.post("/login", userController.login);

router.get("/ranking", userController.getRanking);

router.get("/:id", userController.getUser);

router.get("/profile/:id", userController.getProfile);

router.post(
    "/verify-email",
    userController.verifyEmail
);

// ==========================================
// MOT DE PASSE OUBLIÉ
// ==========================================

router.post(
    "/forgot-password",
    userController.forgotPassword
);

router.post(
    "/verify-reset-code",
    userController.verifyResetCode
);

router.post(
    "/reset-password",
    userController.resetPassword
);

module.exports = router;