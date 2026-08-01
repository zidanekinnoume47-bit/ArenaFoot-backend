const Room = require("../models/Room");



// Création d'une salle

exports.createRoom=(req,res)=>{


Room.create(

req.body,

(err,result)=>{


if(err){

return res.status(500).json({
message:"Erreur création salle"
});

}


res.json({

message:"Salle créée",

room_id:result.insertId

});


}

);


};




// Ajouter le code eFootball

exports.addCode=(req,res)=>{


Room.addCode(

req.body,

(err)=>{


if(err){

return res.status(500).json(err);

}



res.json({

message:"Code ajouté"

});


}

);


};





// Voir la salle

exports.getRoom=(req,res)=>{


Room.getRoom(

req.params.id,

(err,result)=>{


res.json(result[0]);


}

);


};