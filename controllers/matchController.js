const Match = require("../models/Match");
const db = require("../config/database");
const Reward = require("../models/Reward");


// Fonction utilitaire pour mélanger le tableau de joueurs

const shuffleArray = (array) => {

  for (let i = array.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];

  }

  return array;

};




// ==================================
// Générer les matchs d'un tournoi
// ==================================

exports.generateMatches = (req, res) => {

const tournament_id = req.params.id;



// Vérifier si le bracket existe déjà

const checkSql = `
SELECT id
FROM matches
WHERE tournament_id = ?
LIMIT 1
`;



db.query(
checkSql,
[tournament_id],
(err, exists)=>{


if(err){

return res.status(500).json(err);

}



if(exists.length > 0){

return res.json({

message:"Bracket déjà généré"

});

}





// Récupérer uniquement les joueurs payés

const sql = `

SELECT player_id

FROM tournament_players

WHERE tournament_id = ?

AND payment_status = 'paid'

`;



db.query(
sql,
[tournament_id],
(err,players)=>{


if(err){

return res.status(500).json(err);

}



if(players.length !== 16){

return res.status(400).json({

message:`Le tournoi nécessite exactement 16 joueurs payés (actuellement : ${players.length})`

});

}





const shuffledPlayers = shuffleArray([...players])
.map(player=>player.player_id);



let matches = [];




// Huitième de finale

for(let i=0;i<16;i+=2){

matches.push({

tournament_id,

player_one:shuffledPlayers[i],

player_two:shuffledPlayers[i+1],

round:"Huitième de finale",

position:(i/2)+1

});

}





// Quart de finale

for(let i=1;i<=4;i++){

matches.push({

tournament_id,

player_one:null,

player_two:null,

round:"Quart de finale",

position:i

});

}





// Demi-finale

for(let i=1;i<=2;i++){

matches.push({

tournament_id,

player_one:null,

player_two:null,

round:"Demi-finale",

position:i

});

}





// Finale

matches.push({

tournament_id,

player_one:null,

player_two:null,

round:"Finale",

position:1

});





Match.createMultiple(matches, (err, result) => {

    if (err) {
        console.log(err);
        return res.status(500).json(err);
    }

    const firstId = result.insertId;

    const links = [

[firstId, firstId + 8, 1],
[firstId + 1, firstId + 8, 2],

[firstId + 2, firstId + 9, 1],
[firstId + 3, firstId + 9, 2],

[firstId + 4, firstId + 10, 1],
[firstId + 5, firstId + 10, 2],

[firstId + 6, firstId + 11, 1],
[firstId + 7, firstId + 11, 2],

[firstId + 8, firstId + 12, 1],
[firstId + 9, firstId + 12, 2],

[firstId + 10, firstId + 13, 1],
[firstId + 11, firstId + 13, 2],

[firstId + 12, firstId + 14, 1],
[firstId + 13, firstId + 14, 2]

];

    let completed = 0;

   links.forEach(([matchId, nextMatchId, nextSlot]) => {

    db.query(
        `
        UPDATE matches
        SET
            next_match_id = ?,
            next_slot = ?
        WHERE id = ?
        `,
        [
            nextMatchId,
            nextSlot,
            matchId
        ],
        (error) => {

            if (error) {
                console.log(error);
            }

            completed++;

            if (completed === links.length) {

                res.status(201).json({
                    message: "Bracket complet créé 🏆",
                    matches_created: matches.length
                });

            }

        }
    );

});

});




}

);



}

);



};






// ==================================
// Récupérer les matchs d'un tournoi
// ==================================

exports.getTournamentMatches = (req,res)=>{


const tournament_id = req.params.id;



Match.getTournamentMatches(

tournament_id,

(err,result)=>{


if(err){

console.log("ERREUR SQL MATCH :",err);

return res.status(500).json(err);

}



res.json(result);



}

);



};






// ==================================
// Récupérer le bracket complet
// ==================================

