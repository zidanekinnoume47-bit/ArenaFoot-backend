const express = require("express");
const router = express.Router();

const rewardController = require("../controllers/rewardController");


router.post(
"/create",
rewardController.createReward
);


router.post(
"/send/:id",
rewardController.sendReward
);


module.exports = router;