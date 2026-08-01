const db = require("../config/database");

const User = {

create:(data,callback)=>{

const sql = `
INSERT INTO users
(name,pseudo,email,phone,payment_phone,efootball_id,password)
VALUES (?,?,?,?,?,?,?)
`;

db.query(
sql,
[
data.name,
data.pseudo,
data.email,
data.phone,
data.payment_phone,
data.efootball_id,
data.password
],
callback
);

},

findByEmail:(email,callback)=>{

db.query(
"SELECT * FROM users WHERE email=?",
[email],
callback
);

},

getById:(id, callback)=>{

const sql = `
SELECT
id,
name,
pseudo,
email,
efootball_id
FROM users
WHERE id = ?
`;

db.query(
sql,
[id],
callback
);

},

getProfileStats:(id, callback)=>{

const sql = `
SELECT
u.id,
u.name,
u.pseudo,
u.email,
u.efootball_id,

(
SELECT COUNT(*)
FROM tournaments
WHERE winner_id = u.id
) AS tournaments_won,

(
SELECT COUNT(*)
FROM matches
WHERE player_one = u.id
OR player_two = u.id
) AS matches_played,

(
SELECT COUNT(*)
FROM matches
WHERE winner = u.id
) AS wins

FROM users u
WHERE u.id = ?
`;

db.query(
sql,
[id],
callback
);

}

};

module.exports = User;