const express = require("express");

const router = express.Router();


const controller =
require("../controllers/mobilePaymentController");



router.post(

"/pay",

controller.pay

);



module.exports = router;