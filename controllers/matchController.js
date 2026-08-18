const Match = require("../models/Match");
const db = require("../config/database");
const Reward = require("../models/Reward");

// ==================================
// Réinitialiser un tournoi
// ==================================
const resetTournament = (tournamentId, callback) => {
    db.query(
        `DELETE FROM rooms WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = ?)`,
        [tournamentId],
        (err) => {
            if (err) return callback(err);
            db.query(`DELETE FROM matches WHERE tournament_id = ?`, [tournamentId], (err) => {
                if (err) return callback(err);
                db.query(`DELETE FROM tournament_players WHERE tournament_id = ?`, [tournamentId], (err) => {
                    if (err) return callback(err);
                    db.query(
                        `UPDATE tournaments SET status='open', winner_id=NULL WHERE id=?`,
                        [tournamentId],
                        callback
                    );
                });
            });
        }
    );
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};


// Générer les matchs d'un tournoi
// eFootball = 16 joueurs
// Call of Duty = 32 joueurs
// ==================================
exports.generateMatches = (req, res) => {

    const tournament_id = req.params.id;

    console.log("========== GENERATE MATCHES ==========");

    // Vérifier le jeu du tournoi
    db.query(
        `SELECT game, players_limit FROM tournaments WHERE id = ?`,
        [tournament_id],
        (err, tournament) => {

            if (err) return res.status(500).json(err);

            if (tournament.length === 0) {
                return res.status(404).json({
                    message: "Tournoi introuvable"
                });
            }

            const game = tournament[0].game;

            // =====================================================
            // 🔫 CALL OF DUTY — 32 JOUEURS
            // =====================================================
            if (game === "call_of_duty") {

                const checkSql = `
                    SELECT id
                    FROM matches
                    WHERE tournament_id = ?
                    LIMIT 1
                `;

                db.query(checkSql, [tournament_id], (err, exists) => {

                    if (err) return res.status(500).json(err);

                    if (exists.length > 0) {
                        return res.json({
                            message: "Bracket déjà généré"
                        });
                    }

                    db.query(
                        `
                        SELECT player_id
                        FROM tournament_players
                        WHERE tournament_id = ?
                        AND payment_status = 'paid'
                        `,
                        [tournament_id],
                        (err, players) => {

                            if (err) return res.status(500).json(err);

                            if (players.length !== 32) {
                                return res.status(400).json({
                                    message:
                                        `Le tournoi Call of Duty nécessite exactement 32 joueurs payés. Actuellement : ${players.length}`
                                });
                            }

                            const shuffledPlayers =
                                shuffleArray([...players])
                                .map(player => player.player_id);

                            const matches = [];

                            // =================================================
                            // 1️⃣ 16e DE FINALE — 16 MATCHS
                            // =================================================

                            for (let i = 0; i < 16; i++) {

                                matches.push({
                                    tournament_id,
                                    player_one: shuffledPlayers[i * 2],
                                    player_two: shuffledPlayers[i * 2 + 1],
                                    round: "Seizième de finale",
                                    position: i + 1,
                                    next_slot: i % 2 === 0 ? 1 : 2
                                });

                            }

                            // =================================================
                            // 2️⃣ 8e DE FINALE — 8 MATCHS
                            // =================================================

                            for (let i = 0; i < 8; i++) {

                                matches.push({
                                    tournament_id,
                                    player_one: null,
                                    player_two: null,
                                    round: "Huitième de finale",
                                    position: i + 1,
                                    next_slot: i % 2 === 0 ? 1 : 2
                                });

                            }

                            // =================================================
                            // 3️⃣ QUARTS — 4 MATCHS
                            // =================================================

                            for (let i = 0; i < 4; i++) {

                                matches.push({
                                    tournament_id,
                                    player_one: null,
                                    player_two: null,
                                    round: "Quart de finale",
                                    position: i + 1,
                                    next_slot: i % 2 === 0 ? 1 : 2
                                });

                            }

                            // =================================================
                            // 4️⃣ DEMI-FINALES — 2 MATCHS
                            // =================================================

                            for (let i = 0; i < 2; i++) {

                                matches.push({
                                    tournament_id,
                                    player_one: null,
                                    player_two: null,
                                    round: "Demi-finale",
                                    position: i + 1,
                                    next_slot: i === 0 ? 1 : 2
                                });

                            }

                            // =================================================
                            // 🥉 MATCH POUR LA 3e PLACE
                            // =================================================

                            matches.push({
                                tournament_id,
                                player_one: null,
                                player_two: null,
                                round: "Match pour la 3e place",
                                position: 1,
                                next_slot: null
                            });

                            // =================================================
                            // 🏆 FINALE
                            // =================================================

                            matches.push({
                                tournament_id,
                                player_one: null,
                                player_two: null,
                                round: "Finale",
                                position: 1,
                                next_slot: null
                            });

                            // =================================================
                            // CREATION DES 31 MATCHS
                            // =================================================

                            Match.createMultiple(
                                matches,
                                (err, result) => {

                                    if (err) {
                                        console.error(err);

                                        return res.status(500).json(err);
                                    }

                                    const firstId = result.insertId;
                                    const queries = [];

                                    // ==========================================
                                    // 16e → 8e
                                    // ==========================================

                                    for (let pos = 1; pos <= 16; pos++) {

                                        const currentId =
                                            firstId + pos - 1;

                                        const nextPosition =
                                            Math.ceil(pos / 2);

                                        const nextId =
                                            firstId + 16 + nextPosition - 1;

                                        const slot =
                                            pos % 2 === 1 ? 1 : 2;

                                        queries.push(
                                            new Promise((resolve, reject) => {

                                                db.query(
                                                    `
                                                    UPDATE matches
                                                    SET next_match_id = ?,
                                                        next_slot = ?
                                                    WHERE id = ?
                                                    `,
                                                    [
                                                        nextId,
                                                        slot,
                                                        currentId
                                                    ],
                                                    err =>
                                                        err
                                                            ? reject(err)
                                                            : resolve()
                                                );

                                            })
                                        );
                                    }

                                    // ==========================================
                                    // 8e → quarts
                                    // ==========================================

                                    for (let pos = 1; pos <= 8; pos++) {

                                        const currentId =
                                            firstId + 16 + pos - 1;

                                        const nextPosition =
                                            Math.ceil(pos / 2);

                                        const nextId =
                                            firstId + 24 + nextPosition - 1;

                                        const slot =
                                            pos % 2 === 1 ? 1 : 2;

                                        queries.push(
                                            new Promise((resolve, reject) => {

                                                db.query(
                                                    `
                                                    UPDATE matches
                                                    SET next_match_id = ?,
                                                        next_slot = ?
                                                    WHERE id = ?
                                                    `,
                                                    [
                                                        nextId,
                                                        slot,
                                                        currentId
                                                    ],
                                                    err =>
                                                        err
                                                            ? reject(err)
                                                            : resolve()
                                                );

                                            })
                                        );
                                    }

                                    // ==========================================
                                    // Quarts → demies
                                    // ==========================================

                                    for (let pos = 1; pos <= 4; pos++) {

                                        const currentId =
                                            firstId + 24 + pos - 1;

                                        const nextPosition =
                                            Math.ceil(pos / 2);

                                        const nextId =
                                            firstId + 28 + nextPosition - 1;

                                        const slot =
                                            pos % 2 === 1 ? 1 : 2;

                                        queries.push(
                                            new Promise((resolve, reject) => {

                                                db.query(
                                                    `
                                                    UPDATE matches
                                                    SET next_match_id = ?,
                                                        next_slot = ?
                                                    WHERE id = ?
                                                    `,
                                                    [
                                                        nextId,
                                                        slot,
                                                        currentId
                                                    ],
                                                    err =>
                                                        err
                                                            ? reject(err)
                                                            : resolve()
                                                );

                                            })
                                        );
                                    }

                                    // ==========================================
                                    // Demies → finale
                                    // ==========================================

                                    const semi1 = firstId + 28;
                                    const semi2 = firstId + 29;

                                    const thirdPlace = firstId + 30;
                                    const final = firstId + 31;

                                    queries.push(
                                        new Promise((resolve, reject) => {

                                            db.query(
                                                `
                                                UPDATE matches
                                                SET next_match_id = ?,
                                                    next_slot = 1
                                                WHERE id = ?
                                                `,
                                                [final, semi1],
                                                err =>
                                                    err
                                                        ? reject(err)
                                                        : resolve()
                                            );

                                        })
                                    );

                                    queries.push(
                                        new Promise((resolve, reject) => {

                                            db.query(
                                                `
                                                UPDATE matches
                                                SET next_match_id = ?,
                                                    next_slot = 2
                                                WHERE id = ?
                                                `,
                                                [final, semi2],
                                                err =>
                                                    err
                                                        ? reject(err)
                                                        : resolve()
                                            );

                                        })
                                    );

                                    // ==========================================
                                    // FIN DES LIENS
                                    // ==========================================

                                    Promise.all(queries)
                                        .then(() => {

                                            res.status(201).json({
                                                message:
                                                    "🏆 Bracket Call of Duty généré avec 32 joueurs !",
                                                matches_created: 31
                                            });

                                        })
                                        .catch(error => {

                                            console.error(
                                                "Erreur création liens :",
                                                error
                                            );

                                            res.status(500).json({
                                                message:
                                                    "Erreur lors de la création du bracket"
                                            });

                                        });

                                }
                            );

                        }
                    );
                });

                return;
            }

            // =====================================================
            // ⚽ EFOOTBALL
            // ON CONSERVE TON ANCIEN CODE
            // =====================================================

            // 👉 Ici tu gardes EXACTEMENT ton ancien code
            // à partir de :
            //
            // const checkSql = `SELECT id FROM matches...
            //
            // jusqu'à la fin de ton ancien generateMatches.

        }
    );
};

