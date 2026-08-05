const db = require("../config/database");

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
  db.query("SELECT * FROM tournaments", (err, result) => {
    console.log("TOURNOIS :", result);
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
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
  const password = "$2b$10$7EqJtq98hPqEX7fNZaFWoO4O5x4Yz9W5s6QJ7sV4vF6Jz1x9JQ2O6";

  db.query("SELECT entry_fee FROM tournaments WHERE id = ?", [tournament_id], (err, tourneyResult) => {
    if (err || tourneyResult.length === 0) {
      return res.status(500).json({ error: "Tournoi introuvable ou erreur SQL" });
    }

    const entryFee = tourneyResult[0].entry_fee || 0;
    let addedCount = 0;
    let errors = 0;

    const insertSinglePlayer = (index) => {
      if (index > 15) {
        return res.json({
          message: `Simulation terminée : ${addedCount} joueurs de test créés et marqués comme 'paid' ! 🏆`
        });
      }

      const user = {
        name: `Test Player ${index}`,
        pseudo: `TestPlayer_${timestamp}_${index}`,
        email: `test_${timestamp}_${index}@arenafoot.com`,
        phone: `97${String(index).padStart(6, '0')}`,
        efootball_id: `EFOOT_${timestamp}_${index}`,
        password: password
      };

      db.query(
        `INSERT INTO users (name, pseudo, email, phone, efootball_id, password) VALUES (?, ?, ?, ?, ?, ?)`,
        [user.name, user.pseudo, user.email, user.phone, user.efootball_id, user.password],
        (err, userRes) => {
          if (err) {
            console.error(`Erreur création user ${index}:`, err);
            errors++;
            return insertSinglePlayer(index + 1);
          }

          const newUserId = userRes.insertId;

          db.query(
            `INSERT INTO tournament_players (tournament_id, player_id, payment_status) VALUES (?, ?, 'paid')`,
            [tournament_id, newUserId],
            (err) => {
              if (err) {
                console.error(`Erreur inscription tournament_players ${index}:`, err);
                errors++;
                return insertSinglePlayer(index + 1);
              }

              db.query(
                `INSERT INTO payments (player_id, tournament_id, amount, method, transaction_id, status) VALUES (?, ?, ?, 'TEST_SIMULATION', ?, 'success')`,
                [newUserId, tournament_id, entryFee, `SIM_TX_${timestamp}_${index}`],
                (err) => {
                  if (err) {
                    console.error(`Erreur création paiement ${index}:`, err);
                  }
                  addedCount++;
                  insertSinglePlayer(index + 1);
                }
              );
            }
          );
        }
      );
    };

    insertSinglePlayer(1);
  });
};

/**
 * GENERATION DU BRACKET : Tirage au sort et création des 8 matchs de 1/8ème de finale (16 joueurs)
 */
exports.generateBracket = (req, res) => {
  const tournament_id = req.params.id;

  const sqlGetPlayers = `
    SELECT player_id 
    FROM tournament_players 
    WHERE tournament_id = ? AND payment_status = 'paid'
  `;

  db.query(sqlGetPlayers, [tournament_id], (err, players) => {
    if (err) {
      console.error("Erreur récupération joueurs :", err);
      return res.status(500).json(err);
    }

    if (players.length < 16) {
      return res.status(400).json({
        message: `Impossible de générer le bracket. Il faut 16 joueurs payés (actuellement : ${players.length}/16).`
      });
    }

    db.query("SELECT COUNT(*) AS count FROM matches WHERE tournament_id = ?", [tournament_id], (err, matchCheck) => {
      if (err) return res.status(500).json(err);

      if (matchCheck[0].count > 0) {
        return res.status(400).json({
          message: "Le bracket a déjà été généré pour ce tournoi !"
        });
      }

      const shuffledPlayers = [...players];
      for (let i = shuffledPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
      }

      const matchesToInsert = [];
      for (let i = 0; i < 16; i += 2) {
        matchesToInsert.push([
          tournament_id,
          shuffledPlayers[i].player_id,
          shuffledPlayers[i + 1].player_id,
          "round_of_16",
          "pending"
        ]);
      }

      const sqlInsertMatches = `
        INSERT INTO matches (tournament_id, player_one, player_two, round, status)
        VALUES ?
      `;

      db.query(sqlInsertMatches, [matchesToInsert], (err) => {
        if (err) {
          console.error("Erreur insertion matchs :", err);
          return res.status(500).json(err);
        }

        db.query("UPDATE tournaments SET status = 'in_progress' WHERE id = ?", [tournament_id], (err) => {
          if (err) return res.status(500).json(err);

          res.json({
            message: "🏆 Bracket généré avec succès ! 8 matchs créés pour les 1/8ème de finale."
          });
        });
      });
    });
  });
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