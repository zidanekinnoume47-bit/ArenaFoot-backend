const db = require("../config/database");

const Match = {

create:(data,callback)=>{

const sql = `
INSERT INTO matches
(tournament_id, player_one, player_two, round, position)
VALUES ?
`;

db.query(
sql,
[
data.tournament_id,
data.player_one,
data.player_two,
data.round,
data.position
],
callback
);

},



createMultiple: (matches, callback) => {

const sql = `
INSERT INTO matches
(tournament_id, player_one, player_two, round, position)
VALUES ?
`;

const values = matches.map(match => [
    match.tournament_id,
    match.player_one,
    match.player_two,
    match.round,
    match.position
]);

db.query(
    sql,
    [values],
    callback
);

},



getTournamentMatches:(id, callback)=>{

const sql = `

SELECT
matches.id,
matches.tournament_id,
matches.player_one,
matches.player_two,
matches.round,
matches.winner,
matches.score,
matches.status,
matches.next_match_id,
matches.position,

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
[id],
callback
);

},



getById:(id,callback)=>{

const sql = `
SELECT *
FROM matches
WHERE id=?
`;

db.query(
sql,
[id],
callback
);

},



updateWinner:(data,callback)=>{

const sql = `
UPDATE matches
SET
winner=?,
score=?,
status='finished'
WHERE id=?
`;

db.query(
sql,
[
data.winner,
data.score,
data.match_id
],
callback
);

}

};

module.exports = Match;