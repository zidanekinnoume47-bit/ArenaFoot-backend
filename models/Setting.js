const db = require("../config/database");

const Setting = {

    get(callback) {

        db.query(
            "SELECT * FROM settings LIMIT 1",
            callback
        );

    },

    update(data, callback) {

        const sql = `
        UPDATE settings
        SET
            site_name = ?,
            entry_fee = ?,
            reward = ?,
            whatsapp = ?,
            phone = ?,
            email = ?,
            registration = ?,
            payment = ?
        WHERE id = 1
        `;

        db.query(
            sql,
            [
                data.site_name,
                data.entry_fee,
                data.reward,
                data.whatsapp,
                data.phone,
                data.email,
                data.registration,
                data.payment
            ],
            callback
        );

    }

};

module.exports = Setting;