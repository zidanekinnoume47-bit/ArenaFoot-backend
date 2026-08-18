const db = require("../config/database");
const matchController = require("./matchController");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const client = require("../config/brevo");




// Voir tous les joueurs
exports.players = (req, res) => {
  db.query(
    "SELECT id,name,pseudo,email,phone,role FROM users",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
};

// Voir les tournois
exports.tournaments = (req, res) => {

  const sql = `
    SELECT
      t.*,

      (
    SELECT COUNT(*)
    FROM tournament_players tp
    WHERE tp.tournament_id = t.id
    AND tp.payment_status = 'paid'
) AS players_count

    FROM tournaments t
    ORDER BY t.id DESC
  `;

  db.query(sql, (err, result) => {

    if (err) {

      console.error(
        "ERREUR TOURNOIS ADMIN :",
        err
      );

      return res.status(500).json({
        message: "Erreur récupération des tournois"
      });

    }

    console.log(
      "TOURNOIS ADMIN :",
      result
    );

    res.json(result);

  });

};


// ==========================================
// CRÉER UN TOURNOI
// ==========================================

exports.createTournament = (req, res) => {

  const {
    name,
    entry_fee,
    reward,
    players_limit,
    description,
    game
  } = req.body;

  // Vérification des informations obligatoires
  if (
    !name ||
    entry_fee === undefined ||
    reward === undefined ||
    !players_limit
  ) {
    return res.status(400).json({
      message: "Informations du tournoi incomplètes"
    });
  }

  // Jeux autorisés
  const allowedGames = [
    "efootball",
    "call_of_duty"
  ];

  const selectedGame = game || "efootball";

  if (!allowedGames.includes(selectedGame)) {
    return res.status(400).json({
      message: "Jeu non supporté"
    });
  }

  // Vérification des limites
  const limit = Number(players_limit);

  if (!Number.isInteger(limit) || limit <= 0) {
    return res.status(400).json({
      message: "Nombre de joueurs invalide"
    });
  }

  // Règles Call of Duty
  if (
    selectedGame === "call_of_duty" &&
    limit !== 32
  ) {
    return res.status(400).json({
      message: "Un tournoi Call of Duty doit avoir exactement 32 joueurs"
    });
  }

  // Règles eFootball
  if (
    selectedGame === "efootball" &&
    limit !== 16 &&
    limit !== 32 &&
    limit !== 64 &&
    limit !== 128
  ) {
    return res.status(400).json({
      message:
        "Nombre de joueurs eFootball non autorisé"
    });
  }

  const sql = `
    INSERT INTO tournaments
    (
      name,
      entry_fee,
      reward,
      players_limit,
      status,
      description,
      game
    )
    VALUES (?, ?, ?, ?, 'open', ?, ?)
  `;

  db.query(
    sql,
    [
      name,
      Number(entry_fee),
      Number(reward),
      limit,
      description || "",
      selectedGame
    ],
    (err, result) => {

      if (err) {

        console.error(
          "ERREUR CREATION TOURNOI :",
          err
        );

        return res.status(500).json({
          message: "Erreur lors de la création du tournoi",
          error: err.message
        });
      }

      return res.status(201).json({
        message: "Tournoi créé avec succès 🏆",
        tournament_id: result.insertId,
        game: selectedGame
      });

    }
  );

};

/**
 * VALIDER UN PAIEMENT / RECOMPENSE ET RELANCER AUTOMATIQUEMENT LE TOURNOI
 */
exports.validatePayment = (req, res) => {
  const id = req.params.id;

  // 1. Récupérer les infos du paiement (pour savoir si c'est une récompense ou un paiement d'inscription)
  db.query("SELECT * FROM payments WHERE id = ?", [id], (err, paymentResult) => {
    if (err) return res.status(500).json(err);

    // Si on valide un paiement de récompense (par exemple les 40000 FCFA de gain final)
    // On met le paiement à 'success'
    db.query(
      `UPDATE payments SET status='success' WHERE id=?`,
      [id],
      (err) => {
        if (err) return res.status(500).json(err);

        // Si ce paiement est lié à un tournoi, on cherche le tournoi concerné pour effectuer la réinitialisation complète
        const tournament_id = paymentResult[0]?.tournament_id;

        if (tournament_id) {
          // 2. Réinitialisation complète du tournoi (vider joueurs, matchs, paiements, récompenses, status -> open)
          db.query("DELETE FROM tournament_players WHERE tournament_id = ?", [tournament_id], (err) => {
            if (err) console.log("Erreur suppression tournament_players :", err);

            db.query("DELETE FROM matches WHERE tournament_id = ?", [tournament_id], (err) => {
              if (err) console.log("Erreur suppression matches :", err);

              db.query("DELETE FROM payments WHERE tournament_id = ? AND id != ?", [tournament_id, id], (err) => {
                if (err) console.log("Erreur suppression payments :", err);

                db.query("DELETE FROM rewards WHERE tournament_id = ?", [tournament_id], (err) => {
                  if (err) console.log("Erreur suppression rewards :", err);

                  // Remettre le tournoi à l'état initial ouvert (0/16)
                  db.query("UPDATE tournaments SET status = 'open' WHERE id = ?", [tournament_id], (err) => {
                    if (err) console.log("Erreur reset statut tournoi :", err);

                    return res.json({
                      message: "🏆 Paiement validé avec succès ! Le tournoi a été automatiquement réinitialisé (0/16 joueurs, prêt pour une nouvelle édition)."
                    });
                  });
                });
              });
            });
          });
        } else {
          res.json({
            message: "Paiement validé avec succès"
          });
        }
      }
    );
  });
};

/**
 * LOGIQUE DE SIMULATION : Ajouter 15 joueurs de test avec comptes + inscriptions + paiements validés
 */
exports.createTestPlayers = (req, res) => {

    const tournament_id = req.params.id;
    const timestamp = Date.now();

    const password =
        "$2b$10$7EqJtq98hPqEX7fNZaFWoO4O5x4Yz9W5s6QJ7sV4vF6Jz1x9JQ2O6";

    // ==========================================
    // RÉCUPÉRER LE TOURNOI
    // ==========================================

    db.query(
        `
        SELECT
            entry_fee,
            players_limit,
            game
        FROM tournaments
        WHERE id = ?
        `,
        [tournament_id],
        (err, tourneyResult) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: err.message
                });

            }

            if (tourneyResult.length === 0) {

                return res.status(404).json({
                    error: "Tournoi introuvable"
                });

            }

            const tournament = tourneyResult[0];

            const entryFee =
                Number(tournament.entry_fee) || 0;

            const playersLimit =
                Number(tournament.players_limit) || 16;

            // ==========================================
            // COMPTER LES JOUEURS DÉJÀ INSCRITS
            // ==========================================

            db.query(
                `
                SELECT COUNT(*) AS total
                FROM tournament_players
                WHERE tournament_id = ?
                `,
                [tournament_id],
                (err, countResult) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            error: err.message
                        });

                    }

                    const currentPlayers =
                        Number(countResult[0].total) || 0;

                    // ==========================================
                    // TOURNOI DÉJÀ COMPLET
                    // ==========================================

                    if (currentPlayers >= playersLimit) {

                        return res.status(400).json({

                            message:
                                `Le tournoi est déjà complet (${currentPlayers}/${playersLimit}).`,

                            players_added: 0,

                            players_count: currentPlayers,

                            players_limit: playersLimit

                        });

                    }

                    // ==========================================
                    // NOMBRE DE JOUEURS À AJOUTER
                    // ==========================================

                    const remainingPlayers =
                        playersLimit - currentPlayers;

                    let addedCount = 0;

                    // ==========================================
                    // CRÉATION DES JOUEURS
                    // ==========================================

                    const insertSinglePlayer = (index) => {

                        if (index > remainingPlayers) {

                            return res.json({

                                message:
                                    `Simulation terminée : ${addedCount} joueurs test ajoutés. 🏆`,

                                players_added:
                                    addedCount,

                                players_count:
                                    currentPlayers + addedCount,

                                players_limit:
                                    playersLimit,

                                game:
                                    tournament.game

                            });

                        }

                        const user = {

                            name:
                                `Test Player ${currentPlayers + index}`,

                            pseudo:
                                `TestPlayer_${timestamp}_${currentPlayers + index}`,

                            email:
                                `test_${timestamp}_${currentPlayers + index}@arenafoot.com`,

                            phone:
                                `97${String(
                                    currentPlayers + index
                                ).padStart(6, "0")}`,

                            efootball_id:
                                `EFOOT_${timestamp}_${currentPlayers + index}`,

                            password

                        };

                        // ==========================================
                        // CRÉER LE COMPTE
                        // ==========================================

                        db.query(

                            `
                            INSERT INTO users
                            (
                                name,
                                pseudo,
                                email,
                                phone,
                                efootball_id,
                                password
                            )
                            VALUES (?, ?, ?, ?, ?, ?)
                            `,

                            [
                                user.name,
                                user.pseudo,
                                user.email,
                                user.phone,
                                user.efootball_id,
                                user.password
                            ],

                            (err, userRes) => {

                                if (err) {

                                    console.error(
                                        `Erreur création joueur ${index}:`,
                                        err
                                    );

                                    return insertSinglePlayer(
                                        index + 1
                                    );

                                }

                                const newUserId =
                                    userRes.insertId;

                                // ==========================================
                                // INSCRIPTION AU TOURNOI
                                // ==========================================

                                db.query(

                                    `
                                    INSERT INTO tournament_players
                                    (
                                        tournament_id,
                                        player_id,
                                        payment_status
                                    )
                                    VALUES (?, ?, 'paid')
                                    `,

                                    [
                                        tournament_id,
                                        newUserId
                                    ],

                                    (err) => {

                                        if (err) {

                                            console.error(
                                                `Erreur inscription joueur ${index}:`,
                                                err
                                            );

                                            return insertSinglePlayer(
                                                index + 1
                                            );

                                        }

                                        // ==========================================
                                        // CRÉER LE PAIEMENT TEST
                                        // ==========================================

                                        db.query(

                                            `
                                            INSERT INTO payments
                                            (
                                                player_id,
                                                tournament_id,
                                                amount,
                                                method,
                                                transaction_id,
                                                status
                                            )
                                            VALUES (
                                                ?,
                                                ?,
                                                ?,
                                                'TEST_SIMULATION',
                                                ?,
                                                'success'
                                            )
                                            `,

                                            [
                                                newUserId,
                                                tournament_id,
                                                entryFee,
                                                `SIM_TX_${timestamp}_${currentPlayers + index}`
                                            ],

                                            (err) => {

                                                if (err) {

                                                    console.error(
                                                        `Erreur paiement joueur ${index}:`,
                                                        err
                                                    );

                                                }

                                                addedCount++;

                                                insertSinglePlayer(
                                                    index + 1
                                                );

                                            }

                                        );

                                    }

                                );

                            }

                        );

                    };

                    insertSinglePlayer(1);

                }

            );

        }

    );

};

