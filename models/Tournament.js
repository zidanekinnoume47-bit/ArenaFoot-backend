const db = require("../config/database");

const Tournament = {

    // ==========================================
    // CRÉER UN TOURNOI
    // ==========================================
   create: (data, callback) => {

    const sql = `
        INSERT INTO tournaments
        (
            name,
            game,
            entry_fee,
            reward,
            players_limit,
            status,
            description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            data.name,
            data.game || "efootball",
            data.entry_fee,
            data.reward,
            data.players_limit,
            "open",
            data.description
        ],
        callback
    );
},


    // ==========================================
    // RÉCUPÉRER TOUS LES TOURNOIS
    // ==========================================
    getAll: (callback) => {

        const sql = `
            SELECT
                tournaments.*,
                COUNT(tournament_players.id) AS players_count

            FROM tournaments

            LEFT JOIN tournament_players
            ON tournaments.id = tournament_players.tournament_id

            GROUP BY tournaments.id
        `;

        db.query(
            sql,
            callback
        );

    },


    // ==========================================
    // RÉCUPÉRER UN TOURNOI
    // ==========================================
    getById: (id, callback) => {

        const sql = `
            SELECT
                tournaments.*,
                COUNT(tournament_players.player_id) AS players_count

            FROM tournaments

            LEFT JOIN tournament_players
            ON tournaments.id = tournament_players.tournament_id

            WHERE tournaments.id = ?

            GROUP BY tournaments.id
        `;

        db.query(
            sql,
            [id],
            callback
        );

    },


    // ==========================================
    // MODIFIER LE STATUT
    // ==========================================
    updateStatus: (id, status, callback) => {

        const sql = `
            UPDATE tournaments
            SET status = ?
            WHERE id = ?
        `;

        db.query(
            sql,
            [
                status,
                id
            ],
            callback
        );

    }

};

module.exports = Tournament;