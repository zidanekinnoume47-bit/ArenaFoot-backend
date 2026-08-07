const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const User = require("../models/User");
const apiInstance = require("../config/brevo");



// INSCRIPTION

exports.register = (req, res) => {

    const data = req.body;

    bcrypt.hash(data.password, 10, (err, hash) => {

        if (err) {
            return res.status(500).json({
                message: "Erreur serveur"
            });
        }

        data.password = hash;

        User.create(data, async (err, result) => {

            if (err) {

                console.log("ERREUR CREATION :", err);

                return res.status(500).json({
                    message: "Erreur création compte"
                });
            }

            const code = Math.floor(
                100000 + Math.random() * 900000
            ).toString();

            const expire = new Date(
                Date.now() + 10 * 60 * 1000
            );

            // Enregistrer le code
            db.query(
                `
                INSERT INTO email_verifications
                (user_id, code, type, expires_at)
                VALUES (?, ?, 'register', ?)
                `,
                [
                    result.insertId,
                    code,
                    expire
                ],
                async (err) => {

                    if (err) {

                        console.log(
                            "ERREUR ENREGISTREMENT CODE :",
                            err
                        );

                        return res.status(500).json({
                            message: "Erreur enregistrement du code"
                        });
                    }

                    try {

                        console.log(
                            "ENVOI CODE A :",
                            data.email
                        );

                        await apiInstance.transactionalEmails.sendTransacEmail({

                            sender: {
                                name: "ArenaFoot",
                                email: "arenafoot.app@gmail.com"
                            },

                            to: [
                                {
                                    email: data.email
                                }
                            ],

                            subject:
                                "Code de vérification ArenaFoot",

                            htmlContent: `
                                <h2>Bienvenue sur ArenaFoot ⚽</h2>

                                <p>
                                    Votre code de vérification est :
                                </p>

                                <h1 style="color:#2563eb;">
                                    ${code}
                                </h1>

                                <p>
                                    Ce code expire dans 10 minutes.
                                </p>
                            `
                        });

                        console.log(
                            "EMAIL ENVOYE AVEC SUCCES"
                        );

                        return res.status(200).json({
                            message: "Code envoyé",
                            email: data.email
                        });

                    } catch (error) {

                        console.log(
                            "ERREUR ENVOI BREVO :",
                            error
                        );

                        return res.status(500).json({
                            message:
                                "Compte créé mais code non envoyé"
                        });
                    }

                }
            );

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

if (user.email_verified !== 1) {

    return res.status(403).json({
        message: "Veuillez vérifier votre adresse email avant de vous connecter."
    });

}

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

process.env.JWT_SECRET,

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

exports.verifyEmail = (req, res) => {

    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({
            message: "Email et code requis"
        });
    }

    const sql = `
        SELECT
            ev.id,
            ev.user_id,
            ev.code,
            ev.expires_at
        FROM email_verifications ev
        JOIN users u
        ON ev.user_id = u.id
        WHERE u.email = ?
        AND ev.type = 'register'
        ORDER BY ev.id DESC
        LIMIT 1
    `;

    db.query(sql, [email], (err, result) => {

        if (err) return res.status(500).json(err);

        if (result.length === 0) {
            return res.status(404).json({
                message: "Aucun code trouvé"
            });
        }

        const verification = result[0];

        if (verification.code !== code) {
            return res.status(400).json({
                message: "Code incorrect"
            });
        }

        if (new Date() > new Date(verification.expires_at)) {
            return res.status(400).json({
                message: "Code expiré"
            });
        }

        db.query(
            "UPDATE users SET email_verified = 1 WHERE id = ?",
            [verification.user_id],
            (err) => {

                if (err) return res.status(500).json(err);

                db.query(
                    "DELETE FROM email_verifications WHERE id = ?",
                    [verification.id]
                );

                res.json({
                    message: "Compte vérifié avec succès 🎉"
                });

            }
        );

    });

};