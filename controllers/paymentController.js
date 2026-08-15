const Payment = require("../models/Payment");
const TournamentPlayer = require("../models/TournamentPlayer");
const FedaPay = require("../config/fedapay");
const { Webhook } = require("fedapay");
const MatchController = require("./matchController");
const Tournament = require("../models/Tournament");
const db = require("../config/database");

// ==================================
// Générer le bracket automatiquement
// ==================================
const generateBracket = (tournament_id) => {
    return new Promise((resolve, reject) => {
        const req = {
            params: {
                id: tournament_id
            }
        };

        const res = {
            json: (data) => {
                resolve(data);
            },
            status: (code) => {
                return {
                    json: (data) => {
                        reject(data);
                    }
                };
            }
        };

        MatchController.generateMatches(req, res);
    });
};

// ==================================
// Vérifier si le tournoi est prêt
// ==================================
const checkTournamentReady = async (tournamentId) => {
    return new Promise((resolve, reject) => {
        db.query(
            `
            SELECT COUNT(*) AS total
            FROM tournament_players
            WHERE tournament_id = ?
            AND payment_status = 'paid'
            `,
            [tournamentId],
            (err, count) => {
                if (err) return reject(err);

                if (count[0].total < 16) {
                    return resolve(false);
                }

                db.query(
                    `
                    SELECT COUNT(*) AS total
                    FROM matches
                    WHERE tournament_id = ?
                    `,
                    [tournamentId],
                    async (err, matches) => {
                        if (err) return reject(err);

                        if (matches[0].total > 0) {
                            return resolve(true);
                        }

                        Tournament.updateStatus(
                            tournamentId,
                            "full",
                            async (err) => {
                                if (err) return reject(err);

                                try {
                                    await generateBracket(tournamentId);
                                    console.log("🏆 Bracket généré automatiquement");
                                    resolve(true);
                                } catch (error) {
                                    reject(error);
                                }
                            }
                        );
                    }
                );
            }
        );
    });
};

// ==================================
// Créer un paiement FedaPay
// ==================================
exports.createPayment = async (req, res) => {

    console.log("BODY PAYMENT :", req.body);

    const data = req.body;
    const userId = data.user_id || data.player_id;

    if (!userId || !data.tournament_id) {
        return res.status(400).json({
            message: "Vous devez avoir un compte ArenaFoot pour participer"
        });
    }

    try {

        // ==============================
        // Récupérer le tournoi
        // ==============================
        Tournament.getById(
            data.tournament_id,
            async (err, result) => {

                if (err) {
                    console.error(
                        "Erreur récupération tournoi :",
                        err
                    );

                    return res.status(500).json({
                        message: "Erreur récupération tournoi"
                    });
                }

                if (!result || result.length === 0) {
                    return res.status(404).json({
                        message: "Tournoi introuvable"
                    });
                }

                const tournament = result[0];

                // ==============================
                // Vérifier si le joueur est déjà payé
                // ==============================
                const checkPaidSql = `
                    SELECT id
                    FROM tournament_players
                    WHERE tournament_id = ?
                    AND player_id = ?
                    AND payment_status = 'paid'
                    LIMIT 1
                `;

                db.query(
                    checkPaidSql,
                    [data.tournament_id, userId],
                    async (checkErr, paidResult) => {

                        if (checkErr) {
                            console.error(
                                "Erreur vérification inscription :",
                                checkErr
                            );

                            return res.status(500).json({
                                message:
                                    "Erreur vérification inscription"
                            });
                        }

                        // ==============================
                        // Déjà inscrit et payé
                        // ==============================
                        if (paidResult.length > 0) {

                            return res.status(400).json({
                                message:
                                    "Vous êtes déjà inscrit à ce tournoi."
                            });
                        }

                        // ==============================
                        // Prix officiel du tournoi
                        // ==============================
                        const amount =
                            Number(tournament.entry_fee);

                        if (!amount || amount <= 0) {

                            return res.status(400).json({
                                message:
                                    "Prix d'inscription du tournoi invalide"
                            });
                        }

                        console.log(
                            `💰 Prix officiel du tournoi : ${amount} FCFA`
                        );

                        // ==============================
                        // Créer transaction FedaPay
                        // ==============================
                        try {

                            const transaction =
                                await FedaPay.Transaction.create({

                                    description:
                                        `Inscription tournoi ${tournament.name}`,

                                    amount: amount,

                                    currency: {
                                        iso: "XOF"
                                    },

                                    callback_url:
                                        "https://arenafoot-backend-production.up.railway.app/payment-success",

                                    customer: {
                                        firstname:
                                            data.firstname || "Joueur",

                                        lastname:
                                            data.lastname || "ArenaFoot",

                                        email:
                                            data.email ||
                                            "client@arenafoot.com"
                                    }
                                });

                            const token =
                                await transaction.generateToken();

                            const paymentUrl =
                                token.url;

                            // ==============================
                            // Enregistrer paiement
                            // ==============================
                            Payment.create(
                                {
                                    player_id: userId,

                                    user_id: userId,

                                    tournament_id:
                                        data.tournament_id,

                                    amount: amount,

                                    method: "fedapay",

                                    transaction_id:
                                        transaction.id
                                },

                                (err, result) => {

                                    if (err) {

                                        console.log(
                                            "Erreur création paiement :",
                                            err
                                        );

                                        return res.status(500).json({
                                            message: err.message
                                        });
                                    }

                                    return res.json({

                                        message:
                                            "Paiement créé",

                                        payment_url:
                                            paymentUrl,

                                        payment_id:
                                            result.insertId,

                                        amount:
                                            amount
                                    });
                                }
                            );

                        } catch (error) {

                            console.log(
                                "ERREUR FedaPay COMPLETE :"
                            );

                            console.log(
                                error.response?.data
                            );

                            console.log(
                                error.message
                            );

                            return res.status(500).json({
                                message:
                                    error.message
                            });
                        }
                    }
                );
            }
        );

    } catch (error) {

        console.log(
            "ERREUR createPayment :",
            error
        );

        return res.status(500).json({
            message: error.message
        });
    }
};

