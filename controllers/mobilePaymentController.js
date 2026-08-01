const paymentService =
require("../services/paymentServices");


exports.pay = async(req,res)=>{


const data = req.body;


const result =
await paymentService.createTransaction(data);



if(result.success){


res.json({

message:"Paiement initié",

transaction_id:
result.transaction_id

});


}else{


res.status(400).json({

message:"Paiement impossible"

});


}


};