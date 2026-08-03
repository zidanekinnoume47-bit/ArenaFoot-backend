require("dotenv").config();

const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,

});

db.getConnection((err, connection) => {

    if (err) {
        console.log("Erreur connexion base :", err);
    } else {
        console.log("Base de données connectée");
        connection.release();
    }
    console.log("HOST :", process.env.MYSQLHOST);
    console.log("DATABASE :", process.env.MYSQLDATABASE);
    console.log("PORT :", process.env.MYSQLPORT);
    });

module.exports = db;