/**
 * GENERATION DU BRACKET : Tirage au sort et création des 8 matchs de 1/8ème de finale (16 joueurs)
 */
exports.generateBracket = (req, res) => {

    const tournamentId = req.params.id;

    db.query(
        "SELECT game FROM tournaments WHERE id = ?",
        [tournamentId],
        (err, result) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Erreur récupération du jeu du tournoi"
                });
            }

            if (result.length === 0) {

                return res.status(404).json({
                    message: "Tournoi introuvable"
                });

            }

            const game = result[0].game;

            // ==========================================
            // CALL OF DUTY
            // ==========================================

           if (game === "call_of_duty") {

    return matchController.generateCallOfDutyMatches(
        req.params.id,
        res
    );

}

            // ==========================================
            // EFOOTBALL
            // ON GARDE EXACTEMENT L'ANCIEN SYSTÈME
            // ==========================================

            return matchController.generateMatches(
                req,
                res
            );

        }
    );



};

exports.getBracket = (req, res) => {
    return matchController.getBracket(req, res);
};

/**
 * AFFICHER LE BRACKET D'UN TOURNOI
 */
exports.getTournamentBracket = (req, res) => {
  const tournament_id = req.params.id;

  const sql = `
    SELECT 
      m.id,
      m.round,
      m.status,
      m.winner,
      u1.pseudo AS player_one_pseudo,
      u2.pseudo AS player_two_pseudo
    FROM matches m
    LEFT JOIN users u1 ON m.player_one = u1.id
    LEFT JOIN users u2 ON m.player_two = u2.id
    WHERE m.tournament_id = ?
    ORDER BY m.id ASC
  `;

  db.query(sql, [tournament_id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// Voir un joueur
exports.getPlayer = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT
        u.id,
        u.name,
        u.pseudo,
        u.email,
        u.phone,
        u.efootball_id,
        u.role,

        (
            SELECT COUNT(*)
            FROM tournament_players
            WHERE player_id = u.id
        ) AS tournaments,

        (
            SELECT COUNT(*)
            FROM matches
            WHERE player_one = u.id
            OR player_two = u.id
        ) AS matches,

        (
            SELECT COUNT(*)
            FROM matches
            WHERE winner = u.id
        ) AS wins

    FROM users u
    WHERE u.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Joueur introuvable"
      });
    }

    res.json(result[0]);
  });
};