exports.getBracket = (req,res)=>{


const tournament_id = req.params.id;



const sql = `

SELECT

matches.id,

matches.tournament_id,

matches.round,

matches.player_one,

matches.player_two,

matches.winner,

matches.score,

matches.status,

matches.next_match_id,


u1.pseudo AS player_one_name,

u2.pseudo AS player_two_name


FROM matches


LEFT JOIN users u1

ON matches.player_one = u1.id


LEFT JOIN users u2

ON matches.player_two = u2.id



WHERE matches.tournament_id = ?


ORDER BY matches.id ASC

`;



db.query(

sql,

[tournament_id],

(err,result)=>{


if(err){

console.log("ERREUR SQL BRACKET :",err);

return res.status(500).json(err);

}



res.json(result);



}

);



};






// ==================================
// Prochain match d'un joueur
// ==================================

exports.getPlayerNextMatch = (req,res)=>{


const player_id = req.params.id;



const sql = `

SELECT

matches.id,

matches.tournament_id,

matches.round,

matches.player_one,

matches.player_two,

matches.status,

matches.score,


u1.pseudo AS player_one_name,

u2.pseudo AS player_two_name



FROM matches



LEFT JOIN users u1

ON matches.player_one = u1.id



LEFT JOIN users u2

ON matches.player_two = u2.id



WHERE 

(matches.player_one = ?

OR matches.player_two = ?)



AND matches.status = 'pending'

AND matches.winner IS NULL



ORDER BY matches.id ASC


LIMIT 1

`;



db.query(

sql,

[player_id,player_id],

(err,result)=>{


if(err){

console.log(
"ERREUR NEXT MATCH :",
err
);

return res.status(500).json(err);

}



if(result.length === 0){

return res.json(null);

}



res.json(result[0]);



}

);



};


// ==================================
// Terminer un match
// ==================================

exports.finishMatch = (req, res) => {

    console.log("FINISH MATCH APPELÉ");
    console.log(req.body);

    const {
        match_id,
        winner,
        score
    } = req.body;



if(!match_id || !winner || !score){

return res.status(400).json({

message:"Informations match incomplètes"

});

}




// Récupérer le match

Match.getById(

match_id,

(err,result)=>{


if(err){

return res.status(500).json(err);

}


if(result.length===0){

return res.status(404).json({

message:"Match introuvable"

});

}



const match = result[0];

console.log("MATCH :", match);
console.log("NEXT MATCH ID :", match.next_match_id);


// Mise à jour du match

Match.updateWinner(

{
match_id,
winner,
score
},

(err)=>{


if(err){

return res.status(500).json(err);

}




// Si finale
// Si finale
if (match.round === "Finale") {

    db.query(
        `
        SELECT reward
        FROM tournaments
        WHERE id = ?
        `,
        [match.tournament_id],
        (error, tournament) => {

            if (error) {
                return res.status(500).json(error);
            }

            const reward = tournament[0].reward;

            db.query(
                `
                UPDATE tournaments
                SET winner_id = ?, status = 'finished'
                WHERE id = ?
                `,
                [winner, match.tournament_id],
                (error) => {

                    if (error) {
                        return res.status(500).json(error);
                    }

                    db.query(
                        `
                        SELECT payment_phone
                        FROM users
                        WHERE id = ?
                        `,
                        [winner],
                        (error, user) => {

                            if (error) {
                                return res.status(500).json(error);
                            }

                            if (!user.length || !user[0].payment_phone) {
                                return res.status(400).json({
                                    message: "Le gagnant n'a pas configuré son numéro MyFeda"
                                });
                            }

                            Reward.create(
                                {
                                    tournament_id: match.tournament_id,
                                    player_id: winner,
                                    amount: reward,
                                    phone: user[0].payment_phone
                                },
                                (err) => {

                                    if (err) {
                                        console.log("ERREUR REWARD :", err);
                                        return res.status(500).json(err);
                                    }

                                    console.log("✅ Récompense créée");

                                    return res.json({
                                        message: "Finale terminée. Récompense créée 🏆"
                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );

    return;
}




// Si Finale

if (match.next_match_id) {

    const sql =
        match.next_slot === 1
            ? `
            UPDATE matches
            SET player_one = ?
            WHERE id = ?
            `
            : `
            UPDATE matches
            SET player_two = ?
            WHERE id = ?
            `;

    db.query(
        sql,
        [
            winner,
            match.next_match_id
        ],
        (error) => {

            if (error) {
                return res.status(500).json(error);
            }

            res.json({
                message: "Match terminé, joueur qualifié"
            });

        }
    );

} else {

    res.json({
        message: "Match terminé"
    });

}



}

);



}

);



};