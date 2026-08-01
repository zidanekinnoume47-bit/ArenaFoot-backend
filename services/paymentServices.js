const createTransaction = async(data)=>{


// Ici on connectera l'API de paiement réelle

return {

success:true,

transaction_id:
"AF_"+Date.now()

};


};



module.exports = {
createTransaction
};