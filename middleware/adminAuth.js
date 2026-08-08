const jwt = require("jsonwebtoken");
const db = require("../config/database");

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
      message: "Accès refusé"
    });
  }

  try {

    const user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Vérification du rôle contenu dans le JWT
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Administrateur uniquement"
      });
    }

    // Vérification supplémentaire dans la base de données
    db.query(
      `
      SELECT id, email, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [user.id],
      (err, result) => {

        if (err) {

          console.error(
            "ERREUR VÉRIFICATION ADMIN :",
            err
          );

          return res.status(500).json({
            message: "Erreur serveur"
          });

        }

        // Le compte n'existe plus
        if (result.length === 0) {

          return res.status(401).json({
            message: "Compte administrateur introuvable"
          });

        }

        const admin = result[0];

        // Le compte existe mais n'est plus admin
        if (admin.role !== "admin") {

          return res.status(403).json({
            message: "Accès administrateur révoqué"
          });

        }

        // Tout est correct
        req.user = {
          id: admin.id,
          email: admin.email,
          role: admin.role
        };

        next();

      }
    );

  } catch (error) {

    console.error(
      "ERREUR JWT ADMIN :",
      error.message
    );

    return res.status(401).json({
      message: "Token invalide ou expiré"
    });

  }

};