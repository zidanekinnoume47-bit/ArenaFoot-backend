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

// ==========================================
// CONNEXION
// ==========================================

exports.login = (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            message: "Email et mot de passe requis"
        });

    }


    User.findByEmail(email, (err, result) => {

        if (err) {

            console.log("ERREUR LOGIN :", err);

            return res.status(500).json({
                message: "Erreur serveur"
            });

        }


        if (!result || result.length === 0) {

            return res.status(404).json({
                message: "Utilisateur introuvable"
            });

        }


        const user = result[0];


        // Vérifier que l'email du compte est déjà validé

        if (user.email_verified !== 1) {

            return res.status(403).json({
                message:
                    "Veuillez vérifier votre adresse email avant de vous connecter."
            });

        }


        // Vérifier le mot de passe

        bcrypt.compare(
            password,
            user.password,
            async (err, match) => {

                if (err) {

                    console.log(
                        "ERREUR COMPARAISON PASSWORD :",
                        err
                    );

                    return res.status(500).json({
                        message: "Erreur serveur"
                    });

                }


                if (!match) {

                    return res.status(401).json({
                        message: "Mot de passe incorrect"
                    });

                }


                /*
                 * ======================================
                 * MOT DE PASSE CORRECT
                 *
                 * MAIS ON NE CRÉE PAS ENCORE LE JWT.
                 * ======================================
                 */


                const code = Math.floor(
                    100000 +
                    Math.random() * 900000
                ).toString();


                const expire = new Date(
                    Date.now() + 5 * 60 * 1000
                );


                /*
                 * Supprimer les anciens codes
                 * de connexion de cet utilisateur
                 */

                db.query(
                    `
                    DELETE FROM email_verifications
                    WHERE user_id = ?
                    AND type = 'login'
                    `,
                    [user.id],
                    (err) => {

                        if (err) {

                            console.log(
                                "ERREUR SUPPRESSION CODE LOGIN :",
                                err
                            );

                            return res.status(500).json({
                                message: "Erreur serveur"
                            });

                        }


                        /*
                         * Enregistrer le nouveau code
                         */

                        db.query(
                            `
                            INSERT INTO email_verifications
                            (user_id, code, type, expires_at)
                            VALUES (?, ?, 'login', ?)
                            `,
                            [
                                user.id,
                                code,
                                expire
                            ],
                            async (err) => {

                                if (err) {

                                    console.log(
                                        "ERREUR CODE LOGIN :",
                                        err
                                    );

                                    return res.status(500).json({
                                        message:
                                            "Erreur génération du code"
                                    });

                                }


                                /*
                                 * Envoyer le code par email
                                 */

                                try {

                                    await apiInstance
                                        .transactionalEmails
                                        .sendTransacEmail({

                                            sender: {
                                                name: "ArenaFoot",
                                                email: "arenafoot.app@gmail.com"
                                            },

                                            to: [
                                                {
                                                    email: user.email
                                                }
                                            ],

                                            subject:
                                                "Code de connexion ArenaFoot",

                                            htmlContent: `

                                                <div style="
                                                    font-family:Arial;
                                                    max-width:600px;
                                                    margin:auto;
                                                    padding:30px;
                                                ">

                                                    <h2>
                                                        🏆 ArenaFoot
                                                    </h2>

                                                    <p>
                                                        Une tentative de
                                                        connexion à votre
                                                        compte ArenaFoot
                                                        a été détectée.
                                                    </p>

                                                    <p>
                                                        Votre code de
                                                        connexion est :
                                                    </p>

                                                    <h1 style="
                                                        color:#2563eb;
                                                        font-size:36px;
                                                        letter-spacing:8px;
                                                    ">
                                                        ${code}
                                                    </h1>

                                                    <p>
                                                        Ce code expire
                                                        dans 5 minutes.
                                                    </p>

                                                    <p>
                                                        Si vous n'êtes pas
                                                        à l'origine de cette
                                                        connexion, ignorez
                                                        cet email et changez
                                                        votre mot de passe.
                                                    </p>

                                                </div>

                                            `
                                        });


                                    console.log(
                                        "CODE LOGIN ENVOYÉ À :",
                                        user.email
                                    );


                                    /*
                                     * IMPORTANT :
                                     *
                                     * On retourne seulement
                                     * que le code a été envoyé.
                                     *
                                     * PAS DE JWT.
                                     */

                                    return res.json({

                                        message:
                                            "Code de connexion envoyé",

                                        email:
                                            user.email

                                    });


                                } catch (error) {

                                    console.log(
                                        "ERREUR BREVO LOGIN :",
                                        error
                                    );


                                    return res.status(500).json({

                                        message:
                                            "Impossible d'envoyer le code de connexion"

                                    });

                                }

                            }
                        );

                    }
                );

            }
        );

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




// MOT DE PASSE OUBLIÉ
// ==========================================

exports.forgotPassword = (req, res) => {

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: "Email requis"
        });
    }

    User.findByEmail(email, async (err, result) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Erreur serveur"
            });
        }

        if (!result || result.length === 0) {
            return res.status(404).json({
                message: "Aucun compte associé à cet email"
            });
        }

        const user = result[0];

        const code = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const expire = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Supprimer les anciens codes de réinitialisation
        db.query(
            `
            DELETE FROM email_verifications
            WHERE user_id = ?
            AND type = 'reset'
            `,
            [user.id],
            async (err) => {

                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        message: "Erreur serveur"
                    });
                }

                // Enregistrer le nouveau code
                db.query(
                    `
                    INSERT INTO email_verifications
                    (user_id, code, type, expires_at)
                    VALUES (?, ?, 'reset', ?)
                    `,
                    [
                        user.id,
                        code,
                        expire
                    ],
                    async (err) => {

                        if (err) {
                            console.log(err);

                            return res.status(500).json({
                                message: "Erreur enregistrement du code"
                            });
                        }

                        try {

                            await apiInstance.transactionalEmails.sendTransacEmail({

                                sender: {
                                    name: "ArenaFoot",
                                    email: "arenafoot.app@gmail.com"
                                },

                                to: [
                                    {
                                        email: email
                                    }
                                ],

                                subject:
                                    "Réinitialisation de votre mot de passe ArenaFoot",

                                htmlContent: `
                                    <h2>Réinitialisation ArenaFoot ⚽</h2>

                                    <p>
                                        Vous avez demandé la réinitialisation
                                        de votre mot de passe.
                                    </p>

                                    <p>
                                        Votre code de vérification est :
                                    </p>

                                    <h1 style="color:#2563eb;">
                                        ${code}
                                    </h1>

                                    <p>
                                        Ce code est valable pendant 10 minutes.
                                    </p>

                                    <p>
                                        Si vous n'êtes pas à l'origine
                                        de cette demande, ignorez cet email.
                                    </p>
                                `
                            });

                            return res.json({
                                message: "Code envoyé",
                                email: email
                            });

                        } catch (error) {

                            console.log(
                                "ERREUR BREVO RESET :",
                                error
                            );

                            return res.status(500).json({
                                message: "Impossible d'envoyer le code"
                            });

                        }

                    }
                );

            }
        );

    });

};






