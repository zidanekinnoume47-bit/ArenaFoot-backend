const Payment = require("../models/Payment");
const TournamentPlayer = require("../models/TournamentPlayer");
const FedaPay = require("../config/fedapay");
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

    if (!userId || !data.tournament_id || !data.amount) {
        return res.status(400).json({
            message: "Vous devez avoir un compte ArenaFoot pour participer"
        });
    }

    console.log("Création paiement...");

    try {
        const transaction = await FedaPay.Transaction.create({
            description: "Inscription tournoi ArenaFoot",
            amount: data.amount,
            currency: {
                iso: "XOF"
            },
            callback_url: "https://arenafoot-backend-production.up.railway.app/payment-success",
            customer: {
                firstname: data.firstname || "Joueur",
                lastname: data.lastname || "ArenaFoot",
                email: data.email || "client@arenafoot.com"
            }
        });

        const token = await transaction.generateToken();
        const paymentUrl = token.url;

        Payment.create(
            {
                player_id: userId,
                user_id: userId,
                tournament_id: data.tournament_id,
                amount: data.amount,
                method: "fedapay",
                transaction_id: transaction.id
            },
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: err.message
                    });
                }

                res.json({
                    message: "Paiement créé",
                    payment_url: paymentUrl,
                    payment_id: result.insertId
                });
            }
        );
    } catch (error) {
        console.log("ERREUR FedaPay COMPLETE :");
        console.log(error.response?.data);
        console.log(error.message);
        console.log(error);

        return res.status(500).json({
            message: error.message
        });
    }
};

// ==================================
// Valider un paiement
// ==================================
exports.validatePayment = (req, res) => {
    const { payment_id } = req.body;

    if (!payment_id) {
        return res.status(400).json({
            message: "payment_id manquant"
        });
    }

    Payment.getById(payment_id, (err, payment) => {
        if (err) {
            return res.status(500).json({
                message: "Erreur récupération paiement"
            });
        }

        if (!payment || payment.length === 0) {
            return res.status(404).json({
                message: "Paiement introuvable"
            });
        }

        const data = payment[0];

        Payment.updateStatus(payment_id, "success", (err) => {
            if (err) {
                return res.status(500).json({
                    message: "Erreur validation paiement"
                });
            }

            TournamentPlayer.updatePaymentStatus(
                data.player_id,
                data.tournament_id,
                async (err) => {
                    if (err) {
                        return res.status(500).json({
                            message: "Erreur mise à jour joueur"
                        });
                    }

                    try {
                        await checkTournamentReady(data.tournament_id);
                        return res.json({
                            message: "Paiement validé."
                        });
                    } catch (error) {
                        console.log(error);
                        return res.status(500).json(error);
                    }
                }
            );
        });
    });
};

// ==================================
// Webhook FedaPay
// ==================================
exports.webhook = (req, res) => {
    console.log("========== WEBHOOK FEDAPAY ==========");
    console.log(req.body);
    const event = req.body;

    console.log("Webhook FedaPay reçu :", event);

    if (
        event.name === "transaction.approved" ||
        event.event === "transaction.approved"
    ) {
        const transactionId = event.data?.id || event.transaction?.id;

        if (!transactionId) {
            return res.status(400).json({
                message: "Transaction ID manquant"
            });
        }

        const sql = `
            SELECT *
            FROM payments
            WHERE transaction_id = ?
        `;

        db.query(sql, [transactionId], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json(err);
            }

            if (result.length === 0) {
                return res.status(404).json({
                    message: "Paiement introuvable"
                });
            }

            const payment = result[0];

            if (payment.status === "success") {
                return res.json({
                    message: "Paiement déjà validé"
                });
            }

            Payment.updateStatus(payment.id, "success", (err) => {
                if (err) {
                    return res.status(500).json(err);
                }

                TournamentPlayer.updatePaymentStatus(
                    payment.player_id,
                    payment.tournament_id,
                    async (err) => {
                        if (err) {
                            return res.status(500).json(err);
                        }

                        console.log("Paiement FedaPay validé automatiquement");

                        try {
                            await checkTournamentReady(payment.tournament_id);
                        } catch (error) {
                            console.log(error);
                        }

                        return res.json({
                            received: true
                        });
                    }
                );
            });
        });
    } else {
        return res.json({ received: true });
    }
};