const bcrypt = require("bcrypt");

bcrypt.hash("123456", 10, (err, hash) => {
    console.log(hash);
});