const Reward =
require("../models/Reward");



exports.createReward=(req,res)=>{


Reward.create(

req.body,

(err,result)=>{


if(err){

return res.status(500).json({

message:"Erreur récompense"

});

}


res.json({

message:"Récompense créée",

id:result.insertId

});


}

);


};



exports.sendReward = (req,res)=>{

const id = req.params.id;


Reward.updateStatus(
id,
"sent",
(err)=>{

if(err){

return res.status(500).json({
message:"Erreur validation récompense"
});

}


res.json({

message:"Récompense envoyée avec succès",
status:"sent"

});


}

);


};