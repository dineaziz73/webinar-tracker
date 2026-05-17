"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getLastSwitch, getNextSwitch, formatDuration, fmt, fmtNum, pct } from "../lib/utils";

function Delta({ current, prev }) {
  const d = pct(current, prev);
  if (d === null) return null;
  const up = d >= 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: up ? "#4ade80" : "#f87171", background: up ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", padding: "2px 8px", borderRadius: 100 }}>
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
    <div style={{ background: highlight ? "#F5C518" : "#111", border: highlight ? "none" : "1px solid #1e1e1e", borderRadius: 18, padding: "22px 18px", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
      {highlight && <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "rgba(0,0,0,0.06)", borderRadius: "50%" }} />}
      <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", color: highlight ? "#000000aa" : "#555", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 900, color: highlight ? "#000" : "#fff", lineHeight: 1, fontFamily: "monospace" }}>{value}</span>
      {delta !== undefined && prev !== undefined && <Delta current={delta} prev={prev} />}
    </div>
  );
}

// ─── Formulaire point de départ ───────────────────────────────────────────────

function BaselineForm({ onSave, saving }) {
  const [spend, setSpend] = useState("");
  const [inscrits, setInscrits] = useState("");

  const inputStyle = { background: "#0d0d0d", border: "1px solid #333", borderRadius: 10, padding: "14px 16px", color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "monospace", outline: "none", width: "100%" };
  const valid = spend && inscrits && !isNaN(parseFloat(spend)) && !isNaN(parseInt(inscrits));

  return (
    <div style={{ background: "#0d1500", border: "1px solid #1a3000", borderRadius: 20, padding: 24, marginBottom: 24 }}>
      <div style={{ color: "#F5C518", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8, fontWeight: 700 }}>📍 Point de départ</div>
      <p style={{ color: "#555", fontSize: 12, fontFamily: "monospace", marginBottom: 20, lineHeight: 1.7 }}>
        Saisis les chiffres <strong style={{ color: "#888" }}>bruts affichés dans Meta</strong> au moment du switch.<br />
        L'outil s'en servira comme référence pour calculer uniquement ce qui s'est passé depuis.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ color: "#555", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 6 }}>Spend Meta au switch (CHF)</label>
          <input style={inputStyle} type="number" placeholder="ex: 1250.00" value={spend} onChange={e => setSpend(e.target.value)} />
        </div>
        <div>
          <label style={{ color: "#555", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 6 }}>Inscrits Meta au switch</label>
          <input style={inputStyle} type="number" placeholder="ex: 430" value={inscrits} onChange={e => setInscrits(e.target.value)} />
        </div>
      </div>
      <button
        onClick={() => valid && !saving && onSave({ baseline_spend: parseFloat(spend.replace(",", ".")), baseline_inscrits: parseInt(inscrits) })}
        disabled={!valid || saving}
        style={{ background: valid && !saving ? "#F5C518" : "#1a1a1a", color: valid && !saving ? "#000" : "#333", border: "none", borderRadius: 12, padding: "14px 24px", fontWeight: 800, fontSize: 14, cursor: valid && !saving ? "pointer" : "default", fontFamily: "monospace", letterSpacing: 1, width: "100%", transition: "all 0.2s" }}
      >
        {saving ? "Enregistrement..." : "Définir le point de départ →"}
      </button>
    </div>
  );
}

// ─── Formulaire mise à jour ───────────────────────────────────────────────────

