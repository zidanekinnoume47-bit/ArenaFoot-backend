const express = require("express");

const router = express.Router();


const roomController =
require("../controllers/roomController");



router.post(
"/create",
roomController.createRoom
);



router.put(
"/code",
roomController.addCode
);



router.get(
"/:id",
roomController.getRoom
);


router.get(
"/",
roomController.getAllRooms
);


module.exports = router;