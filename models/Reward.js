const db = require("../config/database");


const Reward = {

create: (data, callback) => {

    const sql = `
    INSERT INTO rewards
    (tournament_id, player_id, amount, phone, status)
    VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            data.tournament_id,
            data.player_id,
            data.amount,
            data.phone,
            "waiting"
        ],
        (err, result) => {

            if (err) {
                console.log("ERREUR INSERT REWARD :", err);
            }

            callback(err, result);

        }
    );

},



updateStatus:(id,status,callback)=>{


const sql = `

UPDATE rewards

SET status=?

WHERE id=?

`;


db.query(
sql,
[
status,
id
],
callback
);


}


};


module.exports = Reward;