exports.banPlayer = (req, res) => {
  const id = req.params.id;

  db.query(
    `
    UPDATE users
    SET status = 'banned'
    WHERE id = ?
    `,
    [id],
    (err) => {
      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Joueur banni avec succès"
      });
    }
  );
};

exports.deletePlayer = (req, res) => {
  const id = req.params.id;

  db.query("SELECT role FROM users WHERE id = ?", [id], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Joueur introuvable"
      });
    }

    if (result[0].role === "admin") {
      return res.status(400).json({
        message: "Impossible de supprimer un administrateur."
      });
    }

    db.query("DELETE FROM tournament_players WHERE player_id = ?", [id], (err) => {
      if (err) {
        return res.status(500).json(err);
      }

      db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
        if (err) {
          return res.status(500).json(err);
        }

        res.json({
          message: "Joueur supprimé avec succès"
        });
      });
    });
  });
};

exports.deleteTournament = (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM tournament_players WHERE tournament_id = ?", [id], (err) => {
    if (err) return res.status(500).json(err);

    db.query("DELETE FROM matches WHERE tournament_id = ?", [id], (err) => {
      if (err) return res.status(500).json(err);

      db.query("DELETE FROM tournaments WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json(err);

        res.json({
          message: "Tournoi supprimé avec succès"
        });
      });
    });
  });
};

