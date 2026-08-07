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

    db.query(
        "SELECT * FROM rewards WHERE id = ?",
        [id],
        (err, reward) => {

            if (err) return res.status(500).json(err);

            if (reward.length === 0) {
                return res.status(404).json({
                    message: "Récompense introuvable"
                });
            }

            const data = reward[0];

            Payment.create(
                {
                    player_id: data.player_id,
                    tournament_id: data.tournament_id,
                    amount: -data.amount,
                    method: "reward",
                    transaction_id: "REWARD_" + Date.now()
                },
                (err, result) => {

                    if (err) return res.status(500).json(err);

                    Payment.updateStatus(
                        result.insertId,
                        "success",
                        (err) => {

                            if (err) return res.status(500).json(err);

                            Reward.updateStatus(
                                id,
                                "sent",
                                (err) => {

                                    if (err) {
                                        return res.status(500).json({
                                            message: "Erreur validation récompense"
                                        });
                                    }

                                    return res.json({
                                        message: "Récompense envoyée avec succès",
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