const Payment = require("../models/Payment");
const TournamentPlayer = require("../models/TournamentPlayer");
const FedaPay = require("../config/fedapay");
const MatchController = require("./matchController");
const Tournament = require("../models/Tournament");
const db = require("../config/database");





// ==================================
// Générer le bracket automatiquement
// ==================================

const generateBracket = (tournament_id) => {

return new Promise((resolve,reject)=>{


const req = {

params:{
id:tournament_id
}

};



const res = {

json:(data)=>{

resolve(data);

},


status:(code)=>{

return {

json:(data)=>{

reject(data);

}

};

}

};



MatchController.generateMatches(req,res);



});

};

// ==================================
// Créer un paiement FedaPay
// ==================================

exports.createPayment = async (req,res)=>{


const data = req.body;



if(
!data.player_id ||
!data.user_id ||
!data.tournament_id ||
!data.amount
){

return res.status(400).json({

message:"Vous devez avoir un compte ArenaFoot pour participer"

});

}



try{


// Création transaction FedaPay

const transaction = await FedaPay.Transaction.create({

description:"Inscription tournoi ArenaFoot",

amount:data.amount,

currency:{
iso:"XOF"
},


callback_url:"http://localhost:5173/payment-success",



customer:{

firstname:data.firstname || "Joueur",

lastname:data.lastname || "ArenaFoot",

email:data.email || "client@arenafoot.com"

}


});





// Génération lien paiement

const token = await transaction.generateToken();



const paymentUrl = token.url;




// Enregistrement dans la base

Payment.create(

{

player_id:data.player_id,

user_id:data.user_id,

tournament_id:data.tournament_id,

amount:data.amount,

method:"fedapay",

transaction_id:transaction.id

},


(err,result)=>{


if(err){

console.log(err);

return res.status(500).json({

message:err.message

});

}



res.json({

message:"Paiement créé",

payment_url:paymentUrl,

payment_id:result.insertId

});


}

);



}catch(error){


console.log("Erreur FedaPay :",error);


res.status(500).json({

message:"Erreur création paiement",

error:error.message

});


}



};







// ==================================
// Valider un paiement
// ==================================

exports.validatePayment = (req,res)=>{


const { payment_id } = req.body;



if(!payment_id){

return res.status(400).json({

message:"payment_id manquant"

});

}




// Récupérer paiement

Payment.getById(

payment_id,

(err,payment)=>{


if(err){

return res.status(500).json({

message:"Erreur récupération paiement"

});

}



if(!payment || payment.length===0){

return res.status(404).json({

message:"Paiement introuvable"

});

}



const data = payment[0];





// Mettre paiement en succès

Payment.updateStatus(

payment_id,

"success",

(err)=>{


if(err){

return res.status(500).json({

message:"Erreur validation paiement"

});

}




// Mettre joueur payé

TournamentPlayer.updatePaymentStatus(

data.player_id,

data.tournament_id,

(err)=>{


if(err){

console.log(err);


return res.status(500).json({

message:"Erreur mise à jour joueur"

});

}





// Vérifier nombre de joueurs payés

const sql=`

SELECT COUNT(*) AS total

FROM tournament_players

WHERE tournament_id=?

AND payment_status='paid'

`;



db.query(

sql,

[data.tournament_id],

(error,count)=>{


if(error){

return res.status(500).json(error);

}



if(count[0].total>=16){



Tournament.updateStatus(

data.tournament_id,

"full",

(err)=>{


if(err){

console.log(err);

}



return res.json({

message:"Paiement validé. Tournoi complet."

});


}

);



}else{


return res.json({

message:"Paiement validé, joueur inscrit au tournoi"

});


}



}

);



}

);



}

);



}

);



};


// ==================================
// Webhook FedaPay
// ==================================

exports.webhook = (req,res)=>{


const event = req.body;



console.log(
"Webhook FedaPay reçu :",
event
);



// Vérifier transaction approuvée

if(
event.name === "transaction.approved" ||
event.event === "transaction.approved"
){



const transactionId =
event.data?.id || event.transaction?.id;




if(!transactionId){

return res.status(400).json({

message:"Transaction ID manquant"

});

}





// Chercher paiement ArenaFoot

const sql = `

SELECT *

FROM payments

WHERE transaction_id = ?

`;



db.query(

sql,

[transactionId],

(err,result)=>{


if(err){

console.log(err);

return res.status(500).json(err);

}





if(result.length===0){

return res.status(404).json({

message:"Paiement introuvable"

});

}




const payment = result[0];






// Vérifier si déjà payé

if(payment.status === "success"){


return res.json({

message:"Paiement déjà validé"

});


}







// Mise à jour paiement

Payment.updateStatus(

payment.id,

"success",

(err)=>{


if(err){

return res.status(500).json(err);

}





// Mise à jour joueur

TournamentPlayer.updatePaymentStatus(

payment.player_id,

payment.tournament_id,

(err)=>{


if(err){

return res.status(500).json(err);

}



console.log(
"Paiement FedaPay validé automatiquement"
);



// Vérifier si le tournoi est complet

const countSql = `

SELECT COUNT(*) AS total

FROM tournament_players

WHERE tournament_id=?

AND payment_status='paid'

`;



db.query(

countSql,

[payment.tournament_id],

(error,count)=>{


if(error){

console.log(error);

return;

}



if(count[0].total >= 16){



Tournament.updateStatus(

payment.tournament_id,

"full",

(err)=>{


if(err){

console.log(err);

return;

}else {

        // 👈 Ici tu peux répondre si le tournoi n'est pas encore complet

        return res.json({

            received: true

        });

    }





// Génération du bracket

generateBracket(payment.tournament_id)

.then(()=>{


console.log(
"Bracket créé automatiquement 🏆"
);



})

.catch((err)=>{


console.log(
"Erreur création bracket :",
err
);



});



}

);



}



}

);


}

);



}

);



}

);



}




res.json({

received:true

});


};