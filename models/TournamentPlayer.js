const db = require("../config/database");

const TournamentPlayer = {

join: (data, callback) => {

const id = data.player_id || data.user_id;

const sql = `
INSERT INTO tournament_players
(tournament_id, player_id)
VALUES (?, ?)
`;

db.query(
sql,
[
data.tournament_id,
id
],
callback
);

},



checkPlayer: (data, callback) => {

const id = data.player_id || data.user_id;

const sql = `
SELECT *
FROM tournament_players
WHERE tournament_id = ?
AND player_id = ?
`;

db.query(
sql,
[
data.tournament_id,
id
],
callback
);

},




countPlayers: (tournament_id, callback) => {

const sql = `
SELECT COUNT(*) AS total
FROM tournament_players
WHERE tournament_id = ?
AND payment_status = 'paid'
`;

db.query(
sql,
[
tournament_id
],
callback
);

},




getPlayersByTournament:(tournament_id, callback)=>{

const sql = `

SELECT 
users.id,
users.name,
users.pseudo,
tournament_players.payment_status

FROM tournament_players

JOIN users

ON tournament_players.player_id = users.id

WHERE tournament_players.tournament_id = ?

`;

db.query(
sql,
[
tournament_id
],
callback
);

},





getPlayerTournaments:(player_id, callback)=>{

const sql = `

SELECT
tournaments.*,
tournament_players.payment_status

FROM tournaments

JOIN tournament_players

ON tournaments.id = tournament_players.tournament_id

WHERE tournament_players.player_id = ?

`;

db.query(
sql,
[
player_id
],
callback
);

},





updatePaymentStatus:(player_id,tournament_id,callback)=>{

const sql = `
UPDATE tournament_players
SET payment_status='paid'
WHERE player_id=?
AND tournament_id=?
`;

db.query(
sql,
[
player_id,
tournament_id
],
callback
);

}



};


module.exports = TournamentPlayer;