exports.getTournamentPlayers = (req, res) => {
  const tournament_id = req.params.id;

  const sql = `
    SELECT
        users.id,
        users.name,
        users.pseudo,
        users.phone,
        tournament_players.payment_status

    FROM tournament_players

    JOIN users
    ON tournament_players.player_id = users.id

    WHERE tournament_players.tournament_id = ?
  `;

  db.query(sql, [tournament_id], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(result);
  });
};

// Voir tous les paiements
exports.getPayments = (req, res) => {
  const sql = `
    SELECT
        payments.id,
        users.pseudo,
        tournaments.name AS tournament,
        payments.amount,
        payments.method,
        payments.transaction_id,
        payments.status,
        payments.created_at

    FROM payments

    JOIN users
    ON payments.player_id = users.id

    JOIN tournaments
    ON payments.tournament_id = tournaments.id

    ORDER BY payments.created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    res.json(result);
  });
};

// Voir toutes les récompenses
exports.getRewards = (req, res) => {
  const sql = `
    SELECT
        rewards.id,
        users.pseudo,
        tournaments.name AS tournament,
        rewards.amount,
        rewards.phone,
        rewards.status

    FROM rewards

    JOIN users
    ON rewards.player_id = users.id

    JOIN tournaments
    ON rewards.tournament_id = tournaments.id

    ORDER BY rewards.id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(result);
  });
};



// ================================
// CONNEXION ADMIN
// ================================

exports.login = (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email et mot de passe requis"
    });
  }

  db.query(
    `
    SELECT *
    FROM users
    WHERE email = ?
    AND role = 'admin'
    LIMIT 1
    `,
    [email],
    (err, result) => {

      if (err) {
        console.error("ERREUR LOGIN ADMIN :", err);

        return res.status(500).json({
          message: "Erreur serveur"
        });
      }

      if (result.length === 0) {
        return res.status(401).json({
          message: "Accès administrateur refusé"
        });
      }

      const admin = result[0];

      bcrypt.compare(
        password,
        admin.password,
        (err, match) => {

          if (err) {
            return res.status(500).json({
              message: "Erreur serveur"
            });
          }

          if (!match) {
            return res.status(401).json({
              message: "Mot de passe incorrect"
            });
          }

          const token = jwt.sign(
            {
              id: admin.id,
              email: admin.email,
              role: admin.role
            },
            process.env.JWT_SECRET,
            {
              expiresIn: "24h"
            }
          );

          res.json({
            message: "Connexion administrateur réussie",
            token,
            user: {
              id: admin.id,
              name: admin.name,
              email: admin.email,
              role: admin.role
            }
          });

        }
      );

    }
  );

};





// ================================
// MOT DE PASSE OUBLIÉ ADMIN
// ================================

