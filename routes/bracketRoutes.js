const express = require("express");
const router = express.Router();

const matchController = require("../controllers/matchController");

router.post(
    "/generate/:id",
    matchController.generateMatches
);

router.get(
    "/:id",
    matchController.getBracket
);

router.put(
    "/finish",
    matchController.finishMatch
);

module.exports = router;