function UpdateForm({ onUpdate, currentData, baseline, saving }) {
  const [spend, setSpend] = useState("");
  const [inscrits, setInscrits] = useState("");
  const [note, setNote] = useState("");

  const bSpend = baseline?.baseline_spend || 0;
  const bInscrits = baseline?.baseline_inscrits || 0;

  useEffect(() => {
    if (currentData) {
      setSpend((currentData.spend + bSpend).toString());
      setInscrits((currentData.inscrits + bInscrits).toString());
    }
  }, [currentData]);

  const inputStyle = { background: "#0d0d0d", border: "1px solid #222", borderRadius: 10, padding: "14px 16px", color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "monospace", outline: "none", width: "100%" };

  const spendVal = parseFloat(spend.replace(",", "."));
  const inscritsVal = parseInt(inscrits);
  const valid = spend && inscrits && !isNaN(spendVal) && !isNaN(inscritsVal) && spendVal >= bSpend && inscritsVal >= bInscrits;
  const netSpend = valid ? spendVal - bSpend : null;
  const netInscrits = valid ? inscritsVal - bInscrits : null;

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 20, padding: 24, marginBottom: 24 }}>
      <div style={{ color: "#F5C518", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8, fontWeight: 700 }}>✏ Mettre à jour</div>
      <p style={{ color: "#444", fontSize: 11, fontFamily: "monospace", marginBottom: 16, lineHeight: 1.6 }}>
        Saisis le <strong style={{ color: "#666" }}>total brut affiché dans Meta</strong> en ce moment. Le calcul depuis le switch est automatique.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ color: "#555", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 6 }}>Total brut Meta (CHF)</label>
          <input style={inputStyle} type="number" placeholder={`min. ${bSpend}`} value={spend} onChange={e => setSpend(e.target.value)} />
          {netSpend !== null && netSpend >= 0 && (
            <div style={{ color: "#F5C518", fontSize: 11, fontFamily: "monospace", marginTop: 6 }}>→ Depuis switch : {fmt(netSpend)}</div>
          )}
        </div>
        <div>
          <label style={{ color: "#555", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 6 }}>Total brut inscrits</label>
          <input style={inputStyle} type="number" placeholder={`min. ${bInscrits}`} value={inscrits} onChange={e => setInscrits(e.target.value)} />
          {netInscrits !== null && netInscrits >= 0 && (
            <div style={{ color: "#F5C518", fontSize: 11, fontFamily: "monospace", marginTop: 6 }}>→ Depuis switch : {fmtNum(netInscrits)}</div>
          )}
        </div>
      </div>
      <input style={{ ...inputStyle, fontSize: 13, fontWeight: 400, marginBottom: 12 }} placeholder="Note optionnelle" value={note} onChange={e => setNote(e.target.value)} />
      <button
        onClick={() => valid && !saving && onUpdate({ spend: netSpend, inscrits: netInscrits, note }) && setNote("")}
        disabled={!valid || saving}
        style={{ background: valid && !saving ? "#F5C518" : "#1a1a1a", color: valid && !saving ? "#000" : "#333", border: "none", borderRadius: 12, padding: "14px 24px", fontWeight: 800, fontSize: 14, cursor: valid && !saving ? "pointer" : "default", fontFamily: "monospace", letterSpacing: 1, width: "100%", transition: "all 0.2s" }}
      >
        {saving ? "Enregistrement..." : "Enregistrer →"}
      </button>
    </div>
  );
}

