const { FedaPay, Transaction } = require("fedapay");


FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);


module.exports = {
    FedaPay,
    Transaction
};