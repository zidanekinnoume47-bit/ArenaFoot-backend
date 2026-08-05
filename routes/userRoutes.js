const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

router.post("/register", userController.register);

router.post("/login", userController.login);

router.get("/ranking", userController.getRanking);

router.get("/:id", userController.getUser);

router.get("/profile/:id", userController.getProfile);

module.exports = router;