const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Accès refusé"
        });
    }

    const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

    if (!token) {
        return res.status(401).json({
            message: "Token manquant"
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!decoded.id) {
            return res.status(401).json({
                message: "Token invalide"
            });
        }

        req.user = decoded;

        next();

    } catch (error) {

        console.error(
            "ERREUR AUTH :",
            error.message
        );

        return res.status(401).json({
            message: "Token invalide ou expiré"
        });
    }
};