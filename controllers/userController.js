const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const User = require("../models/User");


// INSCRIPTION

exports.register = (req,res)=>{

const data = req.body;


bcrypt.hash(data.password,10,(err,hash)=>{


data.password = hash;


User.create(data,(err,result)=>{


if (err) {

    console.log("ERREUR INSCRIPTION :", err);

    return res.status(500).json({
        message: "Erreur création compte",
        error: err
    });

}


res.json({
message:"Compte créé avec succès"
});


});


});


};


exports.getRanking = (req,res)=>{

const sql = `

SELECT

users.id,
users.pseudo,

COUNT(matches.id) AS matches_played,

SUM(
CASE 
WHEN matches.winner = users.id THEN 1
ELSE 0
END
) AS wins


FROM users


LEFT JOIN matches

ON users.id = matches.player_one
OR users.id = matches.player_two


WHERE users.role = 'player'


GROUP BY users.id


ORDER BY wins DESC


LIMIT 10

`;


db.query(sql,(err,result)=>{

if(err){

return res.status(500).json(err);

}


res.json(result);


});


};


// CONNEXION

exports.login = (req,res)=>{


const {email,password}=req.body;



User.findByEmail(email,(err,result)=>{


if(err){

return res.status(500).json({
message:"Erreur serveur"
});

}


if(result.length===0){

return res.status(404).json({
message:"Utilisateur introuvable"
});

}



const user=result[0];



bcrypt.compare(
password,
user.password,
(err,match)=>{


if(!match){

return res.status(401).json({
message:"Mot de passe incorrect"
});

}



// Création du token avec le rôle

const token = jwt.sign(

{
id:user.id,
email:user.email,
role:user.role
},

"ARENAFOOT_SECRET",

{
expiresIn:"24h"
}

);



res.json({

message:"Connexion réussie",

token,

user:{
id:user.id,
pseudo:user.pseudo,
efootball_id:user.efootball_id,
role:user.role
}

});


});


});


};





exports.getUser = (req, res) => {

    const id = req.params.id;

    User.getById(id, (err, result) => {

        if (err) {

            return res.status(500).json({
                message: "Erreur chargement utilisateur"
            });

        }


        if (!result || result.length === 0) {

            return res.status(404).json({
                message: "Utilisateur introuvable"
            });

        }


        res.json(result[0]);

    });

};




// Profil complet du joueur

exports.getProfile = (req, res) => {

    const id = req.params.id;

    User.getProfileStats(id, (err, result) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                message: "Erreur lors du chargement du profil"
            });

        }

        if (!result || result.length === 0) {

            return res.status(404).json({
                message: "Joueur introuvable"
            });

        }


        const player = result[0];


        const matchesPlayed = player.matches_played || 0;

        const wins = player.wins || 0;

        const losses = matchesPlayed - wins;


        const winRate =
            matchesPlayed > 0
                ? ((wins / matchesPlayed) * 100).toFixed(1)
                : 0;



        res.json({

            id: player.id,

            name: player.name,

            pseudo: player.pseudo,

            email: player.email,

            efootball_id: player.efootball_id,


            tournaments_won: player.tournaments_won,

            matches_played: matchesPlayed,

            wins: wins,

            losses: losses,

            win_rate: winRate

        });


    });

};