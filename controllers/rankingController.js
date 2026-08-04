const Ranking = require("../models/Ranking");

exports.getRanking = (req, res) => {

    Ranking.getRanking((err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json(err);
        }

        res.json(result);

    });

};