exports.generateCallOfDutyMatches = (tournament_id, res) => {

    const sql = `
        SELECT player_id
        FROM tournament_players
        WHERE tournament_id = ?
        AND payment_status = 'paid'
    `;

    db.query(sql, [tournament_id], (err, players) => {

        if (err) {
            return res.status(500).json(err);
        }

        // ==================================
        // COD = EXACTEMENT 32 JOUEURS
        // ==================================

        if (players.length !== 32) {

            return res.status(400).json({
                message:
                    `Le tournoi Call of Duty nécessite exactement 32 joueurs payés (actuellement : ${players.length})`
            });

        }

        const shuffledPlayers = shuffleArray(
            [...players]
        ).map(player => player.player_id);

        const matches = [];

        // ==================================
        // 1/16 FINALE
        // 16 MATCHS
        // ==================================

        for (let i = 0; i < 16; i++) {

            matches.push({

                tournament_id,

                player_one:
                    shuffledPlayers[i * 2],

                player_two:
                    shuffledPlayers[i * 2 + 1],

                round:
                    "Seizième de finale",

                position:
                    i + 1,

                next_slot:
                    i % 2 === 0 ? 1 : 2

            });

        }

        // ==================================
        // 1/8 FINALE
        // 8 MATCHS
        // ==================================

        for (let i = 0; i < 8; i++) {

            matches.push({

                tournament_id,

                player_one: null,

                player_two: null,

                round:
                    "Huitième de finale",

                position:
                    i + 1,

                next_slot:
                    i % 2 === 0 ? 1 : 2

            });

        }

        // ==================================
        // QUARTS
        // 4 MATCHS
        // ==================================

        for (let i = 0; i < 4; i++) {

            matches.push({

                tournament_id,

                player_one: null,

                player_two: null,

                round:
                    "Quart de finale",

                position:
                    i + 1,

                next_slot:
                    i % 2 === 0 ? 1 : 2

            });

        }

        // ==================================
        // DEMI-FINALES
        // 2 MATCHS
        // ==================================

        for (let i = 0; i < 2; i++) {

            matches.push({

                tournament_id,

                player_one: null,

                player_two: null,

                round:
                    "Demi-finale",

                position:
                    i + 1,

                next_slot:
                    i === 0 ? 1 : 2

            });

        }

        // ==================================
        // FINALE
        // ==================================

        matches.push({

            tournament_id,

            player_one: null,

            player_two: null,

            round:
                "Finale",

            position: 1,

            next_slot: null

        });

        // ==================================
        // PETITE FINALE
        // ==================================

        matches.push({

            tournament_id,

            player_one: null,

            player_two: null,

            round:
                "Petite finale",

            position: 1,

            next_slot: null

        });

        // ==================================
        // INSERTION
        // ==================================

        Match.createMultiple(
            matches,
            (err, result) => {

                if (err) {

                    console.error(
                        "Erreur création bracket COD :",
                        err
                    );

                    return res.status(500).json(err);
                }

                const firstId =
                    result.insertId;

                const queries = [];

                // ==================================
                // ID DES TOURS
                // ==================================

                const firstRoundStart =
                    firstId;

                const eighthStart =
                    firstId + 16;

                const quarterStart =
                    firstId + 24;

                const semiStart =
                    firstId + 28;

                const finalId =
                    firstId + 30;

                const thirdPlaceId =
                    firstId + 31;


                // ==================================
                // 1/16 → 1/8
                // ==================================

                for (let pos = 1; pos <= 16; pos++) {

                    const currentId =
                        firstRoundStart + pos - 1;

                    const targetId =
                        eighthStart +
                        Math.floor((pos - 1) / 2);

                    const slot =
                        pos % 2 === 1
                            ? 1
                            : 2;

                    queries.push(
                        new Promise((resolve, reject) => {

                            db.query(
                                `
                                UPDATE matches
                                SET
                                    next_match_id = ?,
                                    next_slot = ?
                                WHERE id = ?
                                `,
                                [
                                    targetId,
                                    slot,
                                    currentId
                                ],
                                err =>
                                    err
                                        ? reject(err)
                                        : resolve()
                            );

                        })
                    );
                }


                // ==================================
                // 1/8 → QUARTS
                // ==================================

                for (let pos = 1; pos <= 8; pos++) {

                    const currentId =
                        eighthStart + pos - 1;

                    const targetId =
                        quarterStart +
                        Math.floor((pos - 1) / 2);

                    const slot =
                        pos % 2 === 1
                            ? 1
                            : 2;

                    queries.push(
                        new Promise((resolve, reject) => {

                            db.query(
                                `
                                UPDATE matches
                                SET
                                    next_match_id = ?,
                                    next_slot = ?
                                WHERE id = ?
                                `,
                                [
                                    targetId,
                                    slot,
                                    currentId
                                ],
                                err =>
                                    err
                                        ? reject(err)
                                        : resolve()
                            );

                        })
                    );
                }


                // ==================================
                // QUARTS → DEMI
                // ==================================

                for (let pos = 1; pos <= 4; pos++) {

                    const currentId =
                        quarterStart + pos - 1;

                    const targetId =
                        semiStart +
                        Math.floor((pos - 1) / 2);

                    const slot =
                        pos % 2 === 1
                            ? 1
                            : 2;

                    queries.push(
                        new Promise((resolve, reject) => {

                            db.query(
                                `
                                UPDATE matches
                                SET
                                    next_match_id = ?,
                                    next_slot = ?
                                WHERE id = ?
                                `,
                                [
                                    targetId,
                                    slot,
                                    currentId
                                ],
                                err =>
                                    err
                                        ? reject(err)
                                        : resolve()
                            );

                        })
                    );
                }


                // ==================================
                // DEMI → FINALE
                // ==================================

                for (let pos = 1; pos <= 2; pos++) {

                    const currentId =
                        semiStart + pos - 1;

                    queries.push(
                        new Promise((resolve, reject) => {

                            db.query(
                                `
                                UPDATE matches
                                SET
                                    next_match_id = ?,
                                    next_slot = ?
                                WHERE id = ?
                                `,
                                [
                                    finalId,
                                    pos,
                                    currentId
                                ],
                                err =>
                                    err
                                        ? reject(err)
                                        : resolve()
                            );

                        })
                    );

                }


                // ==================================
                // EXÉCUTER LES LIENS
                // ==================================

                Promise.all(queries)

                    .then(() => {

                        console.log(
                            "Bracket COD créé :",
                            matches.length,
                            "matchs"
                        );

                        return res.status(201).json({

                            message:
                                "🎮 Bracket Call of Duty 32 joueurs créé avec succès !",

                            matches_created:
                                matches.length,

                            structure: {

                                seizieme:
                                    16,

                                huitieme:
                                    8,

                                quart:
                                    4,

                                demi:
                                    2,

                                finale:
                                    1,

                                petite_finale:
                                    1

                            }

                        });

                    })

                    .catch(error => {

                        console.error(
                            "Erreur liaison bracket COD :",
                            error
                        );

                        return res.status(500).json({
                            message:
                                "Erreur lors de la création des liens du bracket COD"
                        });

                    });

            }
        );

    });

};


