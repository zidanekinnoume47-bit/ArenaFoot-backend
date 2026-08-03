const db = require("../config/database");

const Payment = {

create:(data,callback)=>{

const sql = `

INSERT INTO payments
(player_id,tournament_id,amount,method,status,transaction_id)

VALUES (?,?,?,?,?,?)

`;

db.query(

sql,

[
data.player_id,
data.tournament_id,
data.amount,
data.method,
"pending",
data.transaction_id || null
],

callback

);

},



getById:(id,callback)=>{

const sql = `

SELECT *
FROM payments
WHERE id = ?

`;

db.query(
sql,
[id],
callback
);

},



// =========================
// Recherche par transaction FedaPay
// =========================

getByTransactionId:(transactionId,callback)=>{

const sql = `

SELECT *
FROM payments
WHERE transaction_id = ?

`;

db.query(
sql,
[transactionId],
callback
);

},



updateStatus:(id,status,callback)=>{

const sql = `

UPDATE payments
SET status=?
WHERE id=?

`;

db.query(
sql,
[
status,
id
],
callback
);

}

};

module.exports = Payment;