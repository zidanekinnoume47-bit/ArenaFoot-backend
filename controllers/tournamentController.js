const Tournament = require("../models/Tournament");
const TournamentPlayer = require("../models/TournamentPlayer");
const db = require("../config/database");


// Créer un tournoi
exports.createTournament = (req, res) => {

    const data = req.body;

    Tournament.create(data, (err, result) => {

        if(err){

            return res.status(500).json({
                message:"Erreur lors de la création du tournoi"
            });

        }

        res.json({
            message:"Tournoi créé avec succès"
        });

    });

};




// Afficher tous les tournois
exports.getTournaments = (req,res)=>{

    Tournament.getAll((err,result)=>{

       if (err) {
            console.log("ERREUR SQL :", err);

            return res.status(500).json({
                message: "Erreur lors du chargement des tournois",
                error: err.message
            });
        }

        res.json(result);

    });

};




// Détail tournoi
exports.getTournament = (req,res)=>{

    Tournament.getById(
        req.params.id,
        (err,result)=>{

            if(err){

                return res.status(500).json({
                    message:"Erreur chargement tournoi"
                });

            }

            res.json(result[0]);

        }
    );

};




// Inscription tournoi
exports.joinTournament = (req,res)=>{


const tournament_id = req.body.tournament_id;
const user_id = req.body.user_id || req.body.player_id;



if(!tournament_id || !user_id){

    return res.status(400).json({
        message:"Données incomplètes"
    });

}



Tournament.getById(
tournament_id,
(err,tournament)=>{


if(err){

    return res.status(500).json({
        message:"Erreur récupération tournoi"
    });

}



if(!tournament[0]){

    return res.status(404).json({
        message:"Tournoi introuvable"
    });

}



if(
tournament[0].status === "finished" ||
tournament[0].status === "full"
){

    return res.status(400).json({
        message:"Tournoi complet ou terminé"
    });

}




const payload = {

    tournament_id,
    user_id,
    player_id:user_id

};




TournamentPlayer.checkPlayer(
payload,
(err,result)=>{


if(err){

    return res.status(500).json(err);

}



if(result.length > 0){

    return res.status(400).json({
        message:"Vous êtes déjà inscrit"
    });

}




TournamentPlayer.countPlayers(
tournament_id,
(err,count)=>{


if(err){

    return res.status(500).json(err);

}



const total = count[0]?.total || 0;
const limit = tournament[0].players_limit || 16;



if(total >= limit){

    return res.status(400).json({
        message:"Tournoi complet"
    });

}




TournamentPlayer.join(
payload,
(err,result)=>{

if (err) {

    console.log("ERREUR JOIN :", err);

    return res.status(500).json({
        message: "Erreur inscription",
        error: err.message
    });

}





// Vérifier les joueurs payés

const checkPaid = `

SELECT COUNT(*) AS total

FROM tournament_players

WHERE tournament_id=?

AND payment_status='paid'

`;



db.query(
checkPaid,
[tournament_id],
(error,paid)=>{


if(error){

    console.log(
        "Erreur vérification paiement :",
        error
    );

    return;

}



if(paid[0].total >= 16){


const updateStatus = `

UPDATE tournaments

SET status='full'

WHERE id=?

`;



db.query(
updateStatus,
[tournament_id],
(updateError)=>{


if(updateError){

    console.log(
        "Erreur changement statut :",
        updateError
    );

}


});



}


}

);





return res.json({

    message:"Inscription réussie !"

});


}); // fermeture TournamentPlayer.join

}); // fermeture TournamentPlayer.countPlayers

}); // fermeture TournamentPlayer.checkPlayer

}); // fermeture Tournament.getById


};







// Tournois d'un joueur


exports.getPlayerTournaments = (req,res)=>{


const player_id = req.params.id;



TournamentPlayer.getPlayerTournaments(
player_id,
(err,result)=>{

if (err) {

    console.log("ERREUR SQL :", err);

    return res.status(500).json({
        message: err.message
    });

}



res.json(result);



}

);



};






// Joueurs d'un tournoi

exports.getTournamentPlayers=(req,res)=>{


const tournament_id = req.params.id;



TournamentPlayer.getPlayersByTournament(

tournament_id,

(err,result)=>{


if(err){

    return res.status(500).json({

        message:"Erreur chargement participants"

    });

}



res.json(result);



}

);



};