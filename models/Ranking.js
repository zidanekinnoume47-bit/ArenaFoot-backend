const db = require("../config/database");

const Ranking = {

    getRanking: (callback) => {

        const sql = `

        SELECT

            u.id,
            u.pseudo,

            COUNT(DISTINCT m.id) AS matches,

            SUM(
                CASE
                    WHEN m.winner = u.id THEN 1
                    ELSE 0
                END
            ) AS wins,

            SUM(
                CASE
                    WHEN m.winner IS NOT NULL
                    AND m.winner <> u.id THEN 1
                    ELSE 0
                END
            ) AS losses,

            ROUND(
                (
                    SUM(
                        CASE
                            WHEN m.winner = u.id THEN 1
                            ELSE 0
                        END
                    )
                    /
                    COUNT(DISTINCT m.id)
                ) * 100,
                0
            ) AS win_rate

        FROM users u

        LEFT JOIN matches m

        ON (
            m.player_one = u.id
            OR
            m.player_two = u.id
        )

        WHERE u.role <> 'admin'

        GROUP BY u.id

        ORDER BY wins DESC,
                 win_rate DESC,
                 matches DESC;

        `;

        db.query(sql, callback);

    }

};

module.exports = Ranking;