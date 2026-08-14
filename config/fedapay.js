const { FedaPay, Transaction } = require("fedapay");

FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);

FedaPay.setEnvironment("live");

module.exports = {
    FedaPay,
    Transaction
};