// ==================================
// Validation manuelle désactivée
// La validation est faite par le webhook FedaPay
// ==================================
exports.validatePayment = (req, res) => {

    return res.status(403).json({
        message:
            "La validation manuelle des paiements est désactivée. Le paiement est validé automatiquement par FedaPay."
    });

};

// ==================================
// Webhook FedaPay sécurisé
// ==================================
exports.webhook = (req, res) => {

    console.log("========== WEBHOOK FEDAPAY ==========");

    const signature =
        req.headers["x-fedapay-signature"];

    const secret =
        process.env.FEDAPAY_WEBHOOK_SECRET;

    let event;

    // ==================================
    // Vérification de la signature
    // ==================================
    try {

       event = Webhook.constructEvent(
    req.body.toString(),
    signature,
    secret
);

    } catch (error) {

        console.error(
            "❌ Signature webhook FedaPay invalide :",
            error.message
        );

        return res.status(400).json({
            message: "Webhook invalide"
        });
    }

    console.log(
        "✅ Webhook authentifié :",
        event.name
    );

    console.log(
    "📦 DONNÉES COMPLÈTES DU WEBHOOK :",
    JSON.stringify(event, null, 2)
);

    // ==================================
    // On s'intéresse uniquement au paiement approuvé
    // ==================================
    if (event.name !== "transaction.approved") {

        console.log(
            "Événement ignoré :",
            event.name
        );

        return res.json({
            received: true
        });
    }

    // ==================================
    // Récupérer l'ID de transaction
    // ==================================
    const transactionId =
        event.object?.id ||
        event.data?.id ||
        event.transaction?.id;

    if (!transactionId) {

        console.error(
            "❌ Transaction ID introuvable"
        );

        return res.status(400).json({
            message: "Transaction ID manquant"
        });
    }

    console.log(
        "💳 Transaction approuvée :",
        transactionId
    );

    // ==================================
    // Chercher le paiement dans notre BDD
    // ==================================
    const sql = `
        SELECT *
        FROM payments
        WHERE transaction_id = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [transactionId],
        (err, result) => {

            if (err) {

                console.error(
                    "Erreur recherche paiement :",
                    err
                );

                return res.status(500).json({
                    message:
                        "Erreur recherche paiement"
                });
            }

            if (result.length === 0) {

                console.error(
                    "❌ Paiement introuvable :",
                    transactionId
                );

                return res.status(404).json({
                    message:
                        "Paiement introuvable"
                });
            }

            const payment = result[0];

            console.log(
                "Paiement trouvé :",
                payment.id
            );

            // ==================================
            // Empêcher le double traitement
            // ==================================
            if (payment.status === "success") {

                console.log(
                    "ℹ️ Paiement déjà validé"
                );

                return res.json({
                    received: true
                });
            }

            // ==================================
            // Marquer le paiement comme success
            // ==================================
            Payment.updateStatus(
                payment.id,
                "success",
                (err) => {

                    if (err) {

                        console.error(
                            "Erreur mise à jour paiement :",
                            err
                        );

                        return res.status(500).json({
                            message:
                                "Erreur validation paiement"
                        });
                    }

                    console.log(
                        "✅ Paiement marqué SUCCESS"
                    );

                    // ==================================
                    // Inscrire le joueur comme PAID
                    // ==================================
                    TournamentPlayer.registerPaid(
                        payment.player_id,
                        payment.tournament_id,
                        async (err) => {

                            if (err) {

                                console.error(
                                    "Erreur inscription joueur :",
                                    err
                                );

                                return res.status(500).json({
                                    message:
                                        "Erreur inscription joueur"
                                });
                            }

                            console.log(
                                "✅ Joueur inscrit avec payment_status = paid"
                            );

                            // ==================================
                            // Vérifier si le tournoi est prêt
                            // ==================================
                            try {

                                await checkTournamentReady(
                                    payment.tournament_id
                                );

                                console.log(
                                    "✅ Vérification tournoi terminée"
                                );

                            } catch (error) {

                                console.error(
                                    "Erreur préparation tournoi :",
                                    error
                                );
                            }

                            return res.json({
                                received: true
                            });
                        }
                    );
                }
            );
        }
    );
};