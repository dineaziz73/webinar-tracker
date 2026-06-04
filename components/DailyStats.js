"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fmt, fmtNum, formatDateShort, getDaysOfWeek } from "../lib/utils";

function DayRow({ date, stat, cohortId, onSaved, isToday, isFuture }) {
  const [open, setOpen] = useState(false);
  const [acc1, setAcc1] = useState("");
  const [acc2, setAcc2] = useState("");
  const [inscrits, setInscrits] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stat) {
      setAcc1(stat.spend_account1?.toString() || "");
      setAcc2(stat.spend_account2?.toString() || "");
      setInscrits(stat.inscrits?.toString() || "");
      setNote(stat.note || "");
    }
  }, [stat]);

  const total = (parseFloat(acc1) || 0) + (parseFloat(acc2) || 0);
  const cpl = total > 0 && parseInt(inscrits) > 0 ? total / parseInt(inscrits) : 0;
  const valid = acc1 !== "" && inscrits !== "";

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        cohort_id: cohortId,
        date,
        spend_account1: parseFloat(acc1) || 0,
        spend_account2: parseFloat(acc2) || 0,
        inscrits: parseInt(inscrits) || 0,
        note,
        updated_at: new Date().toISOString(),
      };
      if (stat?.id) {
        await supabase.from("daily_stats").update(payload).eq("id", stat.id);
      } else {
        await supabase.from("daily_stats").insert(payload);
      }
      onSaved();
      setOpen(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const inputStyle = {
    background: "#0a0a0a", border: "1px solid #222", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 15, fontWeight: 700,
    fontFamily: "monospace", outline: "none", width: "100%",
  };

  const hasStat = stat && (stat.spend_total > 0 || stat.inscrits > 0);

  return (
    <div style={{ borderBottom: "1px solid #111" }}>
      {/* Ligne principale */}
      <div
        onClick={() => !isFuture && setOpen(!open)}
        style={{
          display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 28px",
          padding: "12px 16px", alignItems: "center",
          cursor: isFuture ? "default" : "pointer",
          background: isToday ? "rgba(245,197,24,0.04)" : "transparent",
          transition: "background 0.2s",
        }}
      >
        <div>
          <div style={{ color: isToday ? "#F5C518" : hasStat ? "#fff" : "#333", fontSize: 12, fontFamily: "monospace", fontWeight: isToday ? 800 : 600, textTransform: "capitalize" }}>
            {formatDateShort(date)}
            {isToday && <span style={{ marginLeft: 6, fontSize: 9, background: "#F5C518", color: "#000", padding: "1px 5px", borderRadius: 3, fontWeight: 800 }}>AUJOURD'HUI</span>}
          </div>
        </div>
        <div style={{ color: hasStat ? "#fff" : "#222", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{hasStat ? fmt(stat.spend_total) : "—"}</div>
        <div style={{ color: hasStat ? "#fff" : "#222", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{hasStat ? fmtNum(stat.inscrits) : "—"}</div>
        <div style={{ color: hasStat ? "#F5C518" : "#222", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>
          {hasStat && stat.inscrits > 0 ? fmt(stat.spend_total / stat.inscrits) : "—"}
        </div>
        <div style={{ color: isFuture ? "#1a1a1a" : "#444", fontSize: 14, textAlign: "right" }}>{isFuture ? "" : open ? "▲" : "▼"}</div>
      </div>

      {/* Formulaire dépliable */}
      {open && !isFuture && (
        <div style={{ background: "#080808", padding: "16px", borderTop: "1px solid #111" }}>
          <div style={{ color: "#F5C518", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 14, fontWeight: 700 }}>
            ✏ {formatDateShort(date)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ color: "#444", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 5 }}>Compte pub 1 (CHF)</label>
              <input style={inputStyle} type="number" placeholder="0.00" value={acc1} onChange={e => setAcc1(e.target.value)} />
            </div>
            <div>
              <label style={{ color: "#444", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 5 }}>Compte pub 2 (CHF)</label>
              <input style={inputStyle} type="number" placeholder="0.00" value={acc2} onChange={e => setAcc2(e.target.value)} />
            </div>
          </div>
          {acc1 && acc2 && (
            <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace", marginBottom: 10 }}>
              Total jour : <strong style={{ color: "#F5C518" }}>{fmt(total)}</strong>
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <label style={{ color: "#444", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 5 }}>Inscrits du jour</label>
            <input style={inputStyle} type="number" placeholder="0" value={inscrits} onChange={e => setInscrits(e.target.value)} />
          </div>
          {total > 0 && parseInt(inscrits) > 0 && (
            <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace", marginBottom: 10 }}>
              CPL : <strong style={{ color: "#F5C518" }}>{fmt(cpl)}</strong>
            </div>
          )}
          <input style={{ ...inputStyle, fontSize: 12, fontWeight: 400, marginBottom: 12 }} placeholder="Note optionnelle" value={note} onChange={e => setNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setOpen(false)} style={{ flex: 1, background: "#111", border: "1px solid #1a1a1a", color: "#444", borderRadius: 8, padding: "10px", cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}>Annuler</button>
            <button onClick={handleSave} disabled={!valid || saving} style={{ flex: 2, background: valid ? "#F5C518" : "#1a1a1a", color: valid ? "#000" : "#333", border: "none", borderRadius: 8, padding: "10px", fontWeight: 800, cursor: valid ? "pointer" : "default", fontFamily: "monospace", fontSize: 12 }}>
              {saving ? "Enregistrement..." : stat?.id ? "Modifier →" : "Enregistrer →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DailyStats({ cohortId, switchDate }) {
  const [dailyData, setDailyData] = useState({});
  const [loading, setLoading] = useState(true);

  const days = getDaysOfWeek(switchDate);
  const today = new Date().toISOString().split("T")[0];

  const loadDaily = async () => {
    if (!cohortId) return;
    const { data } = await supabase.from("daily_stats").select("*").eq("cohort_id", cohortId);
    const map = {};
    (data || []).forEach(d => { map[d.date] = d; });
    setDailyData(map);
    setLoading(false);
  };

  useEffect(() => { loadDaily(); }, [cohortId]);

  useEffect(() => {
    if (!cohortId) return;
    const channel = supabase.channel("daily-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_stats", filter: `cohort_id=eq.${cohortId}` }, () => { loadDaily(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [cohortId]);

  // Totaux
  const totals = Object.values(dailyData).reduce((acc, d) => ({
    spend: acc.spend + (d.spend_total || 0),
    inscrits: acc.inscrits + (d.inscrits || 0),
  }), { spend: 0, inscrits: 0 });

  if (loading) return <div style={{ padding: 20, color: "#222", fontFamily: "monospace", fontSize: 12 }}>Chargement...</div>;

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
      {/* Header tableau */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 28px", padding: "10px 16px", borderBottom: "1px solid #1a1a1a", background: "#0a0a0a" }}>
        {["Jour", "Spend", "Inscrits", "CPL", ""].map((h, i) => (
          <div key={i} style={{ color: "#333", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700 }}>{h}</div>
        ))}
      </div>

      {/* Lignes */}
      {days.map(date => (
        <DayRow
          key={date}
          date={date}
          stat={dailyData[date] || null}
          cohortId={cohortId}
          onSaved={loadDaily}
          isToday={date === today}
          isFuture={date > today}
        />
      ))}

      {/* Ligne total */}
      {totals.spend > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 28px", padding: "12px 16px", background: "#111", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ color: "#888", fontSize: 11, fontFamily: "monospace", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Total</div>
          <div style={{ color: "#F5C518", fontSize: 12, fontFamily: "monospace", fontWeight: 800 }}>{fmt(totals.spend)}</div>
          <div style={{ color: "#F5C518", fontSize: 12, fontFamily: "monospace", fontWeight: 800 }}>{fmtNum(totals.inscrits)}</div>
          <div style={{ color: "#F5C518", fontSize: 12, fontFamily: "monospace", fontWeight: 800 }}>{totals.inscrits > 0 ? fmt(totals.spend / totals.inscrits) : "—"}</div>
          <div />
        </div>
      )}
    </div>
  );
}
