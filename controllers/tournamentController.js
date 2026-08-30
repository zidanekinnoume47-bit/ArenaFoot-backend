const Tournament = require("../models/Tournament");
const TournamentPlayer = require("../models/TournamentPlayer");
const db = require("../config/database");

// Créer un tournoi
exports.createTournament = (req, res) => {
    const data = req.body;

    Tournament.create(data, (err, result) => {
        if(err){
            return res.status(500).json({
                message:"Erreur lors de la création du tournoi"
            });
        }

        res.json({
            message:"Tournoi créé avec succès"
        });
    });
};

// Afficher tous les tournois
exports.getTournaments = (req, res) => {
    Tournament.getAll((err, result) => {
       if (err) {
            console.log("ERREUR SQL :", err);
            return res.status(500).json({
                message: "Erreur lors du chargement des tournois",
                error: err.message
            });
        }
        res.json(result);
    });
};

// Détail tournoi
exports.getTournament = (req, res) => {
    Tournament.getById(
        req.params.id,
        (err, result) => {
            if(err){
                return res.status(500).json({
                    message:"Erreur chargement tournoi"
                });
            }
            res.json(result[0]);
        }
    );
};

// Inscription tournoi
// ==========================================
// INSCRIPTION À UN TOURNOI
// ==========================================

exports.joinTournament = (req, res) => {

    // 🔐 Identité récupérée depuis le JWT
    const user_id = req.user.id;

    const tournament_id = req.body.tournament_id;

    if (!tournament_id) {
        return res.status(400).json({
            message: "Tournoi requis"
        });
    }

    // ==========================================
    // Récupérer le tournoi
    // ==========================================

    Tournament.getById(
        tournament_id,
        (err, tournament) => {

            if (err) {

                console.error(
                    "Erreur récupération tournoi :",
                    err
                );

                return res.status(500).json({
                    message: "Erreur récupération tournoi"
                });
            }

            if (
                !tournament ||
                tournament.length === 0
            ) {

                return res.status(404).json({
                    message: "Tournoi introuvable"
                });
            }

            const currentTournament =
                tournament[0];

            // ==========================================
            // Vérifier le statut du tournoi
            // ==========================================

            if (
                currentTournament.status === "finished" ||
                currentTournament.status === "full"
            ) {

                return res.status(400).json({
                    message: "Tournoi complet ou terminé"
                });
            }

            // ==========================================
            // Vérifier si le joueur est déjà inscrit
            // ==========================================

            const payload = {
                tournament_id,
                user_id,
                player_id: user_id
            };

            TournamentPlayer.getPlayer(
                payload,
                (err, existingPlayer) => {

                    if (err) {

                        console.error(
                            "Erreur vérification inscription :",
                            err
                        );

                        return res.status(500).json({
                            message:
                                "Erreur vérification inscription"
                        });
                    }

                    if (
                        existingPlayer &&
                        existingPlayer.length > 0
                    ) {

                        const registration =
                            existingPlayer[0];

                        // Déjà payé
                        if (
                            registration.payment_status ===
                            "paid"
                        ) {

                            return res.status(400).json({
                                message:
                                    "Vous êtes déjà inscrit à ce tournoi."
                            });
                        }

                        // Inscription en attente de paiement
                        return res.status(400).json({
                            message:
                                "Vous avez déjà une inscription en attente de paiement."
                        });
                    }

                    // ==========================================
                    // Compter les joueurs PAYÉS
                    // ==========================================

                    TournamentPlayer.countPlayers(
                        tournament_id,
                        (err, count) => {

                            if (err) {

                                console.error(
                                    "Erreur comptage joueurs :",
                                    err
                                );

                                return res.status(500).json({
                                    message:
                                        "Erreur comptage joueurs"
                                });
                            }

                            const total =
                                Number(
                                    count[0]?.total || 0
                                );

                            const limit =
                                Number(
                                    currentTournament.players_limit ||
                                    16
                                );

                            // ==========================================
                            // Tournoi complet
                            // ==========================================

                            if (total >= limit) {

                                return res.status(400).json({
                                    message:
                                        "Tournoi complet"
                                });
                            }

                            // ==========================================
                            // Créer l'inscription en attente
                            // ==========================================

                            TournamentPlayer.join(
                                payload,
                                (err, result) => {

                                    if (err) {

                                        console.error(
                                            "ERREUR JOIN :",
                                            err
                                        );

                                        return res.status(500).json({
                                            message:
                                                "Erreur inscription"
                                        });
                                    }

                                    return res.json({
                                        message:
                                            "Inscription créée. Veuillez effectuer le paiement.",
                                        tournament_id,
                                        player_id: user_id
                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );
};

// Tournois d'un joueur
exports.getPlayerTournaments = (req, res) => {
    const player_id = req.params.id;

    TournamentPlayer.getPlayerTournaments(
        player_id,
        (err, result) => {
            if (err) {
                console.log("ERREUR SQL :", err);
                return res.status(500).json({
                    message: err.message
                });
            }
            res.json(result);
        }
    );
};

// Joueurs d'un tournoi
exports.getTournamentPlayers = (req, res) => {
    const tournament_id = req.params.id;

    TournamentPlayer.getPlayersByTournament(
        tournament_id,
        (err, result) => {
            if(err){
                return res.status(500).json({
                    message:"Erreur chargement participants"
                });
            }
            res.json(result);
        }
    );
};

// 🏆 RÈGUE DU BRACKET : Récupérer tous les matchs avec pseudos des joueurs (Route Publique)
exports.getBracket = (req, res) => {
    const tournament_id = req.params.id;

    const sql = `
        SELECT 
            m.id,
            m.tournament_id,
            m.round,
            m.status,
            m.winner,
            m.player_one,
            m.player_two,
            u1.pseudo AS player_one_pseudo,
            u2.pseudo AS player_two_pseudo
        FROM matches m
        LEFT JOIN users u1 ON m.player_one = u1.id
        LEFT JOIN users u2 ON m.player_two = u2.id
        WHERE m.tournament_id = ?
        ORDER BY m.id ASC
    `;

    db.query(sql, [tournament_id], (err, result) => {
        if (err) {
            console.error("Erreur récupération bracket :", err);
            return res.status(500).json({
                message: "Erreur lors de la récupération des matchs du bracket",
                error: err.message
            });
        }
        res.json(result);
    });
};