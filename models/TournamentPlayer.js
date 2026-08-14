const db = require("../config/database");

const TournamentPlayer = {

    // ==================================
    // Créer une inscription en attente
    // ==================================
    join: (data, callback) => {

        const id = data.player_id || data.user_id;

        const sql = `
            INSERT INTO tournament_players
            (tournament_id, player_id, payment_status)
            VALUES (?, ?, 'pending')
        `;

        db.query(
            sql,
            [
                data.tournament_id,
                id
            ],
            callback
        );
    },


    // ==================================
    // Vérifier uniquement une inscription payée
    // ==================================
    checkPlayer: (data, callback) => {

        const id = data.player_id || data.user_id;

        const sql = `
            SELECT *
            FROM tournament_players
            WHERE tournament_id = ?
            AND player_id = ?
            AND payment_status = 'paid'
        `;

        db.query(
            sql,
            [
                data.tournament_id,
                id
            ],
            callback
        );
    },


    // ==================================
    // Vérifier une inscription existante
    // ==================================
    getPlayer: (data, callback) => {

        const id = data.player_id || data.user_id;

        const sql = `
            SELECT *
            FROM tournament_players
            WHERE tournament_id = ?
            AND player_id = ?
            LIMIT 1
        `;

        db.query(
            sql,
            [
                data.tournament_id,
                id
            ],
            callback
        );
    },


    // ==================================
    // Compter uniquement les joueurs payés
    // ==================================
    countPlayers: (tournament_id, callback) => {

        const sql = `
            SELECT COUNT(*) AS total
            FROM tournament_players
            WHERE tournament_id = ?
            AND payment_status = 'paid'
        `;

        db.query(
            sql,
            [tournament_id],
            callback
        );
    },


    // ==================================
    // Joueurs d'un tournoi
    // ==================================
    getPlayersByTournament: (tournament_id, callback) => {

        const sql = `
            SELECT 
                users.id,
                users.name,
                users.pseudo,
                tournament_players.payment_status
            FROM tournament_players
            JOIN users
                ON tournament_players.player_id = users.id
            WHERE tournament_players.tournament_id = ?
        `;

        db.query(
            sql,
            [tournament_id],
            callback
        );
    },


    // ==================================
    // Tournois d'un joueur
    // ==================================
    getPlayerTournaments: (player_id, callback) => {

        const sql = `
            SELECT
                tournaments.*,
                tournament_players.payment_status
            FROM tournaments
            JOIN tournament_players
                ON tournaments.id = tournament_players.tournament_id
            WHERE tournament_players.player_id = ?
        `;

        db.query(
            sql,
            [player_id],
            callback
        );
    },


// ==================================
// Inscrire automatiquement un joueur après paiement
// ==================================
registerPaid: (player_id, tournament_id, callback) => {

    const checkSql = `
        SELECT id
        FROM tournament_players
        WHERE tournament_id = ?
        AND player_id = ?
        LIMIT 1
    `;

    db.query(
        checkSql,
        [tournament_id, player_id],
        (err, result) => {

            if (err) {
                return callback(err);
            }

            // Le joueur existe déjà
            if (result.length > 0) {

                const updateSql = `
                    UPDATE tournament_players
                    SET payment_status = 'paid'
                    WHERE tournament_id = ?
                    AND player_id = ?
                `;

                return db.query(
                    updateSql,
                    [tournament_id, player_id],
                    callback
                );
            }

            // Le joueur n'existe pas encore
            const insertSql = `
                INSERT INTO tournament_players
                (tournament_id, player_id, payment_status)
                VALUES (?, ?, 'paid')
            `;

            db.query(
                insertSql,
                [tournament_id, player_id],
                callback
            );
        }
    );
},



    // ==================================
    // Valider le paiement
    // ==================================
    updatePaymentStatus: (player_id, tournament_id, callback) => {

        const sql = `
            UPDATE tournament_players
            SET payment_status = 'paid'
            WHERE player_id = ?
            AND tournament_id = ?
        `;

        db.query(
            sql,
            [
                player_id,
                tournament_id
            ],
            callback
        );
    }

};

module.exports = TournamentPlayer;