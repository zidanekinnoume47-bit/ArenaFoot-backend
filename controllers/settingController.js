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

    const {
        site_name,
        entry_fee,
        reward,
        whatsapp,
        phone,
        email,
        registration,
        payment
    } = req.body;

    // ==========================================
    // 🔐 Vérification des champs obligatoires
    // ==========================================

    if (
        typeof site_name !== "string" ||
        !site_name.trim()
    ) {
        return res.status(400).json({
            message: "Nom du site invalide"
        });
    }

    // ==========================================
    // 💰 Vérification des montants
    // ==========================================

    const entryFee = Number(entry_fee);
    const rewardAmount = Number(reward);

    if (
        !Number.isFinite(entryFee) ||
        entryFee < 0
    ) {
        return res.status(400).json({
            message: "Prix d'inscription invalide"
        });
    }

    if (
        !Number.isFinite(rewardAmount) ||
        rewardAmount < 0
    ) {
        return res.status(400).json({
            message: "Récompense invalide"
        });
    }

    // ==========================================
    // 📱 Vérification des contacts
    // ==========================================

    if (
        typeof whatsapp !== "string" ||
        whatsapp.length > 30
    ) {
        return res.status(400).json({
            message: "Numéro WhatsApp invalide"
        });
    }

    if (
        typeof phone !== "string" ||
        phone.length > 30
    ) {
        return res.status(400).json({
            message: "Numéro de téléphone invalide"
        });
    }

    // ==========================================
    // 📧 Vérification email
    // ==========================================

    if (
        typeof email !== "string" ||
        email.length > 150 ||
        !email.includes("@")
    ) {
        return res.status(400).json({
            message: "Adresse email invalide"
        });
    }

    // ==========================================
    // ⚙️ Vérification des options
    // ==========================================

    if (
        typeof registration !== "boolean" &&
        registration !== 0 &&
        registration !== 1
    ) {
        return res.status(400).json({
            message: "Valeur registration invalide"
        });
    }

    if (
        typeof payment !== "boolean" &&
        payment !== 0 &&
        payment !== 1
    ) {
        return res.status(400).json({
            message: "Valeur payment invalide"
        });
    }

    // ==========================================
    // 🔒 Données nettoyées
    // ==========================================

    const cleanData = {
        site_name: site_name.trim(),
        entry_fee: entryFee,
        reward: rewardAmount,
        whatsapp: whatsapp.trim(),
        phone: phone.trim(),
        email: email.trim(),
        registration,
        payment
    };

    Setting.update(cleanData, (err) => {

        if (err) {

            console.error(
                "ERREUR UPDATE SETTINGS :",
                err
            );

            return res.status(500).json({
                message: "Erreur lors de la mise à jour des paramètres"
            });
        }

        return res.json({
            message: "Paramètres mis à jour avec succès"
        });

    });

};