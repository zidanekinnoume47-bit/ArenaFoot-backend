const Reward =
require("../models/Reward");

const Payment = require("../models/Payment");
const db = require("../config/database");




exports.createReward=(req,res)=>{


Reward.create(

req.body,

(err,result)=>{


if(err){

return res.status(500).json({

message:"Erreur récompense"

});

}


res.json({

message:"Récompense créée",

id:result.insertId

});


}

);


};



exports.sendReward = (req, res) => {

    const id = req.params.id;

    // ==========================================
    // 1. Vérifier que la récompense existe
    // ==========================================

    db.query(
        "SELECT * FROM rewards WHERE id = ? LIMIT 1",
        [id],
        (err, reward) => {

            if (err) {
                console.error("ERREUR RECHERCHE REWARD :", err);

                return res.status(500).json({
                    message: "Erreur serveur"
                });
            }

            if (reward.length === 0) {
                return res.status(404).json({
                    message: "Récompense introuvable"
                });
            }

            const data = reward[0];

            // ==========================================
            // 2. Empêcher le double envoi
            // ==========================================

            if (data.status === "sent") {
                return res.status(400).json({
                    message: "Cette récompense a déjà été envoyée."
                });
            }

            // ==========================================
            // 3. Vérifier le montant
            // ==========================================

            const amount = Number(data.amount);

            if (!Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({
                    message: "Montant de récompense invalide."
                });
            }

            // ==========================================
            // 4. Vérifier le joueur
            // ==========================================

            if (!data.player_id || !data.tournament_id) {
                return res.status(400).json({
                    message: "Récompense invalide."
                });
            }

            // ==========================================
            // 5. Vérifier le téléphone
            // ==========================================

            if (!data.phone) {
                return res.status(400).json({
                    message: "Numéro de paiement du gagnant introuvable."
                });
            }

            // ==========================================
            // 6. Créer le paiement de récompense
            // ==========================================

            Payment.create(
                {
                    player_id: data.player_id,

                    tournament_id: data.tournament_id,

                    amount: -amount,

                    method: "reward",

                    transaction_id:
                        "REWARD_" + data.id + "_" + Date.now()
                },

                (err, result) => {

                    if (err) {
                        console.error(
                            "ERREUR CREATION PAIEMENT REWARD :",
                            err
                        );

                        return res.status(500).json({
                            message: "Erreur création paiement récompense"
                        });
                    }

                    // ==========================================
                    // 7. Marquer le paiement comme succès
                    // ==========================================

                    Payment.updateStatus(
                        result.insertId,
                        "success",
                        (err) => {

                            if (err) {
                                console.error(
                                    "ERREUR STATUT PAIEMENT :",
                                    err
                                );

                                return res.status(500).json({
                                    message:
                                        "Erreur validation paiement récompense"
                                });
                            }

                            // ==========================================
                            // 8. Marquer la récompense comme envoyée
                            // ==========================================

                            Reward.updateStatus(
                                id,
                                "sent",
                                (err) => {

                                    if (err) {

                                        console.error(
                                            "ERREUR STATUT REWARD :",
                                            err
                                        );

                                        return res.status(500).json({
                                            message:
                                                "Erreur validation récompense"
                                        });
                                    }

                                    // ==========================================
                                    // 9. Succès
                                    // ==========================================

                                    return res.json({
                                        message:
                                            "Récompense envoyée avec succès",
                                        status: "sent"
                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );

};