function Historique({ logs }) {
  if (!logs || logs.length === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ color: "#333", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 12 }}>Historique</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[...logs].reverse().slice(0, 6).map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0a", border: "1px solid #141414", borderRadius: 10, padding: "10px 14px", flexWrap: "wrap", gap: 4 }}>
            <span style={{ color: "#444", fontSize: 11, fontFamily: "monospace" }}>
              {new Date(l.updated_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} {new Date(l.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              {l.note && <span style={{ color: "#2a2a2a", marginLeft: 8 }}>— {l.note}</span>}
            </span>
            <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{fmt(l.spend)} · {fmtNum(l.inscrits)} inscrits</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SwitchModal({ currentData, cpl, onConfirm, onCancel, saving }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🔄</div>
        <h2 style={{ color: "#fff", fontFamily: "monospace", margin: "0 0 12px", fontSize: 20 }}>Confirmer le switch ?</h2>
        <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>La semaine actuelle sera archivée. Tu devras saisir un nouveau point de départ.</p>
        {currentData && (
          <div style={{ background: "#0d0d0d", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace", marginBottom: 8 }}>Résumé de la semaine :</div>
            <div style={{ color: "#F5C518", fontWeight: 700, fontFamily: "monospace" }}>{fmt(currentData.spend)} · {fmtNum(currentData.inscrits)} inscrits · CPL {fmt(cpl)}</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={saving} style={{ flex: 1, background: "#1a1a1a", border: "1px solid #222", color: "#666", borderRadius: 10, padding: 14, cursor: "pointer", fontFamily: "monospace", fontSize: 13 }}>Annuler</button>
          <button onClick={onConfirm} disabled={saving} style={{ flex: 2, background: "#F5C518", border: "none", color: "#000", borderRadius: 10, padding: 14, fontWeight: 800, cursor: "pointer", fontFamily: "monospace", fontSize: 13 }}>{saving ? "En cours..." : "Confirmer →"}</button>
        </div>
      </div>
    </div>
  );
}

export default function TrackerApp() {
  const [currentData, setCurrentData] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [prevWeek, setPrevWeek] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeCohort, setActiveCohort] = useState(null);
  const [now, setNow] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const { data: cohorts, error: ce } = await supabase.from("cohorts").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1);
      if (ce) throw ce;
      const { data: prevCohorts } = await supabase.from("cohorts").select("*").eq("active", false).order("created_at", { ascending: false }).limit(1);

      const cohort = cohorts?.[0] || null;
      const prevCohort = prevCohorts?.[0] || null;

      if (cohort) {
        setActiveCohort(cohort);
        setBaseline({ baseline_spend: cohort.baseline_spend ?? null, baseline_inscrits: cohort.baseline_inscrits ?? null });
        const { data: updates } = await supabase.from("updates").select("*").eq("cohort_id", cohort.id).order("updated_at", { ascending: true });
        setLogs(updates || []);
        setCurrentData(updates?.[updates.length - 1] || null);
      } else {
        setActiveCohort(null); setBaseline(null); setCurrentData(null); setLogs([]);
      }

      if (prevCohort) {
        const { data: prevUpdates } = await supabase.from("updates").select("*").eq("cohort_id", prevCohort.id).order("updated_at", { ascending: false }).limit(1);
        setPrevWeek(prevUpdates?.[0] || null);
      }
    } catch (e) {
      setError("Erreur de connexion."); console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const channel = supabase.channel("tracker-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "updates" }, (payload) => {
        setCurrentData(payload.new);
        setLogs(prev => [...prev, payload.new]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cohorts" }, () => { loadData(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadData]);

  const lastSwitch = getLastSwitch(activeCohort?.created_at || null);
  const nextSwitch = getNextSwitch(lastSwitch);
  const elapsed = now - lastSwitch;
  const total = nextSwitch - lastSwitch;
  const weekPct = Math.min(100, (elapsed / total) * 100);
  const cpl = currentData?.spend > 0 && currentData?.inscrits > 0 ? currentData.spend / currentData.inscrits : 0;
  const prevCpl = prevWeek?.spend > 0 && prevWeek?.inscrits > 0 ? prevWeek.spend / prevWeek.inscrits : 0;
  const switchLabel = lastSwitch.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const hasBaseline = activeCohort && activeCohort.baseline_spend !== null && activeCohort.baseline_spend !== undefined;

  const handleBaseline = async ({ baseline_spend, baseline_inscrits }) => {
    setSaving(true);
    try {
      if (!activeCohort?.id) {
        const { data: newCohort, error: ce } = await supabase.from("cohorts").insert({ active: true, baseline_spend, baseline_inscrits }).select().single();
        if (ce) throw ce;
        setActiveCohort(newCohort);
      } else {
        await supabase.from("cohorts").update({ baseline_spend, baseline_inscrits }).eq("id", activeCohort.id);
        setActiveCohort(prev => ({ ...prev, baseline_spend, baseline_inscrits }));
      }
      setBaseline({ baseline_spend, baseline_inscrits });
    } catch (e) { setError("Erreur point de départ."); console.error(e); }
    finally { setSaving(false); }
  };

  const handleUpdate = async ({ spend, inscrits, note }) => {
    setSaving(true);
    try {
      if (!activeCohort?.id) return;
      await supabase.from("updates").insert({ cohort_id: activeCohort.id, spend, inscrits, note });
    } catch (e) { setError("Erreur enregistrement."); console.error(e); }
    finally { setSaving(false); }
  };

  const handleSwitch = async () => {
    setSaving(true);
    try {
      if (activeCohort) await supabase.from("cohorts").update({ active: false }).eq("id", activeCohort.id);
      const { data: newCohort, error: ce } = await supabase.from("cohorts").insert({ active: true, baseline_spend: null, baseline_inscrits: null }).select().single();
      if (ce) throw ce;
      setActiveCohort(newCohort); setBaseline(null); setPrevWeek(currentData); setCurrentData(null); setLogs([]); setShowModal(false);
    } catch (e) { setError("Erreur switch."); console.error(e); }
    finally { setSaving(false); }
  };

  const handleCopy = () => {
    const texte = [`📊 Rapport webinaire — ${switchLabel} 17h → maintenant`, "", `💸 Spend : ${currentData ? fmt(currentData.spend) : "—"}`, `👥 Inscrits : ${currentData ? fmtNum(currentData.inscrits) : "—"}`, `🎯 Coût / inscrit : ${cpl > 0 ? fmt(cpl) : "—"}`, "", `⏱ Mis à jour le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`].join("\n");
    navigator.clipboard.writeText(texte);
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#222", fontFamily: "monospace" }}>Connexion...</div></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      {showModal && <SwitchModal currentData={currentData} cpl={cpl} onConfirm={handleSwitch} onCancel={() => setShowModal(false)} saving={saving} />}

      <div style={{ borderBottom: "1px solid #111", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#080808", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "#F5C518", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📊</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>Webinar Tracker</div>
            <div style={{ color: "#2a2a2a", fontSize: 10, fontFamily: "monospace" }}>Switch · {switchLabel} 17h00</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, background: "#4ade80", borderRadius: "50%", boxShadow: "0 0 6px #4ade80" }} />
          <button onClick={() => setShowModal(true)} style={{ background: "#111", border: "1px solid #1e1e1e", color: "#F5C518", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>🔄 SWITCH</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px" }}>
        {error && <div style={{ background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 12, padding: 16, marginBottom: 20, color: "#f87171", fontFamily: "monospace", fontSize: 13 }}>⚠ {error}</div>}

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

        {!hasBaseline ? (
          <BaselineForm onSave={handleBaseline} saving={saving} />
        ) : (
          <>
            <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#333", fontSize: 11, fontFamily: "monospace" }}>📍 Référence switch · {fmt(activeCohort?.baseline_spend || 0)} · {fmtNum(activeCohort?.baseline_inscrits || 0)} inscrits</span>
              <button onClick={() => setActiveCohort(prev => ({ ...prev, baseline_spend: null, baseline_inscrits: null }))} style={{ background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: 11, fontFamily: "monospace" }}>modifier</button>
            </div>
            <UpdateForm onUpdate={handleUpdate} currentData={currentData} baseline={baseline} saving={saving} />
          </>
        )}

        {currentData && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <Card label="Spend" value={fmt(currentData.spend)} highlight delta={currentData.spend} prev={prevWeek?.spend} />
              <Card label="Inscrits" value={fmtNum(currentData.inscrits)} delta={currentData.inscrits} prev={prevWeek?.inscrits} />
              <Card label="CPL" value={cpl > 0 ? fmt(cpl) : "—"} delta={cpl} prev={prevCpl} />
            </div>

            <div style={{ background: "#0a1a0a", border: "1px solid #142014", borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ color: "#4ade80", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700 }}>📋 Résumé client</span>
                <button onClick={handleCopy} style={{ background: copied ? "#14401a" : "#0d200d", border: "1px solid #1a3a1a", color: copied ? "#4ade80" : "#2a6a2a", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", transition: "all 0.2s" }}>
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

            {prevWeek && (
              <div style={{ background: "#0d0d0d", border: "1px solid #161616", borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <div style={{ color: "#333", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 14 }}>Vs semaine précédente</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[{ label: "Spend", curr: currentData.spend, prev: prevWeek.spend, format: fmt }, { label: "Inscrits", curr: currentData.inscrits, prev: prevWeek.inscrits, format: fmtNum }, { label: "CPL", curr: cpl, prev: prevCpl, format: fmt }].map(({ label, curr, prev, format }) => (
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
        )}

        {currentData?.updated_at && (
          <div style={{ textAlign: "center", marginTop: 32, color: "#181818", fontSize: 10, fontFamily: "monospace" }}>
            Dernière mise à jour · {new Date(currentData.updated_at).toLocaleDateString("fr-FR")} à {new Date(currentData.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
