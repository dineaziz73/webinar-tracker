"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getLastSwitch, getNextSwitch, formatDuration, fmt, fmtNum, pct } from "../lib/utils";

function Delta({ current, prev, inverse }) {
  const d = pct(current, prev);
  if (d === null) return null;
  const positive = inverse ? d <= 0 : d >= 0;
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, fontFamily: "monospace",
      color: positive ? "#4ade80" : "#f87171",
      background: positive ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
      padding: "3px 10px", borderRadius: 100,
    }}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}% vs sem. préc.
    </span>
  );
}

function Bar({ value, max }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: "#1c1c1c", borderRadius: 8, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, height: "100%", background: "#F5C518", borderRadius: 8, transition: "width 1s ease" }} />
    </div>
  );
}

export default function ClientView() {
  const [currentData, setCurrentData] = useState(null);
  const [prevWeek, setPrevWeek] = useState(null);
  const [activeCohort, setActiveCohort] = useState(null);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const { data: cohorts } = await supabase.from("cohorts").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1);
      const { data: prevCohorts } = await supabase.from("cohorts").select("*").eq("active", false).order("created_at", { ascending: false }).limit(1);

      const cohort = cohorts?.[0] || null;
      const prevCohort = prevCohorts?.[0] || null;

      if (cohort) {
        setActiveCohort(cohort);
        const { data: updates } = await supabase.from("updates").select("*").eq("cohort_id", cohort.id).order("updated_at", { ascending: false }).limit(1);
        if (updates?.[0]) {
          setCurrentData(updates[0]);
          setLastUpdated(new Date(updates[0].updated_at));
        }
      }

      if (prevCohort) {
        const { data: prevUpdates } = await supabase.from("updates").select("*").eq("cohort_id", prevCohort.id).order("updated_at", { ascending: false }).limit(1);
        setPrevWeek(prevUpdates?.[0] || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
      <div style={{ padding: "32px 24px 0", maxWidth: 500, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "#F5C518", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📊</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, fontFamily: "monospace" }}>Rapport campagne</div>
              <div style={{ color: "#333", fontSize: 11, fontFamily: "monospace" }}>Mise à jour en temps réel</div>
            </div>
          </div>
          {/* Indicateur live */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 20, padding: "6px 12px" }}>
            <div style={{ width: 7, height: 7, background: "#4ade80", borderRadius: "50%", boxShadow: "0 0 8px #4ade80", animation: "pulse 2s infinite" }} />
            <span style={{ color: "#4ade80", fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "28px 24px" }}>

        {/* Période */}
        <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 14, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ color: "#444", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>Période</div>
          <div style={{ color: "#fff", fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>
            {switchLabel} 17h00 → maintenant
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#333", fontSize: 10, fontFamily: "monospace" }}>Progression de la semaine</span>
              <span style={{ color: "#F5C518", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{weekPct.toFixed(0)}%</span>
            </div>
            <Bar value={elapsed} max={total} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ color: "#1e1e1e", fontSize: 10, fontFamily: "monospace" }}>Lancé il y a {formatDuration(elapsed)}</span>
              <span style={{ color: "#1e1e1e", fontSize: 10, fontFamily: "monospace" }}>Prochain switch dans {formatDuration(nextSwitch - now)}</span>
            </div>
          </div>
        </div>

        {currentData ? (
          <>
            {/* Stat principale — Spend */}
            <div style={{ background: "#F5C518", borderRadius: 20, padding: "28px 24px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, background: "rgba(0,0,0,0.05)", borderRadius: "50%" }} />
              <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, background: "rgba(0,0,0,0.04)", borderRadius: "50%" }} />
              <div style={{ color: "#00000088", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}>Dépensé depuis le switch</div>
              <div style={{ color: "#000", fontSize: 48, fontWeight: 900, fontFamily: "monospace", lineHeight: 1, marginBottom: 12 }}>{fmt(currentData.spend)}</div>
              {prevWeek?.spend > 0 && <Delta current={currentData.spend} prev={prevWeek.spend} />}
            </div>

            {/* Inscrits + CPL */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 18, padding: "22px 18px" }}>
                <div style={{ color: "#555", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}>Inscrits</div>
                <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, fontFamily: "monospace", lineHeight: 1, marginBottom: 10 }}>{fmtNum(currentData.inscrits)}</div>
                {prevWeek?.inscrits > 0 && <Delta current={currentData.inscrits} prev={prevWeek.inscrits} />}
              </div>
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 18, padding: "22px 18px" }}>
                <div style={{ color: "#555", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}>Coût / inscrit</div>
                <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, fontFamily: "monospace", lineHeight: 1, marginBottom: 10 }}>{cpl > 0 ? fmt(cpl) : "—"}</div>
                {prevCpl > 0 && cpl > 0 && <Delta current={cpl} prev={prevCpl} inverse />}
              </div>
            </div>

            {/* Note si présente */}
            {currentData.note && (
              <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
                <span style={{ color: "#555", fontSize: 12, fontFamily: "monospace" }}>📝 {currentData.note}</span>
              </div>
            )}

            {/* Dernière mise à jour */}
            {lastUpdated && (
              <div style={{ textAlign: "center", marginTop: 24, color: "#1e1e1e", fontSize: 10, fontFamily: "monospace" }}>
                Dernière mise à jour · {lastUpdated.toLocaleDateString("fr-FR")} à {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ color: "#333", fontFamily: "monospace", fontSize: 13 }}>En attente des premières données...</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
