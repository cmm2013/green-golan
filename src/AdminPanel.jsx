import { useState, useEffect } from "react";
import { db } from "./supabase";

export default function AdminPanel() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadFarms() {
    const { data } = await db.from("farms").select("*").order("created_at", { ascending: false });
    if (data) setFarms(data);
    setLoading(false);
  }

  useEffect(() => { loadFarms(); }, []);

  async function approve(id) {
    await db.from("farms").update({ approved: true }).eq("id", id);
    setFarms(f => f.map(x => x.id === id ? { ...x, approved: true } : x));
  }

  async function deleteFarm(id) {
    if (!window.confirm("למחוק את המטע הזה?")) return;
    await db.from("farms").delete().eq("id", id);
    setFarms(f => f.filter(x => x.id !== id));
  }

  async function toggleOpen(id, open) {
    await db.from("farms").update({ open: !open }).eq("id", id);
    setFarms(f => f.map(x => x.id === id ? { ...x, open: !open } : x));
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#27ae60", fontWeight: 700 }}>טוען...</div>;

  const pending = farms.filter(f => !f.approved);
  const approved = farms.filter(f => f.approved);

  return (
    <div className="fade-up">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 46, fontWeight: 700, color: "#1a3a28", marginBottom: 8 }}>
          פאנל ניהול 🛠️
        </div>
        <p style={{ fontSize: 14, color: "#2d6a4f" }}>{pending.length} ממתינים לאישור · {approved.length} מאושרים</p>
      </div>

      {pending.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: "#c0392b", fontWeight: 800, letterSpacing: 1.2, marginBottom: 14 }}>
            ⏳ ממתינים לאישור ({pending.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
            {pending.map(f => <FarmRow key={f.id} farm={f} onApprove={approve} onDelete={deleteFarm} onToggleOpen={toggleOpen} />)}
          </div>
        </>
      )}

      <div style={{ fontSize: 12, color: "#27ae60", fontWeight: 800, letterSpacing: 1.2, marginBottom: 14 }}>
        ✅ מאושרים ({approved.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {approved.map(f => <FarmRow key={f.id} farm={f} onApprove={approve} onDelete={deleteFarm} onToggleOpen={toggleOpen} />)}
      </div>
    </div>
  );
}

function FarmRow({ farm: f, onApprove, onDelete, onToggleOpen }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.62)", backdropFilter: "blur(16px)",
      border: `1.5px solid ${f.approved ? "rgba(39,174,96,0.2)" : "rgba(192,57,43,0.2)"}`,
      borderRadius: 18, padding: "20px 24px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, fontWeight: 700, color: "#1a3a28" }}>{f.name}</div>
          <div style={{ fontSize: 12, color: "#27ae60", fontWeight: 600, marginBottom: 6 }}>{f.village} · {f.type}</div>
          <div style={{ fontSize: 13, color: "#2d4a3a", lineHeight: 1.6, marginBottom: 8 }}>{f.description}</div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#555", flexWrap: "wrap" }}>
            <span>📞 {f.phone}</span>
            {f.owner && <span>👤 {f.owner}</span>}
            {f.email && <span>✉️ <a href={`mailto:${f.email}`} style={{ color: "#1e6b42" }}>{f.email}</a></span>}
            {f.hours && <span>🕐 {f.hours}</span>}
            {f.price && <span>💰 {f.price}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
          {!f.approved && (
            <button onClick={() => onApprove(f.id)} style={{
              background: "linear-gradient(135deg,#27ae60,#2ecc71)", color: "#fff",
              border: "none", borderRadius: 50, padding: "9px 18px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>✅ אשר</button>
          )}
          <button onClick={() => onToggleOpen(f.id, f.open)} style={{
            background: f.open ? "rgba(39,174,96,0.1)" : "rgba(150,150,150,0.1)",
            color: f.open ? "#1a5c3a" : "#666",
            border: `1.5px solid ${f.open ? "rgba(39,174,96,0.3)" : "rgba(150,150,150,0.3)"}`,
            borderRadius: 50, padding: "8px 16px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>{f.open ? "🟢 פתוח" : "⛔ סגור"}</button>
          <button onClick={() => onDelete(f.id)} style={{
            background: "rgba(192,57,43,0.08)", color: "#922b21",
            border: "1.5px solid rgba(192,57,43,0.2)",
            borderRadius: 50, padding: "8px 16px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>🗑️ מחק</button>
        </div>
      </div>
    </div>
  );
}
