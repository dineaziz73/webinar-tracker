"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getLastSwitch, getNextSwitch, formatDuration, fmt, fmtNum, pct } from "../lib/utils";

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Delta({ current, prev }) {
  const d = pct(current, prev);
  if (d === null) return null;
  const up = d >= 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: "monospace",
      color: up ? "#4ade80" : "#f87171",
      background: up ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
      padding: "2px 8px", borderRadius: 100,
    }}>
      {up ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
    </span>
  );
}

function Bar({ value, max }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: "#1c1c1c", borderRadius: 6, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, height: "100%", background: "#F5C518", borderRadius: 6, transition: "width 0.8s ease" }} />
    </div>
  );
}

function Card({ label, value, highlight, delta, prev }) {
  return (
    <div style={{
      background: highlight ? "#F5C518" : "#111",
      border: highlight ? "none" : "1px solid #1e1e1e",
      borderRadius: 18, padding: "22px 18px",
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative", overflow: "hidden",
    }}>
      {highlight && <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "rgba(0,0,0,0.06)", borderRadius: "50%" }} />}
      <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", color: highlight ? "#000000aa" : "#555", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 900, color: highlight ? "#000" : "#fff", lineHeight: 1, fontFamily: "monospace" }}>{value}</span>
      {delta !== undefined && prev !== undefined && <Delta current={delta} prev={prev} />}
    </div>
  );
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

function UpdateForm({ onUpdate, currentData, saving }) {
  const [spend, setSpend] = useState("");
  const [inscrits, setInscrits] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (currentData) {
      setSpend(currentData.spend?.toString() || "");
      setInscrits(currentData.inscrits?.toString() || "");
    }
  }, [currentData]);

  const inputStyle = {
    background: "#0d0d0d", border: "1px solid #222", borderRadius: 10,
    padding: "14px 16px", color: "#fff", fontSize: 18, fontWeight: 700,
    fontFamily: "monospace", outline: "none", width: "100%",
  };

  const valid = spend && inscrits && !isNaN(parseFloat(spend)) && !isNaN(parseInt(inscrits));

  const handleSubmit = () => {
    if (!valid || saving) return;
    onUpdate({
      spend: parseFloat(spend.replace(",", ".")),
      inscrits: parseInt(inscrits),
      note,
    });
    setNote("");
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 20, padding: 24, marginBottom: 24 }}>
      <div style={{ color: "#F5C518", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 20, fontWeight: 700 }}>
        ✏ Mettre à jour
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ color: "#555", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 6 }}>Spend total (€)</label>
          <input style={inputStyle} type="number" placeholder="0.00" value={spend} onChange={e => setSpend(e.target.value)} />
        </div>
        <div>
          <label style={{ color: "#555", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 6 }}>Inscrits total</label>
          <input style={inputStyle} type="number" placeholder="0" value={inscrits} onChange={e => setInscrits(e.target.value)} />
        </div>
      </div>
      <input
        style={{ ...inputStyle, fontSize: 13, fontWeight: 400, marginBottom: 12 }}
        placeholder="Note optionnelle (ex: nouveau créatif lancé)"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        disabled={!valid || saving}
        style={{
          background: valid && !saving ? "#F5C518" : "#1a1a1a",
          color: valid && !saving ? "#000" : "#333",
          border: "none", borderRadius: 12, padding: "14px 24px",
          fontWeight: 800, fontSize: 14,
          cursor: valid && !saving ? "pointer" : "default",
          fontFamily: "monospace", letterSpacing: 1, width: "100%",
          transition: "all 0.2s",
        }}
      >
        {saving ? "Enregistrement..." : "Enregistrer →"}
      </button>
    </div>
  );
}

// ─── Historique ───────────────────────────────────────────────────────────────

