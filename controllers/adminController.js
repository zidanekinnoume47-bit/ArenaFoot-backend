import React, { useEffect, useState } from "react";
import Sidebar from "../components/admin/Sidebar";
import {
  getTournaments,
  deleteTournament,
  getTournamentPlayers,
  createTestPlayers,
  generateBracket
} from "../service/adminService";

function AdminTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'players' ou 'bracket'
  const [loadingTournamentId, setLoadingTournamentId] = useState(null);
  const [bracketLoadingId, setBracketLoadingId] = useState(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const data = await getTournaments();
    setTournaments(Array.isArray(data) ? data : []);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce tournoi ?")) return;
    const data = await deleteTournament(id);
    alert(data.message);
    loadTournaments();
  };

  const handlePlayers = async (id) => {
    console.log("Tournoi :", id);
    const data = await getTournamentPlayers(id);
    console.log("JOUEURS :", data);
    setPlayers(Array.isArray(data) ? data : []);
    setSelectedTournament(id);
    setViewMode("players");
  };

  // Charger et afficher les matchs du tournoi
  const handleShowBracket = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://arenafoot-backend-production.up.railway.app/api/admin/tournament/${id}/bracket`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await response.json();
      setMatches(Array.isArray(data) ? data : []);
      setSelectedTournament(id);
      setViewMode("bracket");
    } catch (err) {
      console.error("Erreur chargement bracket :", err);
    }
  };

  // Fonction pour injecter 15 joueurs de test payés
  const handleAddTestPlayers = async (tournamentId) => {
    if (
      !window.confirm(
        "Voulez-vous simuler l'ajout de 15 joueurs de test payés pour ce tournoi ?"
      )
    ) {
      return;
    }

    setLoadingTournamentId(tournamentId);

    try {
      const res = await createTestPlayers(tournamentId);
      alert(res.message || "Joueurs de test ajoutés avec succès ! 🏆");
      
      // Recharger la liste des joueurs si ce tournoi était ouvert
      await handlePlayers(tournamentId);
      await loadTournaments();
    } catch (err) {
      console.error("Erreur simulation :", err);
      alert("❌ Une erreur est survenue lors de l'ajout des joueurs.");
    } finally {
      setLoadingTournamentId(null);
    }
  };

  // Fonction pour déclencher la génération automatique du Bracket (16 joueurs)
  const handleGenerateBracket = async (tournamentId) => {
    if (
      !window.confirm(
        "Générer le tirage au sort et les 8 matchs de 1/8ème de finale pour ce tournoi ?"
      )
    ) {
      return;
    }

    setBracketLoadingId(tournamentId);

    try {
      const res = await generateBracket(tournamentId);
      if (res.message) {
        alert(res.message);
      } else {
        alert("❌ Impossible de générer le bracket.");
      }
      await handleShowBracket(tournamentId);
      loadTournaments();
    } catch (err) {
      console.error("Erreur génération bracket :", err);
      alert("❌ Une erreur est survenue lors de la génération du bracket.");
    } finally {
      setBracketLoadingId(null);
    }
  };

  return (
    <div className="admin-page">
      <Sidebar />

      <div style={{ marginLeft: "280px", padding: "20px" }}>
        <h1>🏆 Gestion des tournois</h1>

        {tournaments.map((t) => {
          // Compter les joueurs inscrits si les participants sont chargés
          const isSelected = selectedTournament === t.id;
          const paidCount = isSelected && viewMode === "players"
            ? players.filter((p) => p.payment_status === "paid").length
            : null;
          const isFull = paidCount !== null && paidCount >= 16;

          return (
            <div
              key={t.id}
              style={{
                border: isFull ? "2px solid #ef4444" : "1px solid #ddd",
                padding: "15px",
                marginBottom: "15px",
                borderRadius: "8px",
                backgroundColor: isFull ? "#fef2f2" : "#ffffff"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>{t.name}</h3>
                {isFull && (
                  <span
                    style={{
                      backgroundColor: "#ef4444",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      fontSize: "0.85rem"
                    }}
                  >
                    COMPLET (16/16)
                  </span>
                )}
              </div>

              <p>Participation : {t.entry_fee} FCFA</p>

              <p>Récompense : {t.reward} FCFA</p>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                <button onClick={() => handlePlayers(t.id)}>
                  👥 Participants {isSelected && viewMode === "players" ? `(${players.length})` : ""}
                </button>

                <button
                  onClick={() => handleShowBracket(t.id)}
                  style={{ backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", padding: "8px 12px", cursor: "pointer" }}
                >
                  👁 Voir le Bracket
                </button>

                {/* BOUTON DE GENERATION DU BRACKET */}
                <button
                  onClick={() => handleGenerateBracket(t.id)}
                  disabled={bracketLoadingId === t.id}
                  style={{
                    backgroundColor: "#16a34a",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  {bracketLoadingId === t.id ? "⏳ Tirage..." : "🏆 Générer Bracket"}
                </button>

                <button>✏ Modifier</button>

                {/* BOUTON TEST POUR INJECTER LES 15 JOUEURS */}
                <button
                  onClick={() => handleAddTestPlayers(t.id)}
                  disabled={loadingTournamentId === t.id}
                  style={{
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  {loadingTournamentId === t.id
                    ? "⏳ Inscription en cours..."
                    : "🧪 Ajouter 15 Joueurs Test"}
                </button>

                <button
                  onClick={() => handleDelete(t.id)}
                  style={{ backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "4px" }}
                >
                  🗑 Supprimer
                </button>
              </div>

              {/* TABLEAU DES PARTICIPANTS */}
              {isSelected && viewMode === "players" && (
                <div style={{ marginTop: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3>
                      Participants ({players.length}/16)
                    </h3>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: paidCount >= 16 ? "#dc2626" : "#16a34a"
                      }}
                    >
                      {paidCount} Joueurs Payés
                    </span>
                  </div>

                  <table className="admin-table" style={{ width: "100%", marginTop: "10px" }}>
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Pseudo</th>
                        <th>Téléphone</th>
                        <th>Paiement</th>
                      </tr>
                    </thead>

                    <tbody>
                      {players.map((p) => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td>{p.pseudo}</td>
                          <td>{p.phone}</td>
                          <td>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                backgroundColor:
                                  p.payment_status === "paid"
                                    ? "#dcfce7"
                                    : "#fef3c7",
                                color:
                                  p.payment_status === "paid"
                                    ? "#166534"
                                    : "#92400e",
                                fontWeight: "bold"
                              }}
                            >
                              {p.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ARBRE DU TOURNOI (MATCHS) */}
              {isSelected && viewMode === "bracket" && (
                <div style={{ marginTop: "20px" }}>
                  <h3>🏆 Arbre du Tournoi - 1/8ème de Finale ({matches.length} Matchs)</h3>
                  {matches.length === 0 ? (
                    <p style={{ color: "#666" }}>Aucun match n'a encore été généré. Cliquez sur "🏆 Générer Bracket".</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "15px", marginTop: "15px" }}>
                      {matches.map((m, index) => (
                        <div
                          key={m.id}
                          style={{
                            border: "1px solid #3b82f6",
                            borderRadius: "8px",
                            padding: "12px",
                            backgroundColor: "#eff6ff"
                          }}
                        >
                          <h4 style={{ margin: "0 0 10px 0", color: "#1d4ed8" }}>Match {index + 1}</h4>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                            <span>{m.player_one_pseudo || "En attente"}</span>
                            <span>VS</span>
                            <span>{m.player_two_pseudo || "En attente"}</span>
                          </div>
                          <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#6b7280" }}>
                            Statut : {m.status === "pending" ? "⏳ En attente" : m.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminTournaments;