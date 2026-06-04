"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getLastSwitch, getNextSwitch, formatDuration, fmt, fmtNum, pct, getDaysOfWeek, formatDateShort } from "../lib/utils";

function Delta({ current, prev, inverse }) {
  const d = pct(current, prev);
  if (d === null) return null;
  const positive = inverse ? d <= 0 : d >= 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: positive ? "#4ade80" : "#f87171", background: positive ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", padding: "2px 8px", borderRadius: 100 }}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
    </span>
  );
}

function Bar({ value, max, color = "#F5C518", height = 6 }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: "#1c1c1c", borderRadius: height, height, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${p}%`, height: "100%", background: color, borderRadius: height, transition: "width 0.8s ease" }} />
    </div>
  );
}

// ─── Tableau journalier côté client ──────────────────────────────────────────

function DailyTable({ cohortId, switchDate }) {
  const [dailyData, setDailyData] = useState({});
  const [loading, setLoading] = useState(true);

  const days = getDaysOfWeek(switchDate);
  const today = new Date().toISOString().split("T")[0];
  const maxSpend = Math.max(...Object.values(dailyData).map(d => d.spend_total || 0), 1);
  const maxInscrits = Math.max(...Object.values(dailyData).map(d => d.inscrits || 0), 1);

  useEffect(() => {
    if (!cohortId) return;
    supabase.from("daily_stats").select("*").eq("cohort_id", cohortId).then(({ data }) => {
      const map = {};
      (data || []).forEach(d => { map[d.date] = d; });
      setDailyData(map);
      setLoading(false);
    });
  }, [cohortId]);

  useEffect(() => {
    if (!cohortId) return;
    const channel = supabase.channel("daily-client-" + cohortId)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_stats", filter: `cohort_id=eq.${cohortId}` }, ({ eventType, new: newRow }) => {
        if (newRow) setDailyData(prev => ({ ...prev, [newRow.date]: newRow }));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [cohortId]);

  const filledDays = days.filter(d => dailyData[d] && (dailyData[d].spend_total > 0 || dailyData[d].inscrits > 0));
  const totals = filledDays.reduce((acc, d) => ({ spend: acc.spend + (dailyData[d]?.spend_total || 0), inscrits: acc.inscrits + (dailyData[d]?.inscrits || 0) }), { spend: 0, inscrits: 0 });

  if (loading) return null;
  if (filledDays.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ color: "#444", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, marginBottom: 14 }}>📅 Détail journalier</div>
      <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 16, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid #111", background: "#0a0a0a" }}>
          {["Jour", "Spend", "Inscrits", "CPL"].map((h, i) => (
            <div key={i} style={{ color: "#2a2a2a", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700 }}>{h}</div>
          ))}
        </div>

        {/* Lignes */}
        {days.map(date => {
          const s = dailyData[date];
          const hasStat = s && (s.spend_total > 0 || s.inscrits > 0);
          const isFuture = date > today;
          const isToday = date === today;
          const dayCpl = hasStat && s.inscrits > 0 ? s.spend_total / s.inscrits : 0;

          return (
            <div key={date} style={{ borderBottom: "1px solid #0f0f0f", background: isToday ? "rgba(245,197,24,0.03)" : "transparent" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", padding: "10px 16px", alignItems: "center" }}>
                <div>
                  <div style={{ color: isToday ? "#F5C518" : hasStat ? "#ccc" : "#1e1e1e", fontSize: 11, fontFamily: "monospace", fontWeight: isToday ? 800 : 500, textTransform: "capitalize" }}>
                    {formatDateShort(date)}
                  </div>
                  {isToday && !isFuture && hasStat && (
                    <div style={{ fontSize: 9, color: "#F5C518", fontFamily: "monospace", opacity: 0.6 }}>en cours</div>
                  )}
                </div>
                <div style={{ color: hasStat ? "#fff" : "#1a1a1a", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{hasStat ? fmt(s.spend_total) : isFuture ? "" : "—"}</div>
                <div style={{ color: hasStat ? "#fff" : "#1a1a1a", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{hasStat ? fmtNum(s.inscrits) : isFuture ? "" : "—"}</div>
                <div style={{ color: hasStat && dayCpl > 0 ? "#F5C518" : "#1a1a1a", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{hasStat && dayCpl > 0 ? fmt(dayCpl) : isFuture ? "" : "—"}</div>
              </div>

              {/* Barres visuelles */}
              {hasStat && (
                <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#222", fontSize: 9, fontFamily: "monospace", width: 40 }}>spend</span>
                    <Bar value={s.spend_total} max={maxSpend} color="#F5C518" height={4} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#222", fontSize: 9, fontFamily: "monospace", width: 40 }}>inscrits</span>
                    <Bar value={s.inscrits} max={maxInscrits} color="#4ade80" height={4} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Total */}
        {totals.spend > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", padding: "12px 16px", background: "#111", borderTop: "1px solid #1a1a1a" }}>
            <div style={{ color: "#666", fontSize: 10, fontFamily: "monospace", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Total</div>
            <div style={{ color: "#F5C518", fontSize: 12, fontFamily: "monospace", fontWeight: 800 }}>{fmt(totals.spend)}</div>
            <div style={{ color: "#F5C518", fontSize: 12, fontFamily: "monospace", fontWeight: 800 }}>{fmtNum(totals.inscrits)}</div>
            <div style={{ color: "#F5C518", fontSize: 12, fontFamily: "monospace", fontWeight: 800 }}>{totals.inscrits > 0 ? fmt(totals.spend / totals.inscrits) : "—"}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compte rendu automatique ─────────────────────────────────────────────────

function CompteRendu({ cohort, lastUpdate }) {
  if (!cohort || !lastUpdate) return null;
  const start = new Date(cohort.created_at);
  const cpl = lastUpdate.spend > 0 && lastUpdate.inscrits > 0 ? lastUpdate.spend / lastUpdate.inscrits : 0;
  const label = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7);
  const labelEnd = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  return (
    <div style={{ background: "#0a0f1a", border: "1px solid #1a2a3a", borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <div style={{ color: "#60a5fa", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, marginBottom: 12 }}>
        📋 Compte rendu — semaine du {label} au {labelEnd}
      </div>
      <p style={{ color: "#888", fontSize: 13, lineHeight: 1.9, margin: 0, fontFamily: "monospace" }}>
        Spend total : <strong style={{ color: "#fff" }}>{fmt(lastUpdate.spend)}</strong><br />
        Inscrits : <strong style={{ color: "#fff" }}>{fmtNum(lastUpdate.inscrits)}</strong><br />
        Coût par inscrit : <strong style={{ color: "#fff" }}>{cpl > 0 ? fmt(cpl) : "—"}</strong>
      </p>
    </div>
  );
}

// ─── Vue Client principale ────────────────────────────────────────────────────

export default function ClientView() {
  const [currentData, setCurrentData] = useState(null);
  const [prevWeek, setPrevWeek] = useState(null);
  const [activeCohort, setActiveCohort] = useState(null);
  const [archivedCohorts, setArchivedCohorts] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const { data: cohorts } = await supabase.from("cohorts").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1);
      const { data: archived } = await supabase.from("cohorts").select("*").eq("active", false).order("created_at", { ascending: false });

      const cohort = cohorts?.[0] || null;

      if (cohort) {
        setActiveCohort(cohort);
        const { data: updates } = await supabase.from("updates").select("*").eq("cohort_id", cohort.id).order("updated_at", { ascending: false }).limit(1);
        if (updates?.[0]) { setCurrentData(updates[0]); setLastUpdated(new Date(updates[0].updated_at)); }
      }

      // Charger les cohortes archivées avec leur dernier update
      if (archived && archived.length > 0) {
        const enriched = await Promise.all(archived.map(async (c) => {
          const { data: updates } = await supabase.from("updates").select("*").eq("cohort_id", c.id).order("updated_at", { ascending: false }).limit(1);
          return { ...c, lastUpdate: updates?.[0] || null };
        }));
        setArchivedCohorts(enriched.filter(c => c.lastUpdate));
        setPrevWeek(enriched[0]?.lastUpdate || null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const channel = supabase.channel("client-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "updates" }, (payload) => {
        setCurrentData(payload.new);
        setLastUpdated(new Date(payload.new.updated_at));
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

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#222", fontFamily: "monospace", fontSize: 13 }}>Chargement...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      {/* Header */}
      <div style={{ padding: "32px 24px 0", maxWidth: 520, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "#F5C518", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📊</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, fontFamily: "monospace" }}>Rapport campagne</div>
              <div style={{ color: "#333", fontSize: 11, fontFamily: "monospace" }}>Mise à jour en temps réel</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 20, padding: "6px 12px" }}>
            <div style={{ width: 7, height: 7, background: "#4ade80", borderRadius: "50%", boxShadow: "0 0 8px #4ade80" }} />
            <span style={{ color: "#4ade80", fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 24px 60px" }}>

        {/* Période + progression */}
        <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ color: "#444", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>Période en cours</div>
          <div style={{ color: "#fff", fontSize: 13, fontFamily: "monospace", fontWeight: 700, marginBottom: 12 }}>
            {switchLabel} 17h00 → maintenant
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#333", fontSize: 10, fontFamily: "monospace" }}>Progression</span>
            <span style={{ color: "#F5C518", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{weekPct.toFixed(0)}%</span>
          </div>
          <Bar value={elapsed} max={total} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: "#1e1e1e", fontSize: 10, fontFamily: "monospace" }}>Lancé il y a {formatDuration(elapsed)}</span>
            <span style={{ color: "#1e1e1e", fontSize: 10, fontFamily: "monospace" }}>Switch dans {formatDuration(nextSwitch - now)}</span>
          </div>
        </div>

        {currentData ? (
          <>
            {/* Spend principal */}
            <div style={{ background: "#F5C518", borderRadius: 20, padding: "28px 24px", marginBottom: 12, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, background: "rgba(0,0,0,0.05)", borderRadius: "50%" }} />
              <div style={{ color: "#00000088", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}>Dépensé depuis le switch</div>
              <div style={{ color: "#000", fontSize: 46, fontWeight: 900, fontFamily: "monospace", lineHeight: 1, marginBottom: 10 }}>{fmt(currentData.spend)}</div>
              {prevWeek?.spend > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: currentData.spend >= prevWeek.spend ? "#1a5c1a" : "#5c1a1a", background: currentData.spend >= prevWeek.spend ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.08)", padding: "3px 10px", borderRadius: 100 }}>
                  {currentData.spend >= prevWeek.spend ? "▲" : "▼"} {Math.abs(pct(currentData.spend, prevWeek.spend)).toFixed(1)}% vs sem. préc.
                </span>
              )}
            </div>

            {/* Inscrits + CPL */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 18, padding: "20px 16px" }}>
                <div style={{ color: "#555", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}>Inscrits</div>
                <div style={{ color: "#fff", fontSize: 34, fontWeight: 900, fontFamily: "monospace", lineHeight: 1, marginBottom: 8 }}>{fmtNum(currentData.inscrits)}</div>
                {prevWeek?.inscrits > 0 && <Delta current={currentData.inscrits} prev={prevWeek.inscrits} />}
              </div>
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 18, padding: "20px 16px" }}>
                <div style={{ color: "#555", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}>Coût / inscrit</div>
                <div style={{ color: "#fff", fontSize: 34, fontWeight: 900, fontFamily: "monospace", lineHeight: 1, marginBottom: 8 }}>{cpl > 0 ? fmt(cpl) : "—"}</div>
                {prevCpl > 0 && cpl > 0 && <Delta current={cpl} prev={prevCpl} inverse />}
              </div>
            </div>

            {currentData.note && (
              <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
                <span style={{ color: "#555", fontSize: 12, fontFamily: "monospace" }}>📝 {currentData.note}</span>
              </div>
            )}

            {/* Tableau journalier */}
            {activeCohort?.id && (
              <DailyTable cohortId={activeCohort.id} switchDate={activeCohort.created_at} />
            )}

            {lastUpdated && (
              <div style={{ textAlign: "center", marginTop: 20, color: "#1e1e1e", fontSize: 10, fontFamily: "monospace" }}>
                Mis à jour le {lastUpdated.toLocaleDateString("fr-FR")} à {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ color: "#333", fontFamily: "monospace", fontSize: 13 }}>En attente des premières données...</div>
          </div>
        )}

        {/* Historique des semaines précédentes */}
        {archivedCohorts.length > 0 && (
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #111" }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", color: showHistory ? "#F5C518" : "#555", borderRadius: 12, padding: "14px 20px", cursor: "pointer", fontSize: 12, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showHistory ? 16 : 0 }}
            >
              <span>📁 Semaines précédentes ({archivedCohorts.length})</span>
              <span>{showHistory ? "▲" : "▼"}</span>
            </button>

            {showHistory && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {archivedCohorts.map((c, i) => {
                  const next = archivedCohorts[i + 1];
                  const cohortCpl = c.lastUpdate?.spend > 0 && c.lastUpdate?.inscrits > 0 ? c.lastUpdate.spend / c.lastUpdate.inscrits : 0;
                  const prevCohortCpl = next?.lastUpdate?.spend > 0 && next?.lastUpdate?.inscrits > 0 ? next.lastUpdate.spend / next.lastUpdate.inscrits : 0;
                  const start = new Date(c.created_at);
                  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7);

                  return (
                    <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <CompteRendu cohort={c} lastUpdate={c.lastUpdate} />
                      {/* Tableau journalier archivé */}
                      <DailyTable cohortId={c.id} switchDate={c.created_at} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