function Historique({ logs }) {
  if (!logs || logs.length === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ color: "#333", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 12 }}>Historique</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[...logs].reverse().slice(0, 6).map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0a", border: "1px solid #141414", borderRadius: 10, padding: "10px 14px", flexWrap: "wrap", gap: 4 }}>
            <span style={{ color: "#444", fontSize: 11, fontFamily: "monospace" }}>
              {new Date(l.updated_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}{" "}
              {new Date(l.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              {l.note && <span style={{ color: "#2a2a2a", marginLeft: 8 }}>— {l.note}</span>}
            </span>
            <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>
              {fmt(l.spend)} · {fmtNum(l.inscrits)} inscrits
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal Switch ─────────────────────────────────────────────────────────────

function SwitchModal({ currentData, cpl, onConfirm, onCancel, saving }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🔄</div>
        <h2 style={{ color: "#fff", fontFamily: "monospace", margin: "0 0 12px", fontSize: 20 }}>Confirmer le switch ?</h2>
        <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
          La semaine actuelle sera archivée. Un nouveau compteur démarre maintenant pour tout le monde.
        </p>
        {currentData && (
          <div style={{ background: "#0d0d0d", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace", marginBottom: 8 }}>Résumé de la semaine qui se termine :</div>
            <div style={{ color: "#F5C518", fontWeight: 700, fontFamily: "monospace" }}>
              {fmt(currentData.spend)} · {fmtNum(currentData.inscrits)} inscrits · CPL {fmt(cpl)}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={saving} style={{ flex: 1, background: "#1a1a1a", border: "1px solid #222", color: "#666", borderRadius: 10, padding: 14, cursor: "pointer", fontFamily: "monospace", fontSize: 13 }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={saving} style={{ flex: 2, background: "#F5C518", border: "none", color: "#000", borderRadius: 10, padding: 14, fontWeight: 800, cursor: "pointer", fontFamily: "monospace", fontSize: 13 }}>
            {saving ? "En cours..." : "Confirmer →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function TrackerApp() {
  const [currentData, setCurrentData] = useState(null);
  const [prevWeek, setPrevWeek] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeCohort, setActiveCohort] = useState(null);
  const [now, setNow] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tick toutes les 60s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Charger les données initiales
  const loadData = useCallback(async () => {
    try {
      // Récupérer la cohorte active
      const { data: cohorts, error: ce } = await supabase
        .from("cohorts")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (ce) throw ce;

      let cohort = cohorts?.[0] || null;

      // Récupérer la dernière cohorte inactive (semaine précédente)
      const { data: prevCohorts } = await supabase
        .from("cohorts")
        .select("*")
        .eq("active", false)
        .order("created_at", { ascending: false })
        .limit(1);

      const prevCohort = prevCohorts?.[0] || null;

      if (cohort) {
        setActiveCohort(cohort);

        // Récupérer le dernier update de la cohorte active
        const { data: updates } = await supabase
          .from("updates")
          .select("*")
          .eq("cohort_id", cohort.id)
          .order("created_at", { ascending: false });

        setLogs(updates || []);
        setCurrentData(updates?.[0] || null);
      } else {
        setActiveCohort(null);
        setCurrentData(null);
        setLogs([]);
      }

      // Données semaine précédente
      if (prevCohort) {
        const { data: prevUpdates } = await supabase
          .from("updates")
          .select("*")
          .eq("cohort_id", prevCohort.id)
          .order("created_at", { ascending: false })
          .limit(1);

        setPrevWeek(prevUpdates?.[0] || null);
      }
    } catch (e) {
      setError("Erreur de connexion à la base de données.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime : écouter les nouveaux updates
  useEffect(() => {
    const channel = supabase
      .channel("updates-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "updates" }, (payload) => {
        setCurrentData(payload.new);
        setLogs(prev => [payload.new, ...prev]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cohorts" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cohorts" }, () => {
        loadData();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [loadData]);

  const switchTime = activeCohort?.created_at || null;
  const lastSwitch = getLastSwitch(switchTime);
  const nextSwitch = getNextSwitch(lastSwitch);
  const elapsed = now - lastSwitch;
  const total = nextSwitch - lastSwitch;
  const weekPct = Math.min(100, (elapsed / total) * 100);

  const cpl = currentData?.spend > 0 && currentData?.inscrits > 0 ? currentData.spend / currentData.inscrits : 0;
  const prevCpl = prevWeek?.spend > 0 && prevWeek?.inscrits > 0 ? prevWeek.spend / prevWeek.inscrits : 0;
  const switchLabel = lastSwitch.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const handleUpdate = async ({ spend, inscrits, note }) => {
    setSaving(true);
    try {
      let cohortId = activeCohort?.id;

      // Créer une cohorte active si elle n'existe pas
      if (!cohortId) {
        const { data: newCohort, error: ce } = await supabase
          .from("cohorts")
          .insert({ active: true })
          .select()
          .single();
        if (ce) throw ce;
        cohortId = newCohort.id;
        setActiveCohort(newCohort);
      }

      const { data: newUpdate, error: ue } = await supabase
        .from("updates")
        .insert({ cohort_id: cohortId, spend, inscrits, note })
        .select()
        .single();

      if (ue) throw ue;
      // Le realtime se charge de mettre à jour l'UI
    } catch (e) {
      setError("Erreur lors de l'enregistrement.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSwitch = async () => {
    setSaving(true);
    try {
      // Désactiver la cohorte actuelle
      if (activeCohort) {
        await supabase.from("cohorts").update({ active: false }).eq("id", activeCohort.id);
      }
      // Créer une nouvelle cohorte active
      const { data: newCohort, error: ce } = await supabase
        .from("cohorts")
        .insert({ active: true })
        .select()
        .single();
      if (ce) throw ce;

      setActiveCohort(newCohort);
      setPrevWeek(currentData);
      setCurrentData(null);
      setLogs([]);
      setShowModal(false);
    } catch (e) {
      setError("Erreur lors du switch.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    const texte = [
      `📊 Rapport webinaire — ${switchLabel} 17h → maintenant`,
      "",
      `💸 Spend : ${currentData ? fmt(currentData.spend) : "—"}`,
      `👥 Inscrits : ${currentData ? fmtNum(currentData.inscrits) : "—"}`,
      `🎯 Coût / inscrit : ${cpl > 0 ? fmt(cpl) : "—"}`,
      "",
      `⏱ Mis à jour le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    ].join("\n");
    navigator.clipboard.writeText(texte);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#222", fontFamily: "monospace" }}>Connexion à la base de données...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      {showModal && (
        <SwitchModal currentData={currentData} cpl={cpl} onConfirm={handleSwitch} onCancel={() => setShowModal(false)} saving={saving} />
      )}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #111", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#080808", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "#F5C518", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📊</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>Webinar Tracker</div>
            <div style={{ color: "#2a2a2a", fontSize: 10, fontFamily: "monospace" }}>Switch · {switchLabel} 17h00</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, background: "#4ade80", borderRadius: "50%", boxShadow: "0 0 6px #4ade80" }} title="Temps réel actif" />
          <button
            onClick={() => setShowModal(true)}
            style={{ background: "#111", border: "1px solid #1e1e1e", color: "#F5C518", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}
          >🔄 SWITCH</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px" }}>

        {error && (
          <div style={{ background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 12, padding: 16, marginBottom: 20, color: "#f87171", fontFamily: "monospace", fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {/* Barre progression */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#333", fontSize: 11, fontFamily: "monospace" }}>Semaine en cours</span>
            <span style={{ color: "#F5C518", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{weekPct.toFixed(0)}%</span>
          </div>
          <Bar value={elapsed} max={total} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: "#1e1e1e", fontSize: 10, fontFamily: "monospace" }}>Lancé il y a {formatDuration(elapsed)}</span>
            <span style={{ color: "#1e1e1e", fontSize: 10, fontFamily: "monospace" }}>Prochain switch dans {formatDuration(nextSwitch - now)}</span>
          </div>
        </div>

        {/* Formulaire */}
        <UpdateForm onUpdate={handleUpdate} currentData={currentData} saving={saving} />

        {/* Stats */}
        {currentData ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <Card label="Spend" value={fmt(currentData.spend)} highlight delta={currentData.spend} prev={prevWeek?.spend} />
              <Card label="Inscrits" value={fmtNum(currentData.inscrits)} delta={currentData.inscrits} prev={prevWeek?.inscrits} />
              <Card label="CPL" value={cpl > 0 ? fmt(cpl) : "—"} delta={cpl} prev={prevCpl} />
            </div>

            {/* Résumé client */}
            <div style={{ background: "#0a1a0a", border: "1px solid #142014", borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ color: "#4ade80", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700 }}>📋 Résumé client</span>
                <button
                  onClick={handleCopy}
                  style={{ background: copied ? "#14401a" : "#0d200d", border: "1px solid #1a3a1a", color: copied ? "#4ade80" : "#2a6a2a", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", transition: "all 0.2s" }}
                >
                  {copied ? "✓ Copié !" : "Copier"}
                </button>
              </div>
              <p style={{ color: "#aaa", fontSize: 13, lineHeight: 2, margin: 0, fontFamily: "monospace" }}>
                Depuis le switch du <strong style={{ color: "#fff" }}>{switchLabel} à 17h00</strong> :<br />
                💸 Spend : <strong style={{ color: "#F5C518" }}>{fmt(currentData.spend)}</strong><br />
                👥 Inscrits : <strong style={{ color: "#F5C518" }}>{fmtNum(currentData.inscrits)}</strong><br />
                🎯 Coût / inscrit : <strong style={{ color: "#F5C518" }}>{cpl > 0 ? fmt(cpl) : "—"}</strong>
                {currentData.note && <><br /><span style={{ color: "#555" }}>📝 {currentData.note}</span></>}
              </p>
            </div>

            {/* Comparaison semaine précédente */}
            {prevWeek && (
              <div style={{ background: "#0d0d0d", border: "1px solid #161616", borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <div style={{ color: "#333", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 14 }}>Vs semaine précédente</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Spend", curr: currentData.spend, prev: prevWeek.spend, format: fmt },
                    { label: "Inscrits", curr: currentData.inscrits, prev: prevWeek.inscrits, format: fmtNum },
                    { label: "CPL", curr: cpl, prev: prevCpl, format: fmt },
                  ].map(({ label, curr, prev, format }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ color: "#333", fontSize: 10, fontFamily: "monospace", marginBottom: 4 }}>{label}</div>
                      <div style={{ color: "#fff", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{format(curr)}</div>
                      <div style={{ color: "#2a2a2a", fontSize: 10, fontFamily: "monospace", marginBottom: 4 }}>vs {format(prev)}</div>
                      <Delta current={curr} prev={prev} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Historique logs={logs} />
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#1e1e1e", fontFamily: "monospace", fontSize: 13 }}>
            Saisis les premiers chiffres de la semaine ↑
          </div>
        )}

        {currentData?.updated_at && (
          <div style={{ textAlign: "center", marginTop: 32, color: "#181818", fontSize: 10, fontFamily: "monospace" }}>
            Dernière mise à jour · {new Date(currentData.updated_at).toLocaleDateString("fr-FR")} à{" "}
            {new Date(currentData.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