exports.verifyResetCode = (req, res) => {

    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({
            message: "Email et code requis"
        });
    }

    db.query(
        `
        SELECT
            ev.id,
            ev.user_id,
            ev.code,
            ev.expires_at
        FROM email_verifications ev
        JOIN users u
        ON ev.user_id = u.id
        WHERE u.email = ?
        AND ev.type = 'reset'
        ORDER BY ev.id DESC
        LIMIT 1
        `,
        [email],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: "Erreur serveur"
                });
            }

            if (!result || result.length === 0) {
                return res.status(404).json({
                    message: "Code introuvable"
                });
            }

            const verification = result[0];

            if (verification.code !== code) {
                return res.status(400).json({
                    message: "Code incorrect"
                });
            }

            if (
                new Date() >
                new Date(verification.expires_at)
            ) {
                return res.status(400).json({
                    message: "Code expiré"
                });
            }

            return res.json({
                message: "Code valide",
                user_id: verification.user_id
            });

        }
    );

};





exports.resetPassword = (req, res) => {

    const {
        user_id,
        code,
        password
    } = req.body;

    if (!user_id || !code || !password) {
        return res.status(400).json({
            message: "Informations manquantes"
        });
    }

    db.query(
        `
        SELECT *
        FROM email_verifications
        WHERE user_id = ?
        AND code = ?
        AND type = 'reset'
        ORDER BY id DESC
        LIMIT 1
        `,
        [user_id, code],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: "Erreur serveur"
                });
            }

            if (!result || result.length === 0) {
                return res.status(400).json({
                    message: "Code incorrect"
                });
            }

            const verification = result[0];

            if (
                new Date() >
                new Date(verification.expires_at)
            ) {
                return res.status(400).json({
                    message: "Code expiré"
                });
            }

            bcrypt.hash(
                password,
                10,
                (err, hash) => {

                    if (err) {
                        return res.status(500).json({
                            message: "Erreur serveur"
                        });
                    }

                    db.query(
                        `
                        UPDATE users
                        SET password = ?
                        WHERE id = ?
                        `,
                        [hash, user_id],
                        (err) => {

                            if (err) {
                                return res.status(500).json({
                                    message:
                                        "Erreur modification mot de passe"
                                });
                            }

                            db.query(
                                `
                                DELETE FROM email_verifications
                                WHERE id = ?
                                `,
                                [verification.id]
                            );

                            return res.json({
                                message:
                                    "Mot de passe modifié avec succès 🎉"
                            });

                        }
                    );

                }
            );

        }
    );

};



