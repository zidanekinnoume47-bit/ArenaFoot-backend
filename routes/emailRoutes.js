const express = require("express");
const router = express.Router();

const emailController = require("../controllers/emailController");

router.post(
    "/send-code",
    emailController.sendVerificationCode
);

module.exports = router;