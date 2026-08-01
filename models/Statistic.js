const db = require("../config/database");

const Statistic = {

    // Créer les statistiques d'un nouveau joueur
    create(playerId, callback) {

        const sql = `
            INSERT INTO statistics(player_id)
            VALUES(?)
        `;

        db.query(sql, [playerId], callback);

    },

    // Récupérer les statistiques d'un joueur
    getByPlayer(playerId, callback) {

        const sql = `
            SELECT *
            FROM statistics
            WHERE player_id = ?
        `;

        db.query(sql, [playerId], callback);

    },

    // Mettre à jour les statistiques après un match
    update(playerId, data, callback) {

        const sql = `
            UPDATE statistics

            SET

            matches_played = matches_played + 1,

            wins = wins + ?,

            losses = losses + ?,

            goals_scored = goals_scored + ?,

            goals_conceded = goals_conceded + ?

            WHERE player_id = ?
        `;

        db.query(

            sql,

            [
                data.win,
                data.loss,
                data.goals_scored,
                data.goals_conceded,
                playerId
            ],

            callback

        );

    },

    // Classement général
    ranking(callback) {

        const sql = `
            SELECT
                users.name,
                users.pseudo,
                statistics.matches_played,
                statistics.wins,
                statistics.losses,
                statistics.goals_scored
            FROM statistics
            JOIN users
            ON statistics.player_id = users.id

            ORDER BY statistics.wins DESC
        `;

        db.query(sql, callback);

    }

};

module.exports = Statistic;