const generateEfootballBracket = (tournament_id, res) => {

    const sql = `
        SELECT player_id
        FROM tournament_players
        WHERE tournament_id = ?
        AND payment_status = 'paid'
    `;

    db.query(sql, [tournament_id], (err, players) => {

        if (err) {
            return res.status(500).json(err);
        }

        if (players.length !== 16) {

            return res.status(400).json({

                message:
                    `Le tournoi eFootball nécessite exactement 16 joueurs payés (actuellement : ${players.length})`

            });

        }

        const shuffledPlayers =
            shuffleArray([...players])
                .map(player => player.player_id);

        const matches = [];

        // ==================================
        // 1/8
        // ==================================

        for (let i = 0; i < 8; i++) {

            matches.push({

                tournament_id,

                player_one:
                    shuffledPlayers[i * 2],

                player_two:
                    shuffledPlayers[i * 2 + 1],

                round:
                    "Huitième de finale",

                position:
                    i + 1,

                next_slot:
                    i % 2 === 0 ? 1 : 2

            });

        }

        // ==================================
        // QUARTS
        // ==================================

        for (let i = 0; i < 4; i++) {

            matches.push({

                tournament_id,

                player_one: null,

                player_two: null,

                round:
                    "Quart de finale",

                position:
                    i + 1,

                next_slot:
                    i % 2 === 0 ? 1 : 2

            });

        }

        // ==================================
        // DEMI
        // ==================================

        for (let i = 0; i < 2; i++) {

            matches.push({

                tournament_id,

                player_one: null,

                player_two: null,

                round:
                    "Demi-finale",

                position:
                    i + 1,

                next_slot:
                    i === 0 ? 1 : 2

            });

        }

        // ==================================
        // FINALE
        // ==================================

        matches.push({

            tournament_id,

            player_one: null,

            player_two: null,

            round:
                "Finale",

            position: 1,

            next_slot: null

        });

        Match.createMultiple(
            matches,
            (err, result) => {

                if (err) {
                    return res.status(500).json(err);
                }

                const firstId =
                    result.insertId;

                const queries = [];

                // 1/8 → quarts
                for (let pos = 1; pos <= 8; pos++) {

                    const currentId =
                        firstId + pos - 1;

                    const targetId =
                        firstId +
                        7 +
                        Math.ceil(pos / 2);

                    const slot =
                        pos % 2 === 1 ? 1 : 2;

                    queries.push(
                        new Promise((resolve, reject) => {

                            db.query(
                                `
                                UPDATE matches
                                SET
                                    next_match_id = ?,
                                    next_slot = ?
                                WHERE id = ?
                                `,
                                [
                                    targetId,
                                    slot,
                                    currentId
                                ],
                                err =>
                                    err
                                        ? reject(err)
                                        : resolve()
                            );

                        })
                    );

                }

                // quarts → demi
                for (let pos = 1; pos <= 4; pos++) {

                    const currentId =
                        firstId + 7 + pos;

                    const targetId =
                        firstId +
                        11 +
                        Math.ceil(pos / 2);

                    const slot =
                        pos % 2 === 1 ? 1 : 2;

                    queries.push(
                        new Promise((resolve, reject) => {

                            db.query(
                                `
                                UPDATE matches
                                SET
                                    next_match_id = ?,
                                    next_slot = ?
                                WHERE id = ?
                                `,
                                [
                                    targetId,
                                    slot,
                                    currentId
                                ],
                                err =>
                                    err
                                        ? reject(err)
                                        : resolve()
                            );

                        })
                    );

                }

                // demi → finale
                for (let pos = 1; pos <= 2; pos++) {

                    const currentId =
                        firstId + 11 + pos;

                    const finalId =
                        firstId + 14;

                    queries.push(
                        new Promise((resolve, reject) => {

                            db.query(
                                `
                                UPDATE matches
                                SET
                                    next_match_id = ?,
                                    next_slot = ?
                                WHERE id = ?
                                `,
                                [
                                    finalId,
                                    pos,
                                    currentId
                                ],
                                err =>
                                    err
                                        ? reject(err)
                                        : resolve()
                            );

                        })
                    );

                }

                Promise.all(queries)

                    .then(() => {

                        return res.status(201).json({

                            message:
                                "⚽ Bracket eFootball créé avec succès !",

                            matches_created:
                                matches.length

                        });

                    })

                    .catch(error => {

                        console.error(error);

                        return res.status(500).json({
                            message:
                                "Erreur lors de la liaison du bracket eFootball"
                        });

                    });

            }
        );

    });

};