// ==========================================
// VÉRIFICATION CODE DE CONNEXION
// ==========================================

exports.verifyLogin = (req, res) => {

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
            ev.expires_at,

            u.id AS user_id,
            u.email,
            u.pseudo,
            u.efootball_id,
            u.role

        FROM email_verifications ev

        JOIN users u
        ON ev.user_id = u.id

        WHERE u.email = ?

        AND ev.type = 'login'

        ORDER BY ev.id DESC

        LIMIT 1

    `;


    db.query(
        sql,
        [email],
        (err, result) => {

            if (err) {

                console.log(
                    "ERREUR VERIFY LOGIN :",
                    err
                );

                return res.status(500).json({
                    message: "Erreur serveur"
                });

            }


            if (
                !result ||
                result.length ===0
            ) {

                return res.status(404).json({
                    message:
                        "Aucun code de connexion trouvé"
                });

            }


            const verification =
                result[0];


            /*
             * Vérifier expiration
             */

            if (
                new Date() >
                new Date(
                    verification.expires_at
                )
            ) {

                db.query(
                    `
                    DELETE FROM email_verifications
                    WHERE id = ?
                    `,
                    [verification.id]
                );


                return res.status(400).json({
                    message: "Code expiré"
                });

            }


            /*
             * Vérifier le code
             */

            if (
                verification.code !==
                code.toString()
            ) {

                return res.status(400).json({
                    message: "Code incorrect"
                });

            }


            /*
             * Code correct
             *
             * On supprime immédiatement
             * le code pour empêcher sa
             * réutilisation.
             */

            db.query(
                `
                DELETE FROM email_verifications
                WHERE id = ?
                `,
                [verification.id],
                (deleteError) => {

                    if (deleteError) {

                        console.log(
                            "ERREUR SUPPRESSION CODE :",
                            deleteError
                        );

                        return res.status(500).json({
                            message: "Erreur serveur"
                        });

                    }


                    /*
                     * ==================================
                     * MAINTENANT seulement :
                     * CRÉATION DU JWT
                     * ==================================
                     */

                    const token = jwt.sign(

                        {
                            id:
                                verification.user_id,

                            email:
                                verification.email,

                            role:
                                verification.role
                        },

                        process.env.JWT_SECRET,

                        {
                            expiresIn: "24h"
                        }

                    );


                    return res.json({

                        message:
                            "Connexion vérifiée avec succès",

                        token,

                        user: {

                            id:
                                verification.user_id,

                            pseudo:
                                verification.pseudo,

                            email:
                                verification.email,

                            efootball_id:
                                verification.efootball_id,

                            role:
                                verification.role

                        }

                    });

                }
            );

        }
    );

};