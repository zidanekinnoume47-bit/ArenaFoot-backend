const db = require("../config/database");

const EmailVerification = {

    create(data, callback) {

        const sql = `
            INSERT INTO email_verifications
            (email, code, expires_at)
            VALUES (?, ?, ?)
        `;

        db.query(
            sql,
            [
                data.email,
                data.code,
                data.expires_at
            ],
            callback
        );

    },

    get(email, callback) {

        db.query(
            `
            SELECT *
            FROM email_verifications
            WHERE email=?
            ORDER BY id DESC
            LIMIT 1
            `,
            [email],
            callback
        );

    },

    verify(id, callback) {

        db.query(
            `
            UPDATE email_verifications
            SET verified=1
            WHERE id=?
            `,
            [id],
            callback
        );

    }

};

module.exports = EmailVerification;