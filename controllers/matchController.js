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

// ==================================
// Générer les matchs d'un tournoi
// ==================================
exports.generateMatches = (req, res) => {
    const tournament_id = req.params.id;

    const checkSql = `SELECT id FROM matches WHERE tournament_id = ? LIMIT 1`;

    db.query(checkSql, [tournament_id], (err, exists) => {
        if (err) return res.status(500).json(err);
        if (exists.length > 0) {
            return res.json({ message: "Bracket déjà généré" });
        }

        const sql = `SELECT player_id FROM tournament_players WHERE tournament_id = ? AND payment_status = 'paid'`;

        db.query(sql, [tournament_id], (err, players) => {
            if (err) return res.status(500).json(err);

            if (players.length !== 16) {
                return res.status(400).json({
                    message: `Le tournoi nécessite exactement 16 joueurs payés (actuellement : ${players.length})`
                });
            }

            const shuffledPlayers = shuffleArray([...players]).map(player => player.player_id);
            let matches = [];

            // 1. Huitième de finale (8 matchs, positions 1 à 8)
            for (let i = 0; i < 16; i += 2) {
                matches.push({
                    tournament_id,
                    player_one: shuffledPlayers[i],
                    player_two: shuffledPlayers[i+1],
                    round: "Huitième de finale",
                    position: (i/2) + 1,
                    next_slot: ((i/2) % 2 === 0) ? 1 : 2
                });
            }

            // 2. Quart de finale (4 matchs, positions 1 à 4)
            for (let i = 1; i <= 4; i++) {
                matches.push({
                    tournament_id,
                    player_one: null,
                    player_two: null,
                    round: "Quart de finale",
                    position: i,
                    next_slot: (i % 2 === 0) ? 2 : 1
                });
            }

            // 3. Demi-finale (2 matchs, positions 1 à 2)
            for (let i = 1; i <= 2; i++) {
                matches.push({
                    tournament_id,
                    player_one: null,
                    player_two: null,
                    round: "Demi-finale",
                    position: i,
                    next_slot: (i % 2 === 0) ? 2 : 1
                });
            }

            // 4. Finale (1 match)
            matches.push({
                tournament_id,
                player_one: null,
                player_two: null,
                round: "Finale",
                position: 1,
                next_slot: null
            });

            Match.createMultiple(matches, (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json(err);
                }

                const firstId = result.insertId;
                const updateLinksQueries = [];

                for (let pos = 1; pos <= 8; pos++) {
                    const currentMatchDbId = firstId + (pos - 1);
                    const targetQuarterPos = Math.ceil(pos / 2);
                    const targetQuarterDbId = firstId + 7 + targetQuarterPos;
                    const slot = (pos % 2 === 1) ? 1 : 2;

                    updateLinksQueries.push(new Promise((resolve, reject) => {
                        db.query(
                            `UPDATE matches SET next_match_id = ?, next_slot = ? WHERE id = ?`,
                            [targetQuarterDbId, slot, currentMatchDbId],
                            (err) => err ? reject(err) : resolve()
                        );
                    }));
                }

                for (let pos = 1; pos <= 4; pos++) {
                    const currentQuarterDbId = firstId + 7 + pos;
                    const targetSemiPos = Math.ceil(pos / 2);
                    const targetSemiDbId = firstId + 11 + targetSemiPos;
                    const slot = (pos % 2 === 1) ? 1 : 2;

                    updateLinksQueries.push(new Promise((resolve, reject) => {
                        db.query(
                            `UPDATE matches SET next_match_id = ?, next_slot = ? WHERE id = ?`,
                            [targetSemiDbId, slot, currentQuarterDbId],
                            (err) => err ? reject(err) : resolve()
                        );
                    }));
                }

                for (let pos = 1; pos <= 2; pos++) {
                    const currentSemiDbId = firstId + 11 + pos;
                    const targetFinalDbId = firstId + 14;
                    const slot = (pos % 2 === 1) ? 1 : 2;

                    updateLinksQueries.push(new Promise((resolve, reject) => {
                        db.query(
                            `UPDATE matches SET next_match_id = ?, next_slot = ? WHERE id = ?`,
                            [targetFinalDbId, slot, currentSemiDbId],
                            (err) => err ? reject(err) : resolve()
                        );
                    }));
                }

                Promise.all(updateLinksQueries)
                    .then(() => {
                        res.status(201).json({
                            message: "Bracket complet et liens créés avec succès par position 🏆",
                            matches_created: matches.length
                        });
                    })
                    .catch((error) => {
                        console.log("Erreur liaison links :", error);
                        res.status(500).json({ error: "Erreur lors de la liaison des tours du bracket" });
                    });
            });
        });
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
// Terminer un match (TOTALEMENT FLEXIBLE & DYNAMIQUE)
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

        Match.updateWinner(
            {
                match_id,
                winner,
                score
            },
            (err) => {

                if (err) return res.status(500).json(err);

                // ===============================
                // FINALE
                // ===============================

                if (match.round === "Finale") {

                    db.query(
                        "SELECT reward FROM tournaments WHERE id = ?",
                        [match.tournament_id],
                        (err, tournament) => {

                            if (err) return res.status(500).json(err);

                            const reward = tournament[0].reward;

                            db.query(
                                "UPDATE tournaments SET winner_id=?, status='finished' WHERE id=?",
                                [winner, match.tournament_id],
                                (err) => {

                                    if (err) return res.status(500).json(err);

                                    db.query(
                                        "SELECT payment_phone FROM users WHERE id=?",
                                        [winner],
                                        (err, user) => {

                                            if (err) return res.status(500).json(err);

                                            Reward.create(
                                                {
                                                    tournament_id: match.tournament_id,
                                                    player_id: winner,
                                                    amount: reward,
                                                    phone: user[0].payment_phone
                                                },
                                                (err) => {

                                                    if (err) return res.status(500).json(err);

                                                    return res.json({
                                                        message: "🏆 Tournoi terminé !"
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

                // ==================================
                // QUALIFICATION AU TOUR SUIVANT
                // ==================================
if (!match.next_match_id) {

    return res.json({
        message: "Aucun match suivant."
    });

}

const sql =
    match.next_slot === 1
        ? "UPDATE matches SET player_one=? WHERE id=?"
        : "UPDATE matches SET player_two=? WHERE id=?";

db.query(
    sql,
    [winner, match.next_match_id],
    (err) => {

        if (err) {
            return res.status(500).json(err);
        }

        db.query(
            "SELECT player_one, player_two FROM matches WHERE id = ?",
            [match.next_match_id],
            (err, rows) => {

                if (err) {
                    return res.status(500).json(err);
                }

                const nextMatch = rows[0];

                if (nextMatch.player_one && nextMatch.player_two) {

                    db.query(
                        "UPDATE matches SET status='pending' WHERE id=?",
                        [match.next_match_id],
                        (err) => {

                            if (err) {
                                return res.status(500).json(err);
                            }

                            return res.json({
                                message: "🏆 Vainqueur qualifié pour le tour suivant."
                            });

                        }
                    );

                } else {

                    return res.json({
                        message: "🏆 Vainqueur qualifié pour le tour suivant."
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