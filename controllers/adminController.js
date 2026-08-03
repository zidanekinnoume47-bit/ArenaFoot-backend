const db =
require("../config/database");




// Voir tous les joueurs

exports.players=(req,res)=>{


db.query(
"SELECT id,name,pseudo,email,phone,role FROM users",
(err,result)=>{


if(err)
return res.status(500).json(err);



res.json(result);


}

);


};






// Voir les tournois

exports.tournaments = (req, res) => {

    db.query("SELECT * FROM tournaments", (err, result) => {

        console.log("TOURNOIS :", result);

        if (err) {
            console.log(err);
            return res.status(500).json(err);
        }

        res.json(result);
    });

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


// Voir un joueur
exports.getPlayer = (req, res) => {

    const id = req.params.id;

    const sql = `

    SELECT
        u.id,
        u.name,
        u.pseudo,
        u.email,
        u.phone,
        u.efootball_id,
        u.role,

        (
            SELECT COUNT(*)
            FROM tournament_players
            WHERE player_id = u.id
        ) AS tournaments,

        (
            SELECT COUNT(*)
            FROM matches
            WHERE player_one = u.id
            OR player_two = u.id
        ) AS matches,

        (
            SELECT COUNT(*)
            FROM matches
            WHERE winner = u.id
        ) AS wins

    FROM users u

    WHERE u.id = ?

    `;

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json(err);
        }

        if (result.length === 0) {
            return res.status(404).json({
                message: "Joueur introuvable"
            });
        }

        res.json(result[0]);

    });

};


exports.banPlayer = (req, res) => {

    const id = req.params.id;

    db.query(
        `
        UPDATE users
        SET status = 'banned'
        WHERE id = ?
        `,
        [id],
        (err) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                message: "Joueur banni avec succès"
            });

        }
    );

};



exports.deletePlayer = (req, res) => {

    const id = req.params.id;

    db.query(
        "SELECT role FROM users WHERE id = ?",
        [id],
        (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            if (result.length === 0) {
                return res.status(404).json({
                    message: "Joueur introuvable"
                });
            }

            if (result[0].role === "admin") {
                return res.status(400).json({
                    message: "Impossible de supprimer un administrateur."
                });
            }

            db.query(
                "DELETE FROM tournament_players WHERE player_id = ?",
                [id],
                (err) => {

                    if (err) {
                        return res.status(500).json(err);
                    }

                    db.query(
                        "DELETE FROM users WHERE id = ?",
                        [id],
                        (err) => {

                            if (err) {
                                return res.status(500).json(err);
                            }

                            res.json({
                                message: "Joueur supprimé avec succès"
                            });

                        }
                    );

                }
            );

        }
    );

};



exports.deleteTournament = (req, res) => {

    const id = req.params.id;

    db.query(
        "DELETE FROM tournament_players WHERE tournament_id = ?",
        [id],
        (err) => {

            if (err) return res.status(500).json(err);

            db.query(
                "DELETE FROM matches WHERE tournament_id = ?",
                [id],
                (err) => {

                    if (err) return res.status(500).json(err);

                    db.query(
                        "DELETE FROM tournaments WHERE id = ?",
                        [id],
                        (err) => {

                            if (err) return res.status(500).json(err);

                            res.json({
                                message: "Tournoi supprimé avec succès"
                            });

                        }
                    );

                }
            );

        }
    );

};



exports.getTournamentPlayers = (req, res) => {

    const tournament_id = req.params.id;

    const sql = `
    SELECT
        users.id,
        users.name,
        users.pseudo,
        users.phone,
        tournament_players.payment_status

    FROM tournament_players

    JOIN users
    ON tournament_players.player_id = users.id

    WHERE tournament_players.tournament_id = ?
    `;

    db.query(sql, [tournament_id], (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(result);

    });

};

// Voir toutes les récompenses
exports.getRewards = (req, res) => {

    const sql = `
    SELECT
        rewards.id,
        users.pseudo,
        tournaments.name AS tournament,
        rewards.amount,
        rewards.phone,
        rewards.status

    FROM rewards

    JOIN users
    ON rewards.player_id = users.id

    JOIN tournaments
    ON rewards.tournament_id = tournaments.id

    ORDER BY rewards.id DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(result);

    });

};