exports.forgotPassword = async (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email requis"
    });
  }

  db.query(
    `
    SELECT id, name, email
    FROM users
    WHERE email = ?
    AND role = 'admin'
    LIMIT 1
    `,
    [email],
    async (err, result) => {

      if (err) {
        console.error(err);

        return res.status(500).json({
          message: "Erreur serveur"
        });
      }

      if (result.length === 0) {
        return res.status(404).json({
          message: "Administrateur introuvable"
        });
      }

      const admin = result[0];

      const code = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      const expire = new Date(
        Date.now() + 10 * 60 * 1000
      );

      db.query(
        `
        INSERT INTO email_verifications
        (user_id, code, type, expires_at)
        VALUES (?, ?, 'reset', ?)
        `,
        [admin.id, code, expire],
        async (err) => {

          if (err) {
            console.error("ERREUR CODE RESET ADMIN :", err);

            return res.status(500).json({
              message: "Impossible de générer le code"
            });
          }

          try {

            await client.transactionalEmails.sendTransacEmail({

              sender: {
                name: "ArenaFoot",
                email: "arenafoot.app@gmail.com"
              },

              to: [
                {
                  email: admin.email
                }
              ],

              subject: "Réinitialisation du mot de passe administrateur",

              htmlContent: `
                <h2>ArenaFoot 🔐</h2>

                <p>Bonjour ${admin.name || "Administrateur"},</p>

                <p>
                  Voici votre code de vérification :
                </p>

                <h1 style="color:#2563eb">
                  ${code}
                </h1>

                <p>
                  Ce code expire dans 10 minutes.
                </p>

                <p>
                  Si vous n'êtes pas à l'origine de cette demande,
                  ignorez simplement cet email.
                </p>
              `

            });

            res.json({
              message: "Code envoyé"
            });

          } catch (error) {

            console.error(
              "ERREUR BREVO RESET ADMIN :",
              error
            );

            res.status(500).json({
              message: "Impossible d'envoyer le code"
            });

          }

        }
      );

    }
  );

};




exports.verifyResetCode = (req, res) => {

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      message: "Email et code requis"
    });
  }

  const sql = `
    SELECT
      ev.id,
      ev.user_id,
      ev.code,
      ev.expires_at
    FROM email_verifications ev

    JOIN users u
      ON ev.user_id = u.id

    WHERE u.email = ?
      AND u.role = 'admin'
      AND ev.type = 'reset'

    ORDER BY ev.id DESC
    LIMIT 1
  `;

  db.query(sql, [email], (err, result) => {

    if (err) {
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Aucun code trouvé"
      });
    }

    const verification = result[0];

    if (verification.code !== code) {
      return res.status(400).json({
        message: "Code incorrect"
      });
    }

    if (
      new Date() >
      new Date(verification.expires_at)
    ) {
      return res.status(400).json({
        message: "Code expiré"
      });
    }

    res.json({
      message: "Code vérifié",
      user_id: verification.user_id
    });

  });

};




exports.resetPassword = async (req, res) => {

  const {
    email,
    code,
    password
  } = req.body;

  if (!email || !code || !password) {
    return res.status(400).json({
      message: "Email, code et nouveau mot de passe requis"
    });
  }

  db.query(
    `
    SELECT
      ev.id,
      ev.user_id,
      ev.code,
      ev.expires_at
    FROM email_verifications ev

    JOIN users u
      ON ev.user_id = u.id

    WHERE u.email = ?
      AND u.role = 'admin'
      AND ev.type = 'reset'

    ORDER BY ev.id DESC
    LIMIT 1
    `,
    [email],
    async (err, result) => {

      if (err) {
        return res.status(500).json(err);
      }

      if (result.length === 0) {
        return res.status(404).json({
          message: "Code introuvable"
        });
      }

      const verification = result[0];

      if (verification.code !== code) {
        return res.status(400).json({
          message: "Code incorrect"
        });
      }

      if (
        new Date() >
        new Date(verification.expires_at)
      ) {
        return res.status(400).json({
          message: "Code expiré"
        });
      }

      try {

        const hash = await bcrypt.hash(
          password,
          10
        );

        db.query(
          `
          UPDATE users
          SET password = ?
          WHERE id = ?
          AND role = 'admin'
          `,
          [hash, verification.user_id],
          (err) => {

            if (err) {
              return res.status(500).json(err);
            }

            db.query(
              `
              DELETE FROM email_verifications
              WHERE id = ?
              `,
              [verification.id]
            );

            res.json({
              message:
                "Mot de passe administrateur modifié avec succès 🎉"
            });

          }
        );

      } catch (error) {

        console.error(error);

        res.status(500).json({
          message: "Erreur lors de la modification du mot de passe"
        });

      }

    }
  );

};