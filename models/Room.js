const db = require("../config/database");


const Room = {



create:(data,callback)=>{


const sql = `

INSERT INTO rooms

(match_id,host_player,guest_player)

VALUES (?,?,?)

`;


db.query(

sql,

[
data.match_id,
data.host_player,
data.guest_player
],

callback

);


},





addCode:(data,callback)=>{


const sql = `

UPDATE rooms

SET room_code=?, status='ready'

WHERE id=?

`;


db.query(

sql,

[
data.room_code,
data.room_id
],

callback

);


},





getRoom:(id,callback)=>{


const sql = `

SELECT

rooms.*,

u1.pseudo AS host_name,

u2.pseudo AS guest_name


FROM rooms


LEFT JOIN users u1

ON rooms.host_player = u1.id



LEFT JOIN users u2

ON rooms.guest_player = u2.id



WHERE rooms.match_id = ?

`;



db.query(

sql,

[id],

callback

);


}



};






getAll: (callback) => {

    const sql = `
    SELECT
        rooms.id,
        rooms.match_id,
        rooms.room_code,
        rooms.status,

        u1.pseudo AS host,
        u2.pseudo AS guest

    FROM rooms

    LEFT JOIN users u1
    ON rooms.host_player = u1.id

    LEFT JOIN users u2
    ON rooms.guest_player = u2.id

    ORDER BY rooms.id DESC
    `;

    db.query(sql, callback);

}




getAll:(callback)=>{

const sql = `

SELECT

rooms.*,

u1.pseudo AS host_name,

u2.pseudo AS guest_name

FROM rooms

LEFT JOIN users u1
ON rooms.host_player=u1.id

LEFT JOIN users u2
ON rooms.guest_player=u2.id

ORDER BY rooms.id DESC

`;

db.query(sql, callback);

},



module.exports = Room;