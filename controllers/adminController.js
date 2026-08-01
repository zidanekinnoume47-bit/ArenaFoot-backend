const db =
require("../config/database");




// Voir tous les joueurs

exports.players=(req,res)=>{


db.query(

"SELECT id,name,pseudo,email,role FROM users",

(err,result)=>{


if(err)
return res.status(500).json(err);



res.json(result);


}

);


};






// Voir les tournois

exports.tournaments=(req,res)=>{


db.query(

"SELECT * FROM tournaments",

(err,result)=>{


if(err){

return res.status(500).json(err);

}


res.json(result);


}

);


};







// Valider un paiement

exports.validatePayment=(req,res)=>{


const id=req.params.id;



db.query(

`

UPDATE payments

SET status='success'

WHERE id=?

`,

[id],


(err)=>{


if(err){

return res.status(500).json(err);

}


res.json({

message:"Paiement validé"

});


}


);


};









// Créer des joueurs de test pour un tournoi

exports.createTestPlayers = (req,res)=>{


const tournament_id = req.params.id;



let created = 0;



for(let i = 1; i <= 15; i++){



const password =
"$2b$10$7EqJtq98hPqEX7fNZaFWoO4O5x4Yz9W5s6QJ7sV4vF6Jz1x9JQ2O6";



const user = {


name:`Test Player ${i}`,


pseudo:`TestPlayer${i}`,


email:`testplayer${i}@arenafont.com`,


phone:`970000${i}`,


efootball_id:`EFOOT${i}`,


password:password


};





db.query(

`

INSERT INTO users

(name,pseudo,email,phone,efootball_id,password)

VALUES(?,?,?,?,?,?)

`,

[

user.name,

user.pseudo,

user.email,

user.phone,

user.efootball_id,

user.password

],


(err,result)=>{



if(err){

console.log(err);

return res.status(500).json(err);

}





const player_id = result.insertId;





db.query(

`

INSERT INTO tournament_players

(tournament_id,player_id,user_id,payment_status)

VALUES(?,?,?,'paid')

`,

[

tournament_id,

player_id,

player_id

],



(err)=>{


if(err){

console.log(err);

return res.status(500).json(err);

}



created++;





if(created === 15){


res.json({

message:"15 joueurs de test ajoutés avec paiement validé 🏆"

});


}



}



);



}



);



}



};