const Room = require("../models/Room");
const db = require("../config/database");


// ==========================================
// 🔐 CRÉATION D'UNE SALLE
// ==========================================

exports.createRoom = (req, res) => {

    const { match_id } = req.body;
    const userId = req.user.id;

    if (!match_id) {
        return res.status(400).json({
            message: "Match requis"
        });
    }

    // Vérifier que le joueur connecté
    // participe réellement à ce match
    db.query(
        `
        SELECT id, player_one, player_two, status
        FROM matches
        WHERE id = ?
        LIMIT 1
        `,
        [match_id],
        (err, matches) => {

            if (err) {
                console.error(
                    "ERREUR VÉRIFICATION MATCH :",
                    err
                );

                return res.status(500).json({
                    message: "Erreur serveur"
                });
            }

            if (matches.length === 0) {
                return res.status(404).json({
                    message: "Match introuvable"
                });
            }

            const match = matches[0];

            const isPlayer =
                Number(match.player_one) === Number(userId) ||
                Number(match.player_two) === Number(userId);

            if (!isPlayer) {
                return res.status(403).json({
                    message:
                        "Vous ne participez pas à ce match"
                });
            }

            // Le joueur connecté devient automatiquement
            // le host de la salle.
            Room.create(
                {
                    match_id: match.id,
                    host_player: userId,
                    guest_player:
                        Number(match.player_one) === Number(userId)
                            ? match.player_two
                            : match.player_one
                },
                (err, result) => {

                    if (err) {

                        console.error(
                            "ERREUR CRÉATION SALLE :",
                            err
                        );

                        return res.status(500).json({
                            message:
                                "Erreur création salle"
                        });
                    }

                    return res.json({
                        message: "Salle créée",
                        room_id: result.insertId
                    });

                }
            );

        }
    );

};


// ==========================================
// 🔐 AJOUTER LE CODE eFOOTBALL
// ==========================================

exports.addCode = (req, res) => {

    const { room_id, room_code } = req.body;
    const userId = req.user.id;

    if (!room_id || !room_code) {
        return res.status(400).json({
            message:
                "Identifiant de salle et code requis"
        });
    }

    // Vérifier que l'utilisateur connecté
    // est bien le propriétaire de la salle
    db.query(
        `
        SELECT id, match_id, host_player
        FROM rooms
        WHERE id = ?
        LIMIT 1
        `,
        [room_id],
        (err, rooms) => {

            if (err) {
                console.error(
                    "ERREUR VÉRIFICATION SALLE :",
                    err
                );

                return res.status(500).json({
                    message: "Erreur serveur"
                });
            }

            if (rooms.length === 0) {
                return res.status(404).json({
                    message: "Salle introuvable"
                });
            }

            const room = rooms[0];

            if (
                Number(room.host_player) !==
                Number(userId)
            ) {
                return res.status(403).json({
                    message:
                        "Seul le créateur de la salle peut ajouter le code"
                });
            }

            Room.addCode(
                {
                    room_id: room.id,
                    room_code: room_code.toString().trim()
                },
                (err) => {

                    if (err) {

                        console.error(
                            "ERREUR AJOUT CODE :",
                            err
                        );

                        return res.status(500).json({
                            message:
                                "Erreur ajout du code"
                        });
                    }

                    return res.json({
                        message: "Code ajouté"
                    });

                }
            );

        }
    );

};


// ==========================================
// 🔐 VOIR UNE SALLE
// ==========================================

exports.getRoom = (req, res) => {

    const matchId = req.params.id;
    const userId = req.user.id;

    db.query(
        `
        SELECT
            m.player_one,
            m.player_two
        FROM matches m
        WHERE m.id = ?
        LIMIT 1
        `,
        [matchId],
        (err, matches) => {

            if (err) {
                return res.status(500).json({
                    message: "Erreur serveur"
                });
            }

            if (matches.length === 0) {
                return res.status(404).json({
                    message: "Match introuvable"
                });
            }

            const match = matches[0];

            const isPlayer =
                Number(match.player_one) === Number(userId) ||
                Number(match.player_two) === Number(userId);

            if (!isPlayer) {
                return res.status(403).json({
                    message:
                        "Vous ne participez pas à ce match"
                });
            }

            Room.getRoom(
                matchId,
                (err, result) => {

                    if (err) {

                        console.error(
                            "ERREUR CHARGEMENT SALLE :",
                            err
                        );

                        return res.status(500).json({
                            message:
                                "Erreur chargement salle"
                        });
                    }

                    if (
                        !result ||
                        result.length === 0
                    ) {
                        return res.status(404).json({
                            message:
                                "Salle introuvable"
                        });
                    }

                    return res.json(result[0]);

                }
            );

        }
    );

};


// ==========================================
// 🔐 VOIR LES SALLES
// ==========================================

exports.getAllRooms = (req, res) => {

    // Cette route était auparavant capable de retourner
    // toutes les salles, y compris leurs codes.
    //
    // On ne renvoie maintenant que les salles
    // auxquelles le joueur connecté participe.

    const userId = req.user.id;

    db.query(
        `
        SELECT
            rooms.id,
            rooms.match_id,
            rooms.host_player,
            rooms.guest_player,
            rooms.room_code,
            rooms.status,
            u1.pseudo AS host_name,
            u2.pseudo AS guest_name
        FROM rooms

        LEFT JOIN users u1
            ON rooms.host_player = u1.id

        LEFT JOIN users u2
            ON rooms.guest_player = u2.id

        WHERE rooms.host_player = ?
           OR rooms.guest_player = ?

        ORDER BY rooms.id DESC
        `,
        [userId, userId],
        (err, result) => {

            if (err) {

                console.error(
                    "ERREUR CHARGEMENT SALLES :",
                    err
                );

                return res.status(500).json({
                    message:
                        "Erreur chargement salles"
                });
            }

            return res.json(result);

        }
    );

};