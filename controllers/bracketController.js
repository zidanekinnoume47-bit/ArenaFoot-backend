const db = require("../config/database");
const Match = require("../models/match.js");


// ==================================
// Générer le bracket complet (16 joueurs)
// ==================================

exports.generateMatches = (req,res)=>{


const tournament_id = req.params.id;

if(!tournament_id){

return res.status(400).json({
message:"ID tournoi manquant"
});

}


// Vérifier si un bracket existe déjà

const checkSql = `
SELECT id
FROM matches
WHERE tournament_id=?
`;


db.query(checkSql,[tournament_id],(err,existing)=>{


if(err){

return res.status(500).json(err);

}


if(existing.length>0){

return res.status(400).json({

message:"Le bracket existe déjà"

});

}


// Récupérer les joueurs

const sql=`

SELECT player_id

FROM tournament_players

WHERE tournament_id=?
AND payment_status='paid'

`;



db.query(sql,[tournament_id],(err,players)=>{


if(err){

return res.status(500).json(err);

}



if(players.length!==16){

return res.status(400).json({

message:`Il faut exactement 16 joueurs (${players.length})`

});

}



let list=players.map(p=>p.player_id);


// Mélange

list.sort(()=>Math.random()-0.5);



let matches=[];


// =======================
// HUITIÈME DE FINALE (8)
// =======================


for(let i=0;i<16;i+=2){


matches.push([

tournament_id,
list[i],
list[i+1],
"Huitième de finale",
null,
null,
"pending"

]);


}


// =======================
// QUARTS (4)
// =======================


for(let i=0;i<4;i++){


matches.push([

tournament_id,
null,
null,
"Quart de finale",
null,
null,
"pending"

]);


}


// =======================
// DEMI (2)
// =======================


for(let i=0;i<2;i++){


matches.push([

tournament_id,
null,
null,
"Demi-finale",
null,
null,
"pending"

]);


}


// =======================
// FINALE (1)
// =======================


matches.push([

tournament_id,
null,
null,
"Finale",
null,
null,
"pending"

]);



const insertSql=`

INSERT INTO matches

(
tournament_id,
player_one,
player_two,
round,
winner,
score,
status
)

VALUES ?

`;



db.query(insertSql,[matches],(error,result)=>{


if(error){

return res.status(500).json(error);

}



const firstId=result.insertId;


let links=[];



// 8e -> Quart

for(let i=0;i<8;i++){

links.push([
firstId+i,
firstId+8+Math.floor(i/2)
]);

}



// Quart -> Demi

for(let i=0;i<4;i++){

links.push([
firstId+8+i,
firstId+12+Math.floor(i/2)
]);

}



// Demi -> Finale

for(let i=0;i<2;i++){

links.push([
firstId+12+i,
firstId+14
]);

}



let index=0;



function updateLinks(){


if(index===links.length){


return res.json({

message:"Bracket complet créé 🏆",

matches_created:15

});

}



const update=`

UPDATE matches

SET next_match_id=?

WHERE id=?

`;



db.query(

update,

[
links[index][1],
links[index][0]
],

(err)=>{


if(err){

return res.status(500).json(err);

}


index++;

updateLinks();


}

);



}



updateLinks();



});



});


});


};





// ==================================
// Terminer un match
// ==================================

exports.finishMatch=(req,res)=>{


const data=req.body;



if(!data.match_id || !data.winner){

return res.status(400).json({

message:"Données du match incomplètes"

});

}



Match.getById(data.match_id,(err,result)=>{


if(err){

return res.status(500).json(err);

}



const match=result[0];



if(!match){

return res.status(404).json({

message:"Match introuvable"

});

}



if(match.status==="finished"){

return res.status(400).json({

message:"Ce match est déjà terminé"

});

}



if(
data.winner!=match.player_one &&
data.winner!=match.player_two
){

return res.status(400).json({

message:"Ce joueur ne participe pas à ce match"

});

}



Match.updateWinner(data,(err)=>{


if(err){

return res.status(500).json(err);

}



// Finale

if(match.round.toLowerCase()==="finale"){


const sql=`

UPDATE tournaments

SET winner_id=?,
status='finished'

WHERE id=?

`;



db.query(

sql,

[
data.winner,
match.tournament_id
],

(error)=>{


if(error){

return res.status(500).json(error);

}



return res.json({

message:"Tournoi terminé 🏆",

champion:data.winner

});


}

);



return;

}




if(!match.next_match_id){

return res.json({

message:"Résultat enregistré"

});

}



Match.getById(

match.next_match_id,

(err,next)=>{


if(err){

return res.status(500).json(err);

}



const nextMatch=next[0];



let field;



if(nextMatch.player_one===null){

field="player_one";

}

else if(nextMatch.player_two===null){

field="player_two";

}

else{

return res.json({

message:"Résultat enregistré"

});

}




const sql=`

UPDATE matches

SET ${field}=?

WHERE id=?

`;



db.query(

sql,

[
data.winner,
match.next_match_id
],

(error)=>{


if(error){

return res.status(500).json(error);

}



res.json({

message:"Résultat enregistré et gagnant envoyé"

});


}

);



});


});


});


};





// ==================================
// Récupérer le bracket complet
// ==================================

exports.getBracket=(req,res)=>{


const tournament_id=req.params.id;



const sql=`

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

ON matches.player_one=u1.id


LEFT JOIN users u2

ON matches.player_two=u2.id


WHERE matches.tournament_id=?


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