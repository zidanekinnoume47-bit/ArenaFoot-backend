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

// Valider un paiement
exports.validatePayment = (req, res) => {
  const id = req.params.id;

  db.query(
    `
    UPDATE payments
    SET status='success'
    WHERE id=?
    `,
    [id],
    (err) => {
      if (err) {
        return res.status(500).json(err);
      }
      res.json({
        message: "Paiement validé"
      });
    }
  );
};

/**
 * LOGIQUE DE SIMULATION : Ajouter 15 joueurs de test avec comptes + inscriptions + paiements validés
 * Cela permet de tester le comportement quand le tournoi atteint 16/16 (ex: masquage du bouton participer).
 */
exports.createTestPlayers = (req, res) => {
  const tournament_id = req.params.id;
  const timestamp = Date.now(); // Pour éviter les conflits d'unicité d'email/pseudo
  const password = "$2b$10$7EqJtq98hPqEX7fNZaFWoO4O5x4Yz9W5s6QJ7sV4vF6Jz1x9JQ2O6"; // Hash bcrypt par défaut

  // Récupérer d'abord le montant du tournoi pour enregistrer le paiement
  db.query("SELECT entry_fee FROM tournaments WHERE id = ?", [tournament_id], (err, tourneyResult) => {
    if (err || tourneyResult.length === 0) {
      return res.status(500).json({ error: "Tournoi introuvable ou erreur SQL" });
    }

    const entryFee = tourneyResult[0].entry_fee || 0;
    let addedCount = 0;
    let errors = 0;

    // Fonction récursive pour insérer 15 joueurs les uns après les autres sans surcharger la BD
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

      // 1. Insertion dans 'users'
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

          // 2. Inscription au tournoi dans 'tournament_players' (Double vérification: Compte OK + statut 'paid')
          db.query(
            `INSERT INTO tournament_players (tournament_id, player_id, user_id, payment_status) VALUES (?, ?, ?, 'paid')`,
            [tournament_id, newUserId, newUserId],
            (err) => {
              if (err) {
                console.error(`Erreur inscription tournament_players ${index}:`, err);
                errors++;
                return insertSinglePlayer(index + 1);
              }

              // 3. Insertion dans la table 'payments' pour respecter la double condition stricte
              db.query(
                `INSERT INTO payments (player_id, tournament_id, amount, method, transaction_id, status) VALUES (?, ?, ?, 'TEST_SIMULATION', ?, 'success')`,
                [newUserId, tournament_id, entryFee, `SIM_TX_${timestamp}_${index}`],
                (err) => {
                  if (err) {
                    console.error(`Erreur création paiement ${index}:`, err);
                  }
                  addedCount++;
                  // Passer au joueur suivant
                  insertSinglePlayer(index + 1);
                }
              );
            }
          );
        }
      );
    };

    // Lancer la première insertion (index 1 à 15)
    insertSinglePlayer(1);
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