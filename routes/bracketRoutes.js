const express = require("express");
const router = express.Router();
console.log("BRACKET ROUTES CHARGEES");

const bracketController = require("../controllers/bracketController");


router.post(
  "/generate/:id",
  (req, res, next) => {
    console.log("Route generate appelée");
    next();
  },
  bracketController.generateMatches
);

router.get(
  "/:id",
  bracketController.getBracket
);

router.put(
  "/finish",
  bracketController.finishMatch
);


module.exports = router;