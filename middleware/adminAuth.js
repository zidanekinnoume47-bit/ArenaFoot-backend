const jwt = require("jsonwebtoken");


module.exports = (req,res,next)=>{


const token =
req.headers.authorization;


if(!token){

return res.status(401).json({

message:"Accès refusé"

});

}


try{


const user =
jwt.verify(
token,
process.env.JWT_SECRET
);



if(user.role !== "admin"){

return res.status(403).json({

message:"Administrateur uniquement"

});

}


req.user=user;


next();



}catch(error){


res.status(401).json({

message:"Token invalide"

});


}


};