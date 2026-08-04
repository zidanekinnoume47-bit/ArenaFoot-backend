const Setting = require("../models/Setting");

// Récupérer les paramètres
exports.getSettings = (req, res) => {

    Setting.get((err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(result[0]);

    });

};

// Modifier les paramètres
exports.updateSettings = (req, res) => {

    Setting.update(req.body, (err) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json({
            message: "Paramètres mis à jour avec succès"
        });

    });

};