// ==================================
// Récupérer les matchs d'un tournoi
// ==================================
exports.getTournamentMatches = (req, res) => {
    const tournament_id = req.params.id;
    Match.getTournamentMatches(tournament_id, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

// ==================================
// Récupérer le bracket complet
// ==================================
exports.getBracket = (req, res) => {
    const tournament_id = req.params.id;
   const sql = `
SELECT
    matches.id,
    matches.tournament_id,
    matches.round,
    matches.position,
    matches.player_one,
    matches.player_two,
    matches.winner,
    matches.score,
    matches.status,
    matches.next_match_id,
    matches.next_slot,

    u1.pseudo AS player_one_name,
    u2.pseudo AS player_two_name

FROM matches

LEFT JOIN users u1
ON matches.player_one = u1.id

LEFT JOIN users u2
ON matches.player_two = u2.id

WHERE matches.tournament_id = ?

ORDER BY
CASE matches.round
    WHEN 'Huitième de finale' THEN 1
    WHEN 'Quart de finale' THEN 2
    WHEN 'Demi-finale' THEN 3
    WHEN 'Finale' THEN 4
END,
matches.position ASC
`;
    db.query(sql, [tournament_id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

// ==================================
// Prochain match d'un joueur
// ==================================
exports.getPlayerNextMatch = (req, res) => {
    const player_id = req.params.id;
    const sql = `
        SELECT
            matches.id,
            matches.tournament_id,
            matches.round,
            matches.player_one,
            matches.player_two,
            matches.status,
            matches.score,
            u1.pseudo AS player_one_name,
            u2.pseudo AS player_two_name
        FROM matches
        LEFT JOIN users u1 ON matches.player_one = u1.id
        LEFT JOIN users u2 ON matches.player_two = u2.id
        WHERE (matches.player_one = ? OR matches.player_two = ?)
        AND matches.status = 'pending'
        AND matches.winner IS NULL
        ORDER BY matches.id ASC
        LIMIT 1
    `;
    db.query(sql, [player_id, player_id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.json(null);
        res.json(result[0]);
    });
};

// ==================================
// Terminer un match
// eFootball + Call of Duty
// ==================================
// ==================================
// Terminer un match
// COD + eFootball
// ==================================
exports.finishMatch = (req, res) => {

    const { match_id, winner, score } = req.body;

    if (!match_id || !winner || !score) {
        return res.status(400).json({
            message: "Informations match incomplètes"
        });
    }

    Match.getById(match_id, (err, result) => {

        if (err) return res.status(500).json(err);

        if (result.length === 0) {
            return res.status(404).json({
                message: "Match introuvable"
            });
        }

        const match = result[0];

        // Joueur perdant
        const loser =
            Number(match.player_one) === Number(winner)
                ? match.player_two
                : match.player_one;


        Match.updateWinner(
            {
                match_id,
                winner,
                score
            },
            (err) => {

                if (err) {
                    return res.status(500).json(err);
                }


                // =====================================================
                // Vérifier le jeu du tournoi
                // =====================================================

                db.query(
                    `
                    SELECT game
                    FROM tournaments
                    WHERE id = ?
                    `,
                    [match.tournament_id],
                    (err, tournament) => {

                        if (err) {
                            return res.status(500).json(err);
                        }

                        const game =
                            tournament[0]?.game || "efootball";


                        // =====================================================
                        // 🔫 CALL OF DUTY
                        // =====================================================

                        if (game === "call_of_duty") {


                            // =================================================
                            // 🏆 FINALE COD
                            // =================================================

                            if (match.round === "Finale") {

                                const FIRST_PRIZE = 50000;
                                const SECOND_PRIZE = 18000;

                                db.query(
                                    `
                                    UPDATE tournaments
                                    SET winner_id = ?,
                                        status = 'finished'
                                    WHERE id = ?
                                    `,
                                    [
                                        winner,
                                        match.tournament_id
                                    ],
                                    (err) => {

                                        if (err) {
                                            return res.status(500).json(err);
                                        }


                                        // -------------------------------
                                        // Récupérer les téléphones
                                        // -------------------------------

                                        db.query(
                                            `
                                            SELECT
                                                id,
                                                payment_phone
                                            FROM users
                                            WHERE id IN (?, ?)
                                            `,
                                            [
                                                winner,
                                                loser
                                            ],
                                            (err, users) => {

                                                if (err) {
                                                    return res.status(500).json(err);
                                                }


                                                const winnerUser =
                                                    users.find(
                                                        u =>
                                                            Number(u.id) ===
                                                            Number(winner)
                                                    );

                                                const loserUser =
                                                    users.find(
                                                        u =>
                                                            Number(u.id) ===
                                                            Number(loser)
                                                    );


                                                // =================================================
                                                // 🥇 1ER
                                                // =================================================

                                                Reward.create(
                                                    {
                                                        tournament_id:
                                                            match.tournament_id,

                                                        player_id:
                                                            winner,

                                                        amount:
                                                            FIRST_PRIZE,

                                                        phone:
                                                            winnerUser?.payment_phone ||
                                                            ""
                                                    },

                                                    (err) => {

                                                        if (err) {
                                                            return res
                                                                .status(500)
                                                                .json(err);
                                                        }


                                                        // =================================================
                                                        // 🥈 2ÈME
                                                        // =================================================

                                                        Reward.create(
                                                            {
                                                                tournament_id:
                                                                    match.tournament_id,

                                                                player_id:
                                                                    loser,

                                                                amount:
                                                                    SECOND_PRIZE,

                                                                phone:
                                                                    loserUser?.payment_phone ||
                                                                    ""
                                                            },

                                                            (err) => {

                                                                if (err) {
                                                                    return res
                                                                        .status(500)
                                                                        .json(err);
                                                                }


                                                                return res.json({
                                                                    message:
                                                                        "🏆 Tournoi Call of Duty terminé ! 🥇 50 000 FCFA | 🥈 18 000 FCFA"
                                                                });

                                                            }
                                                        );

                                                    }
                                                );

                                            }
                                        );

                                    }
                                );

                                return;
                            }


                            // =================================================
                            // 🥉 MATCH POUR LA 3ÈME PLACE
                            // =================================================

                            if (
                                match.round ===
                                "Match pour la 3e place"
                            ) {

                                const THIRD_PRIZE = 10000;

                                db.query(
                                    `
                                    SELECT payment_phone
                                    FROM users
                                    WHERE id = ?
                                    `,
                                    [winner],
                                    (err, user) => {

                                        if (err) {
                                            return res.status(500).json(err);
                                        }


                                        Reward.create(
                                            {
                                                tournament_id:
                                                    match.tournament_id,

                                                player_id:
                                                    winner,

                                                amount:
                                                    THIRD_PRIZE,

                                                phone:
                                                    user[0]?.payment_phone ||
                                                    ""
                                            },

                                            (err) => {

                                                if (err) {
                                                    return res
                                                        .status(500)
                                                        .json(err);
                                                }


                                                return res.json({
                                                    message:
                                                        "🥉 Match pour la 3e place terminé ! 10 000 FCFA attribués."
                                                });

                                            }
                                        );

                                    }
                                );

                                return;
                            }


                            // =================================================
// 🔥 DEMI-FINALE CALL OF DUTY
// Gagnant → Finale
// Perdant → Match pour la 3e place
// =================================================

if (match.round === "Demi-finale") {

    // =============================================
    // 1️⃣ Envoyer le gagnant vers la finale
    // =============================================

    db.query(
        `
        SELECT id
        FROM matches
        WHERE tournament_id = ?
        AND round = 'Finale'
        LIMIT 1
        `,
        [match.tournament_id],
        (err, finalRows) => {

            if (err) {
                return res.status(500).json(err);
            }

            if (finalRows.length === 0) {
                return res.status(500).json({
                    message: "Finale introuvable"
                });
            }

            const finalId = finalRows[0].id;

            // Déterminer la position de la demi-finale
            const finalSlot =
                match.position === 1 ? 1 : 2;

            const finalColumn =
                finalSlot === 1
                    ? "player_one"
                    : "player_two";

            db.query(
                `
                UPDATE matches
                SET ${finalColumn} = ?
                WHERE id = ?
                `,
                [winner, finalId],
                (err) => {

                    if (err) {
                        return res.status(500).json(err);
                    }

                    // =============================================
                    // 2️⃣ Chercher le match pour la 3e place
                    // =============================================

                    db.query(
                        `
                        SELECT id, player_one, player_two
                        FROM matches
                        WHERE tournament_id = ?
                        AND round = 'Petite finale'
                        LIMIT 1
                        `,
                        [match.tournament_id],
                        (err, thirdRows) => {

                            if (err) {
                                return res.status(500).json(err);
                            }

                            if (thirdRows.length === 0) {
                                return res.status(500).json({
                                    message:
                                        "Match pour la 3e place introuvable"
                                });
                            }

                            const thirdMatch = thirdRows[0];

                            // =============================================
                            // 3️⃣ Envoyer le perdant vers la petite finale
                            // =============================================

                            const thirdColumn =
                                !thirdMatch.player_one
                                    ? "player_one"
                                    : "player_two";

                            db.query(
                                `
                                UPDATE matches
                                SET ${thirdColumn} = ?
                                WHERE id = ?
                                `,
                                [
                                    loser,
                                    thirdMatch.id
                                ],
                                (err) => {

                                    if (err) {
                                        return res.status(500).json(err);
                                    }

                                    // =============================================
                                    // 4️⃣ Vérifier la finale
                                    // =============================================

                                    db.query(
                                        `
                                        SELECT player_one, player_two
                                        FROM matches
                                        WHERE id = ?
                                        `,
                                        [finalId],
                                        (err, finalPlayers) => {

                                            if (err) {
                                                return res.status(500).json(err);
                                            }

                                            if (
                                                finalPlayers[0]?.player_one &&
                                                finalPlayers[0]?.player_two
                                            ) {

                                                db.query(
                                                    `
                                                    UPDATE matches
                                                    SET status = 'pending'
                                                    WHERE id = ?
                                                    `,
                                                    [finalId]
                                                );

                                            }

                                            // =============================================
                                            // 5️⃣ Vérifier la petite finale
                                            // =============================================

                                            db.query(
                                                `
                                                SELECT player_one, player_two
                                                FROM matches
                                                WHERE id = ?
                                                `,
                                                [thirdMatch.id],
                                                (err, thirdPlayers) => {

                                                    if (err) {
                                                        return res.status(500).json(err);
                                                    }

                                                    if (
                                                        thirdPlayers[0]?.player_one &&
                                                        thirdPlayers[0]?.player_two
                                                    ) {

                                                        db.query(
                                                            `
                                                            UPDATE matches
                                                            SET status = 'pending'
                                                            WHERE id = ?
                                                            `,
                                                            [thirdMatch.id]
                                                        );

                                                    }

                                                    return res.json({
                                                        message:
                                                            "🏆 Demi-finale terminée : gagnant → finale, perdant → match pour la 3e place."
                                                    });

                                                }
                                            );

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        }
    );

    return;
}


                            // =================================================
                            // AUTRES TOURS COD
                            // =================================================

                            if (!match.next_match_id) {

                                return res.json({
                                    message:
                                        "🏆 Match terminé."
                                });

                            }


                            const sql =
                                match.next_slot === 1
                                    ? `
                                      UPDATE matches
                                      SET player_one = ?
                                      WHERE id = ?
                                      `
                                    : `
                                      UPDATE matches
                                      SET player_two = ?
                                      WHERE id = ?
                                      `;


                            db.query(
                                sql,
                                [
                                    winner,
                                    match.next_match_id
                                ],
                                (err) => {

                                    if (err) {
                                        return res.status(500).json(err);
                                    }


                                    db.query(
                                        `
                                        SELECT
                                            player_one,
                                            player_two
                                        FROM matches
                                        WHERE id = ?
                                        `,
                                        [match.next_match_id],
                                        (err, next) => {

                                            if (err) {
                                                return res
                                                    .status(500)
                                                    .json(err);
                                            }


                                            if (
                                                next[0].player_one &&
                                                next[0].player_two
                                            ) {

                                                db.query(
                                                    `
                                                    UPDATE matches
                                                    SET status = 'pending'
                                                    WHERE id = ?
                                                    `,
                                                    [
                                                        match.next_match_id
                                                    ]
                                                );

                                            }


                                            return res.json({
                                                message:
                                                    "🏆 Joueur qualifié pour le tour suivant."
                                            });

                                        }
                                    );

                                }
                            );

                            return;
                        }


                        // =====================================================
                        // ⚽ EFOOTBALL
                        // =====================================================
                        // TON ANCIENNE LOGIQUE RESTE ICI
                        // =====================================================


                        // Finale eFootball
                        if (match.round === "Finale") {

                            db.query(
                                "SELECT reward FROM tournaments WHERE id = ?",
                                [match.tournament_id],
                                (err, tournament) => {

                                    if (err) {
                                        return res.status(500).json(err);
                                    }

                                    const reward =
                                        tournament[0].reward;


                                    db.query(
                                        `
                                        UPDATE tournaments
                                        SET winner_id = ?,
                                            status = 'finished'
                                        WHERE id = ?
                                        `,
                                        [
                                            winner,
                                            match.tournament_id
                                        ],
                                        (err) => {

                                            if (err) {
                                                return res.status(500).json(err);
                                            }


                                            db.query(
                                                `
                                                SELECT payment_phone
                                                FROM users
                                                WHERE id = ?
                                                `,
                                                [winner],
                                                (err, user) => {

                                                    if (err) {
                                                        return res
                                                            .status(500)
                                                            .json(err);
                                                    }


                                                    Reward.create(
                                                        {
                                                            tournament_id:
                                                                match.tournament_id,

                                                            player_id:
                                                                winner,

                                                            amount:
                                                                reward,

                                                            phone:
                                                                user[0].payment_phone
                                                        },

                                                        (err) => {

                                                            if (err) {
                                                                return res
                                                                    .status(500)
                                                                    .json(err);
                                                            }


                                                            return res.json({
                                                                message:
                                                                    "🏆 Tournoi terminé !"
                                                            });

                                                        }
                                                    );

                                                }
                                            );

                                        }
                                    );

                                }
                            );

                            return;
                        }


                        // Qualification eFootball
                        if (!match.next_match_id) {

                            return res.json({
                                message:
                                    "Aucun match suivant."
                            });

                        }


                        const sql =
                            match.next_slot === 1
                                ? "UPDATE matches SET player_one=? WHERE id=?"
                                : "UPDATE matches SET player_two=? WHERE id=?";


                        db.query(
                            sql,
                            [
                                winner,
                                match.next_match_id
                            ],
                            (err) => {

                                if (err) {
                                    return res.status(500).json(err);
                                }


                                db.query(
                                    `
                                    SELECT
                                        player_one,
                                        player_two
                                    FROM matches
                                    WHERE id = ?
                                    `,
                                    [match.next_match_id],
                                    (err, rows) => {

                                        if (err) {
                                            return res.status(500).json(err);
                                        }


                                        const nextMatch =
                                            rows[0];


                                        if (
                                            nextMatch.player_one &&
                                            nextMatch.player_two
                                        ) {

                                            db.query(
                                                `
                                                UPDATE matches
                                                SET status = 'pending'
                                                WHERE id = ?
                                                `,
                                                [
                                                    match.next_match_id
                                                ]
                                            );

                                        }


                                        return res.json({
                                            message:
                                                "🏆 Vainqueur qualifié pour le tour suivant."
                                        });

                                    }
                                );

                            }
                        );

                    }
                );
            }
        );
    });
};

// ==================================
// Tous les matchs (Admin)
// ==================================
exports.getAllMatches = (req, res) => {
    const sql = `
        SELECT
            matches.id,
            matches.round,
            matches.score,
            matches.status,
            u1.pseudo AS player_one_name,
            u2.pseudo AS player_two_name,
            uw.pseudo AS winner_name,
            tournaments.name AS tournament_name
        FROM matches
        LEFT JOIN users u1 ON matches.player_one = u1.id
        LEFT JOIN users u2 ON matches.player_two = u2.id
        LEFT JOIN users uw ON matches.winner = uw.id
        LEFT JOIN tournaments ON matches.tournament_id = tournaments.id
        ORDER BY matches.id DESC
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};