const express = require("express");

const router = express.Router();


const paymentController =
require("../controllers/paymentController");



router.post(
"/create",
paymentController.createPayment
);



router.post(
"/validate",
paymentController.validatePayment
);



// Webhook FedaPay
router.post(
"/webhook",
paymentController.webhook
);



module.exports = router;