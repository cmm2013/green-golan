import { useState, useEffect, useRef } from "react";
import { db } from "./supabase";

function parseMapLink(url) {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

const VILLAGES = ["בוקעאתא", "מג׳דל שמס", "מסעדה", "עין קניה"];
const TYPES = ["דובדבנים", "תפוחים", "אגסים", "ענבים", "שזיפים", "דבש", "ירקות", "תיירות", "אחר"];

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
            {pending.map(f => <FarmRow key={f.id} farm={f} onApprove={approve} onDelete={deleteFarm} onToggleOpen={toggleOpen} onUpdate={updated => setFarms(fs => fs.map(x => x.id === updated.id ? updated : x))} />)}
          </div>
        </>
      )}

      <div style={{ fontSize: 12, color: "#27ae60", fontWeight: 800, letterSpacing: 1.2, marginBottom: 14 }}>
        ✅ מאושרים ({approved.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {approved.map(f => <FarmRow key={f.id} farm={f} onApprove={approve} onDelete={deleteFarm} onToggleOpen={toggleOpen} onUpdate={updated => setFarms(fs => fs.map(x => x.id === updated.id ? updated : x))} />)}
      </div>
    </div>
  );
}

function FarmRow({ farm: f, onApprove, onDelete, onToggleOpen, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...f });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapLink, setMapLink] = useState("");

  function field(k, label, type = "text", opts = null) {
    const inp = {
      value: form[k] ?? "",
      onChange: e => setForm(p => ({ ...p, [k]: e.target.value })),
      style: {
        width: "100%", padding: "8px 12px", borderRadius: 10,
        border: "1.5px solid rgba(39,174,96,0.25)", fontSize: 13,
        background: "rgba(255,255,255,0.7)", marginBottom: 6, boxSizing: "border-box",
        fontFamily: "inherit", color: "#1a3a28",
      }
    };
    if (opts) {
      return (
        <div key={k}>
          <div style={{ fontSize: 11, color: "#27ae60", fontWeight: 700, marginBottom: 2 }}>{label}</div>
          <select {...inp}>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    if (type === "textarea") {
      return (
        <div key={k}>
          <div style={{ fontSize: 11, color: "#27ae60", fontWeight: 700, marginBottom: 2 }}>{label}</div>
          <textarea {...inp} rows={3} style={{ ...inp.style, resize: "vertical" }} />
        </div>
      );
    }
    return (
      <div key={k}>
        <div style={{ fontSize: 11, color: "#27ae60", fontWeight: 700, marginBottom: 2 }}>{label}</div>
        <input type={type} {...inp} />
      </div>
    );
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files).slice(0, 10 - (form.photos?.length || 0));
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const path = `farm-${f.id}/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const { data, error } = await db.storage.from("farm-photos").upload(path, file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = db.storage.from("farm-photos").getPublicUrl(data.path);
        uploaded.push(publicUrl);
      }
    }
    const newPhotos = [...(form.photos || []), ...uploaded];
    await db.from("farms").update({ photos: newPhotos }).eq("id", f.id);
    setForm(p => ({ ...p, photos: newPhotos }));
    onUpdate?.({ ...f, ...form, photos: newPhotos });
    setUploading(false);
  }

  async function handleDeletePhoto(url) {
    const newPhotos = (form.photos || []).filter(p => p !== url);
    await db.from("farms").update({ photos: newPhotos }).eq("id", f.id);
    setForm(p => ({ ...p, photos: newPhotos }));
    onUpdate?.({ ...f, ...form, photos: newPhotos });
  }

  async function save() {
    setSaving(true); setMsg(null);
    const { error } = await db.from("farms").update({
      name: form.name, village: form.village, type: form.type,
      description: form.description, phone: form.phone, owner: form.owner,
      email: form.email, hours: form.hours, price: form.price, website: form.website,
      lat: form.lat ?? null, lng: form.lng ?? null,
    }).eq("id", f.id);
    setSaving(false);
    if (error) { setMsg({ ok: false, text: "שגיאה בשמירה" }); }
    else {
      setMsg({ ok: true, text: "נשמר ✓" });
      setEditing(false);
      onUpdate?.({ ...f, ...form });
    }
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.62)", backdropFilter: "blur(16px)",
      border: `1.5px solid ${f.approved ? "rgba(39,174,96,0.2)" : "rgba(192,57,43,0.2)"}`,
      borderRadius: 18, padding: "20px 24px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    }}>
      {editing ? (
        <div>
          {/* Photo management */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#27ae60", fontWeight: 700, marginBottom: 6 }}>
              תמונות ({(form.photos || []).length}/10)
            </div>
            {(form.photos || []).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 6, marginBottom: 8 }}>
                {(form.photos || []).map((url, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden" }}>
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => handleDeletePhoto(url)} style={{
                      position: "absolute", top: 3, left: 3,
                      background: "rgba(192,57,43,0.85)", color: "#fff",
                      border: "none", borderRadius: "50%", width: 20, height: 20,
                      fontSize: 11, cursor: "pointer", lineHeight: 1,
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {(form.photos || []).length < 10 && (
              <label style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: "rgba(39,174,96,0.08)", border: "2px dashed rgba(39,174,96,0.35)",
                borderRadius: 12, padding: "12px", cursor: "pointer",
                color: "#1e6b42", fontSize: 13, fontWeight: 700,
              }}>
                {uploading ? "מעלה..." : `📸 הוסף תמונות (עד ${10 - (form.photos || []).length})`}
                <input type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            {field("name", "שם העסק")}
            {field("village", "ישוב", "text", VILLAGES)}
            {field("type", "סוג", "text", TYPES)}
            {field("phone", "טלפון")}
            {field("owner", "איש קשר")}
            {field("email", "אימייל", "email")}
            {field("hours", "שעות פעילות")}
            {field("price", "מחיר")}
            {field("website", "אתר")}
          </div>
          {field("description", "תיאור", "textarea")}

          {/* Location */}
          <div style={{ background: "rgba(39,174,96,0.06)", border: "1.5px solid rgba(39,174,96,0.18)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#27ae60", fontWeight: 700, marginBottom: 8 }}>📍 מיקום המטע</div>
            {form.lat && form.lng ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ background: "rgba(39,174,96,0.12)", color: "#1a5c3a", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 20 }}>
                  ✅ {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                </span>
                <a href={`https://maps.google.com/?q=${form.lat},${form.lng}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1e6b42", fontWeight: 700 }}>🗺️ הצג</a>
                <button onClick={() => { setForm(p => ({ ...p, lat: null, lng: null })); setMapLink(""); }} style={{ background: "rgba(192,57,43,0.08)", color: "#922b21", border: "1.5px solid rgba(192,57,43,0.2)", borderRadius: 50, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✕ נקה</button>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#2d6a4f", marginBottom: 8 }}>לא הוגדר מיקום</p>
            )}
            <button type="button" disabled={gpsLoading} onClick={() => {
              setGpsLoading(true);
              navigator.geolocation.getCurrentPosition(
                pos => { setForm(p => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude })); setGpsLoading(false); },
                () => { alert("לא ניתן לקבל מיקום"); setGpsLoading(false); }
              );
            }} style={{ background: "linear-gradient(135deg,#27ae60,#2ecc71)", color: "#fff", border: "none", borderRadius: 50, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
              {gpsLoading ? "מאתר..." : "📍 אתר את המיקום שלי"}
            </button>
            <input type="url" placeholder="או הדבק קישור מ-Google Maps / Waze..."
              value={mapLink}
              onChange={e => {
                setMapLink(e.target.value);
                const coords = parseMapLink(e.target.value);
                if (coords) setForm(p => ({ ...p, lat: coords.lat, lng: coords.lng }));
              }}
              style={{ width: "100%", padding: "7px 12px", borderRadius: 10, border: "1.5px solid rgba(39,174,96,0.25)", fontSize: 12, background: "rgba(255,255,255,0.7)", boxSizing: "border-box", fontFamily: "inherit", color: "#1a3a28" }}
            />
            {mapLink && !(form.lat && form.lng) && (
              <div style={{ fontSize: 11, color: "#c0392b", marginTop: 4, fontWeight: 700 }}>לא ניתן לחלץ קואורדינטות. נסו קישור אחר.</div>
            )}
          </div>

          {msg && <div style={{ fontSize: 12, color: msg.ok ? "#27ae60" : "#c0392b", marginBottom: 8 }}>{msg.text}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={save} disabled={saving} style={{
              background: "linear-gradient(135deg,#27ae60,#2ecc71)", color: "#fff",
              border: "none", borderRadius: 50, padding: "9px 20px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{saving ? "שומר..." : "💾 שמור"}</button>
            <button onClick={() => { setEditing(false); setForm({ ...f }); }} style={{
              background: "rgba(150,150,150,0.1)", color: "#555",
              border: "1.5px solid rgba(150,150,150,0.3)",
              borderRadius: 50, padding: "8px 18px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>ביטול</button>
          </div>
        </div>
      ) : (
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
            <button onClick={() => setEditing(true)} style={{
              background: "rgba(52,152,219,0.1)", color: "#1a5276",
              border: "1.5px solid rgba(52,152,219,0.3)",
              borderRadius: 50, padding: "8px 16px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>✏️ ערוך</button>
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
      )}
    </div>
  );
}
