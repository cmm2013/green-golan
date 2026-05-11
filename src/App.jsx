import { useState, useEffect, useRef } from "react";
import { db } from "./supabase";
import AdminPanel from "./AdminPanel";

// ── Villages ──────────────────────────────────────────────
const VILLAGES = [
  { name: "בוקעאתא",    lat: 33.2485, lng: 35.7643 },
  { name: "מג׳דל שמס", lat: 33.2654, lng: 35.7702 },
  { name: "מסעדה",      lat: 33.2540, lng: 35.7856 },
  { name: "עין קניה",   lat: 33.2392, lng: 35.7758 },
];

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Tips ──────────────────────────────────────────────────
const TIPS = [
  { icon: "📲", title: "פורטל + Google Business", body: "עדכנו שעות ותמונות. תיירים מחפשים אתכם עכשיו." },
  { icon: "🎥", title: "סטוריז כל בוקר",          body: "30 שניות מהמטע = עשרות לקוחות. כל יום." },
  { icon: "🚌", title: "מארגני טיולים",            body: "קבוצה = 60–90 ק\"ג ביום. צרו קשר עם מארגנים." },
  { icon: "🎁", title: "סלסלות מתנה",              body: "אריזה יפה → 50–60 ₪/ק\"ג. מוצר מושלם לשי." },
];

// ── Cherry SVG ────────────────────────────────────────────
function CherrySVG({ size = 40, opacity = 0.18 }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 40 50" style={{ opacity }}>
      <circle cx="12" cy="34" r="11" fill="#c0392b" />
      <circle cx="28" cy="38" r="11" fill="#922b21" />
      <path d="M12 23 Q20 5 28 26" stroke="#2d6a4f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M20 10 Q30 0 37 8" stroke="#2d6a4f" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="10" cy="31" r="3.5" fill="rgba(255,255,255,0.22)" />
    </svg>
  );
}

// ── Photo Slideshow ───────────────────────────────────────
function PhotoSlideshow({ photos }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!photos || photos.length <= 1) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % photos.length), 3500);
    return () => clearInterval(timerRef.current);
  }, [photos?.length]);

  if (!photos || photos.length === 0) return null;

  const prev = () => { clearInterval(timerRef.current); setIdx(i => (i - 1 + photos.length) % photos.length); };
  const next = () => { clearInterval(timerRef.current); setIdx(i => (i + 1) % photos.length); };

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 18, aspectRatio: "16/9", background: "#eee" }}>
      {photos.map((url, i) => (
        <img key={i} src={url} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          opacity: i === idx ? 1 : 0, transition: "opacity 0.6s ease",
        }} />
      ))}
      {photos.length > 1 && (
        <>
          <button onClick={prev} style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.75)", border: "none", borderRadius: "50%",
            width: 32, height: 32, fontSize: 16, cursor: "pointer", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>›</button>
          <button onClick={next} style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.75)", border: "none", borderRadius: "50%",
            width: 32, height: 32, fontSize: 16, cursor: "pointer", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>‹</button>
          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
            {photos.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{
                width: i === idx ? 18 : 7, height: 7, borderRadius: 4,
                background: i === idx ? "#fff" : "rgba(255,255,255,0.55)",
                cursor: "pointer", transition: "all 0.3s",
              }} />
            ))}
          </div>
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(0,0,0,0.4)", color: "#fff",
            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
          }}>{idx + 1} / {photos.length}</div>
        </>
      )}
    </div>
  );
}

// ── Form fields helper ────────────────────────────────────
const EMPTY_FORM = { name: "", owner: "", village: "בוקעאתא", phone: "", hours: "", price: "", type: "🍒 מטע קטיף עצמי", description: "" };

const BUSINESS_TYPES = ["🍒 מטע קטיף עצמי","🌿 מטע מכירה","☕ בית קפה / מסעדה","🏡 אירוח כפרי","🛒 חנות תוצרת חקלאית"];

function VillageSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {VILLAGES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
    </select>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                   = useState("portal");
  const [cherries, setCherries]         = useState([]);
  const [farms, setFarms]               = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [submitting, setSubmitting]     = useState(false);
  const [submitMsg, setSubmitMsg]       = useState(null);

  // Filter + proximity
  const [villageFilter, setVillageFilter] = useState("הכל");
  const [userPos, setUserPos]             = useState(null);
  const [nearMe, setNearMe]               = useState(false);
  const [locLoading, setLocLoading]       = useState(false);

  // Auth
  const [user, setUser]             = useState(null);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [myFarm, setMyFarm]         = useState(null);
  const [showLogin, setShowLogin]   = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [editForm, setEditForm]     = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg]       = useState(null);
  const [uploading, setUploading]   = useState(false);

  // Floating cherries
  useEffect(() => {
    setCherries(Array.from({ length: 14 }, (_, i) => ({
      id: i, left: 5 + Math.random()*88, top: 3 + Math.random()*90,
      size: 28 + Math.random()*38, dur: 3.5 + Math.random()*4,
      delay: Math.random()*5, opacity: 0.08 + Math.random()*0.14,
    })));
  }, []);

  // Load farms
  useEffect(() => {
    async function load() {
      const { data } = await db.from("farms").select("*").eq("approved", true).eq("open", true).order("created_at", { ascending: false });
      if (data) setFarms(data);
      setLoadingFarms(false);
    }
    load();
  }, []);

  // Auth session
  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) afterLogin(session.user);
    });
    const { data: { subscription } } = db.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) afterLogin(session.user);
      else { setIsAdmin(false); setMyFarm(null); setEditForm(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function afterLogin(u) {
    const { data: adminData } = await db.from("admins").select("user_id").eq("user_id", u.id).single();
    setIsAdmin(!!adminData);
    if (!adminData) {
      const { data: farmData } = await db.from("farms").select("*").eq("user_id", u.id).single();
      if (farmData) { setMyFarm(farmData); setEditForm(farmData); }
    }
  }

  async function handleLogin() {
    setLoginLoading(true); setLoginError("");
    const { error } = await db.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoginLoading(false);
    if (error) setLoginError("אימייל או סיסמה שגויים");
    else { setShowLogin(false); setLoginEmail(""); setLoginPassword(""); }
  }

  async function handleLogout() {
    await db.auth.signOut();
    setTab("portal");
  }

  async function handleEditSave() {
    setEditSaving(true);
    const { error } = await db.from("farms").update({
      name: editForm.name, owner: editForm.owner, village: editForm.village,
      phone: editForm.phone, hours: editForm.hours, price: editForm.price,
      type: editForm.type, description: editForm.description,
    }).eq("id", myFarm.id);
    setEditSaving(false);
    if (error) setEditMsg({ ok: false, text: "שגיאה בשמירה. נסו שנית." });
    else { setMyFarm({ ...myFarm, ...editForm }); setEditMsg({ ok: true, text: "✅ הפרטים עודכנו בהצלחה!" }); }
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files).slice(0, 10 - (editForm.photos?.length || 0));
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const path = `${user.id}/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const { data, error } = await db.storage.from("farm-photos").upload(path, file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = db.storage.from("farm-photos").getPublicUrl(data.path);
        uploaded.push(publicUrl);
      }
    }
    const newPhotos = [...(editForm.photos || []), ...uploaded];
    await db.from("farms").update({ photos: newPhotos }).eq("id", myFarm.id);
    setEditForm(f => ({ ...f, photos: newPhotos }));
    setMyFarm(f => ({ ...f, photos: newPhotos }));
    setUploading(false);
  }

  async function handleDeletePhoto(url) {
    const newPhotos = (editForm.photos || []).filter(p => p !== url);
    await db.from("farms").update({ photos: newPhotos }).eq("id", myFarm.id);
    setEditForm(f => ({ ...f, photos: newPhotos }));
    setMyFarm(f => ({ ...f, photos: newPhotos }));
  }

  async function handleSubmit() {
    if (!form.name || !form.phone) { setSubmitMsg({ ok: false, text: "אנא מלאו שם מטע וטלפון." }); return; }
    setSubmitting(true);
    const { error } = await db.from("farms").insert([{ ...form, approved: false, user_id: user?.id ?? null, email: user?.email ?? null }]);
    setSubmitting(false);
    if (error) setSubmitMsg({ ok: false, text: "שגיאה בשליחה. אנא נסו שנית." });
    else { setSubmitMsg({ ok: true, text: "✅ תודה! בקשת הרישום התקבלה. ניצור קשר תוך 24 שעות." }); setForm(EMPTY_FORM); }
  }

  function handleNearMe() {
    if (nearMe) { setNearMe(false); setUserPos(null); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearMe(true); setLocLoading(false); },
      ()  => { alert("לא ניתן לקבל מיקום. אנא אפשרו גישה."); setLocLoading(false); }
    );
  }

  // Filtered + sorted farms
  const displayFarms = (() => {
    let list = farms.filter(f => villageFilter === "הכל" || f.village === villageFilter);
    if (nearMe && userPos) {
      list = [...list].sort((a, b) => {
        const vA = VILLAGES.find(v => v.name === a.village) || VILLAGES[0];
        const vB = VILLAGES.find(v => v.name === b.village) || VILLAGES[0];
        return haversine(userPos.lat, userPos.lng, vA.lat, vA.lng) - haversine(userPos.lat, userPos.lng, vB.lat, vB.lng);
      });
    }
    return list;
  })();

  const msgStyle = ok => ({
    padding: "12px 16px", borderRadius: 12, fontWeight: 700, fontSize: 13,
    background: ok ? "rgba(39,174,96,0.1)" : "rgba(192,57,43,0.1)",
    color: ok ? "#1a5c3a" : "#922b21",
    border: `1.5px solid ${ok ? "rgba(39,174,96,0.25)" : "rgba(192,57,43,0.25)"}`,
  });

  return (
    <div dir="rtl" style={{
      fontFamily: "'Heebo', 'Assistant', sans-serif",
      background: "linear-gradient(150deg, #dff3ec 0%, #e8f6fb 35%, #f0f8e8 65%, #fdecea 100%)",
      minHeight: "100vh", position: "relative", overflow: "hidden", color: "#1a3a28",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;800;900&family=Caveat:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes floatBob { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-16px) rotate(3deg)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{box-shadow:0 0 0 0 rgba(39,174,96,0.4)} 50%{box-shadow:0 0 0 8px rgba(39,174,96,0)} }
        .float-cherry { animation: floatBob var(--dur) ease-in-out var(--dly) infinite; }
        .fade-up      { animation: fadeUp 0.55s ease both; }
        .glass {
          background: rgba(255,255,255,0.58); backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px); border: 1.5px solid rgba(255,255,255,0.85);
          border-radius: 22px; box-shadow: 0 6px 40px rgba(30,100,60,0.09), 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s;
        }
        .glass:hover { transform: translateY(-5px); box-shadow: 0 18px 60px rgba(192,57,43,0.12), 0 4px 16px rgba(0,0,0,0.07); }
        .tip-glass {
          background: rgba(255,255,255,0.52); backdrop-filter: blur(14px);
          border: 1.5px solid rgba(255,255,255,0.82); border-right: 4px solid #27ae60;
          border-radius: 18px; padding: 20px; transition: all 0.25s; box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .tip-glass:hover { background: rgba(255,255,255,0.78); transform: translateX(-4px); }
        .tab-btn {
          background: rgba(255,255,255,0.45); border: 1.5px solid rgba(255,255,255,0.75);
          color: #1e6b42; font-size: 13.5px; font-weight: 700; padding: 9px 20px;
          cursor: pointer; border-radius: 50px; transition: all 0.22s; font-family: inherit; backdrop-filter: blur(10px);
        }
        .tab-btn.active { background: linear-gradient(135deg,#c0392b,#e74c3c); color:#fff; border-color:transparent; box-shadow:0 4px 22px rgba(192,57,43,0.38); }
        .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.72); }
        .filter-btn {
          background: rgba(255,255,255,0.5); border: 1.5px solid rgba(255,255,255,0.8);
          color: #1e6b42; font-size: 13px; font-weight: 700; padding: 7px 16px;
          cursor: pointer; border-radius: 50px; transition: all 0.2s; font-family: inherit;
        }
        .filter-btn.active { background: #1a3a28; color: #fff; border-color: transparent; }
        .filter-btn:hover:not(.active) { background: rgba(255,255,255,0.85); }
        .btn-red { background: linear-gradient(135deg,#c0392b,#e74c3c); color:#fff; border:none; padding:12px 26px; border-radius:50px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; box-shadow:0 4px 22px rgba(192,57,43,0.32); transition:all 0.22s; }
        .btn-red:hover { transform:scale(1.05); box-shadow:0 6px 30px rgba(192,57,43,0.5); }
        .btn-red:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .btn-green { background:transparent; color:#1e6b42; border:2px solid #27ae60; padding:10px 20px; border-radius:50px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s; }
        .btn-green:hover { background:#27ae60; color:#fff; }
        .open-badge { background:linear-gradient(135deg,#27ae60,#2ecc71); color:#fff; font-size:11px; font-weight:800; padding:5px 14px; border-radius:20px; animation:pulse 2.2s infinite; white-space:nowrap; }
        input, textarea, select { background:rgba(255,255,255,0.65); border:1.5px solid rgba(255,255,255,0.9); border-radius:14px; color:#1a3a28; padding:12px 16px; font-size:14px; font-family:inherit; width:100%; outline:none; transition:border 0.2s,box-shadow 0.2s; backdrop-filter:blur(8px); }
        input:focus, textarea:focus, select:focus { border-color:#27ae60; box-shadow:0 0 0 3px rgba(39,174,96,0.15); }
        ::placeholder { color:rgba(26,58,40,0.32); }
        label { font-size:13px; color:#1e6b42; font-weight:700; display:block; margin-bottom:7px; }
      `}</style>

      {/* FLOATING CHERRIES */}
      {cherries.map(c => (
        <div key={c.id} className="float-cherry" style={{ position:"fixed", left:`${c.left}%`, top:`${c.top}%`, "--dur":`${c.dur}s`, "--dly":`${c.delay}s`, zIndex:0, pointerEvents:"none" }}>
          <CherrySVG size={c.size} opacity={c.opacity} />
        </div>
      ))}

      {/* BG BLOBS */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        <svg style={{ position:"absolute", top:-120, right:-120, width:500, height:500, opacity:0.22 }} viewBox="0 0 200 200"><path d="M38,-52C50,-42,61,-31,67,-16C73,-1,73,17,65,31C57,45,40,55,22,61C4,67,-15,69,-32,62C-49,55,-64,39,-69,21C-74,3,-70,-17,-59,-33C-48,-49,-31,-61,-13,-64C5,-67,26,-62,38,-52Z" fill="#3fa8c8" transform="translate(100 100)" /></svg>
        <svg style={{ position:"absolute", bottom:-80, left:-80, width:450, height:450, opacity:0.18 }} viewBox="0 0 200 200"><path d="M44,-58C56,-48,63,-33,67,-17C71,-1,71,16,63,30C55,44,39,55,22,62C5,69,-13,72,-30,66C-47,60,-63,45,-69,27C-75,9,-72,-12,-61,-29C-50,-46,-33,-59,-15,-62C3,-65,32,-68,44,-58Z" fill="#2d9e6b" transform="translate(100 100)" /></svg>
        <svg style={{ position:"absolute", top:"45%", right:"-5%", width:320, height:320, opacity:0.10 }} viewBox="0 0 200 200"><path d="M42,-56C53,-46,59,-32,63,-17C67,-2,68,14,61,27C54,40,40,50,24,57C8,64,-10,68,-28,63C-46,58,-64,44,-70,26C-76,8,-70,-14,-59,-31C-48,-48,-31,-60,-13,-63C5,-66,31,-66,42,-56Z" fill="#c0392b" transform="translate(100 100)" /></svg>
      </div>

      {/* HEADER */}
      <header style={{ position:"relative", zIndex:20, background:"rgba(255,255,255,0.6)", backdropFilter:"blur(22px)", borderBottom:"1.5px solid rgba(255,255,255,0.85)", boxShadow:"0 4px 32px rgba(30,100,60,0.07)", padding:"0 24px" }}>
        <div style={{ maxWidth:920, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0 12px", flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <CherrySVG size={48} opacity={1} />
              <div>
                <div style={{ fontFamily:"'Caveat', cursive", fontSize:28, fontWeight:700, color:"#1a3a28", lineHeight:1 }}>
                  הדובדבן בגולן 🍒
                </div>
                <div style={{ fontSize:11, color:"#27ae60", fontWeight:700, letterSpacing:0.8, marginTop:2 }}>
                  מטעים · עסקים · תיירות חקלאית ברמת הגולן
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <div style={{ background:"linear-gradient(135deg,#27ae60,#52c97a)", color:"#fff", fontSize:12, fontWeight:800, padding:"9px 20px", borderRadius:50, boxShadow:"0 3px 18px rgba(39,174,96,0.38)" }}>
                🍒 עונה פתוחה 2026!
              </div>
              {user ? (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{ width:32, height:32, borderRadius:"50%", border:"2px solid rgba(39,174,96,0.4)" }} />}
                  <span style={{ fontSize:13, fontWeight:700, color:"#1a3a28" }}>{user.user_metadata?.full_name || user.user_metadata?.name || user.email}</span>
                  <button onClick={handleLogout} style={{ background:"rgba(255,255,255,0.6)", border:"1.5px solid rgba(200,200,200,0.5)", borderRadius:50, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#555", cursor:"pointer" }}>יציאה</button>
                </div>
              ) : (
                <button onClick={() => setShowLogin(true)} style={{ background:"rgba(255,255,255,0.6)", border:"1.5px solid rgba(200,200,200,0.5)", borderRadius:50, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1e6b42", cursor:"pointer" }}>🔑 כניסה</button>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, paddingBottom:14, flexWrap:"wrap" }}>
            {[
              ["portal","🌿 עסקים ומטעים"],
              ["tips","✨ שיווק חכם"],
              ["register","＋ רישום עסק"],
              ...(myFarm ? [["myfarm","🌾 העסק שלי"]] : []),
              ...(isAdmin ? [["admin","🛠️ ניהול"]] : []),
            ].map(([k, label]) => (
              <button key={k} className={`tab-btn${tab===k?" active":""}`} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ position:"relative", zIndex:10, maxWidth:920, margin:"0 auto", padding:"36px 20px 100px" }}>

        {/* ====== PORTAL ====== */}
        {tab === "portal" && (
          <div className="fade-up">
            {/* Hero */}
            <div style={{ textAlign:"center", marginBottom:44 }}>
              <div style={{ fontFamily:"'Caveat', cursive", fontSize:54, fontWeight:700, color:"#1a3a28", lineHeight:1.2, marginBottom:14 }}>
                הדובדבן בגולן 🍒<br/>
                <span style={{ color:"#c0392b" }}>ישירות מהעץ אליכם</span>
              </div>
              <p style={{ fontSize:16, color:"#2d6a4f", lineHeight:1.85, maxWidth:520, margin:"0 auto 30px" }}>
                ארבעה כפרים דרוזים ברמת הגולן — בוקעאתא, מג׳דל שמס, מסעדה ועין קניה.<br/>
                עונת הדובדבנים פתוחה. הגיעו, קטפו, תיהנו.
              </p>
              {/* Stats pills */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
                {[["🗓","מאי – יוני","עונה פתוחה"],["💰","35–45 ₪/ק\"ג","קטיף עצמי ישיר"],["🏘","4 כפרים","ברמת הגולן"],["🌱","3–4 שבועות","לשיא העונה"]].map(([icon,val,sub]) => (
                  <div key={sub} style={{ background:"rgba(255,255,255,0.65)", backdropFilter:"blur(12px)", border:"1.5px solid rgba(255,255,255,0.9)", borderRadius:50, padding:"11px 20px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 4px 16px rgba(0,0,0,0.05)" }}>
                    <span style={{ fontSize:20 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:"#1a3a28" }}>{val}</div>
                      <div style={{ fontSize:10, color:"#27ae60", fontWeight:600 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter bar */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:20 }}>
              <button className={`filter-btn${villageFilter==="הכל"?" active":""}`} onClick={() => setVillageFilter("הכל")}>🌍 הכל</button>
              {VILLAGES.map(v => (
                <button key={v.name} className={`filter-btn${villageFilter===v.name?" active":""}`} onClick={() => setVillageFilter(v.name)}>{v.name}</button>
              ))}
              <button onClick={handleNearMe} disabled={locLoading} style={{
                background: nearMe ? "linear-gradient(135deg,#c0392b,#e74c3c)" : "rgba(255,255,255,0.5)",
                border: nearMe ? "none" : "1.5px solid rgba(255,255,255,0.8)",
                color: nearMe ? "#fff" : "#1e6b42", fontSize:13, fontWeight:700, padding:"7px 16px",
                cursor:"pointer", borderRadius:50, transition:"all 0.2s", fontFamily:"inherit",
                boxShadow: nearMe ? "0 4px 18px rgba(192,57,43,0.3)" : "none",
              }}>
                {locLoading ? "מאתר..." : nearMe ? "📍 קרוב אליי ✓" : "📍 קרוב אליי"}
              </button>
            </div>

            {/* Farm cards */}
            {loadingFarms ? (
              <div style={{ textAlign:"center", padding:40, color:"#27ae60", fontWeight:700 }}>טוען עסקים...</div>
            ) : displayFarms.length === 0 ? (
              <div style={{ textAlign:"center", padding:40, color:"#2d6a4f" }}>אין עסקים רשומים עדיין בסינון זה.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {displayFarms.map(f => (
                  <div key={f.id} className="glass" style={{ padding:"28px 30px" }}>
                    {/* Photo slideshow */}
                    <PhotoSlideshow photos={f.photos} />

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, gap:12 }}>
                      <div>
                        <div style={{ fontFamily:"'Caveat', cursive", fontSize:26, fontWeight:700, color:"#1a3a28", marginBottom:3 }}>{f.name}</div>
                        <div style={{ fontSize:13, color:"#27ae60", fontWeight:600 }}>
                          📍 {f.village} · {f.type}
                          {nearMe && userPos && (() => {
                            const v = VILLAGES.find(vl => vl.name === f.village) || VILLAGES[0];
                            const d = haversine(userPos.lat, userPos.lng, v.lat, v.lng);
                            return <span style={{ color:"#c0392b", marginRight:6 }}> · {d < 1 ? `${Math.round(d*1000)}מ׳` : `${d.toFixed(1)} ק"מ`}</span>;
                          })()}
                        </div>
                      </div>
                      {f.open && <span className="open-badge">🟢 פתוח עכשיו</span>}
                    </div>

                    <p style={{ fontSize:14, color:"#2d4a3a", lineHeight:1.8, marginBottom:16 }}>{f.description}</p>

                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                      {[["🕐","שעות",f.hours],["💰","מחיר",f.price],["📞","טלפון",f.phone]].map(([icon,lbl,val]) => val ? (
                        <div key={lbl} style={{ background:"rgba(255,255,255,0.65)", borderRadius:14, padding:"12px 14px", border:"1.5px solid rgba(255,255,255,0.9)", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                          <div style={{ fontSize:11, color:"#27ae60", marginBottom:4, fontWeight:600 }}>{icon} {lbl}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:"#1a3a28" }}>{val}</div>
                        </div>
                      ) : null)}
                    </div>

                    <div style={{ display:"flex", gap:10 }}>
                      <button className="btn-red" onClick={() => window.open(`https://wa.me/972${f.phone?.replace(/^0/,"").replace(/-/g,"")}`)}>📲 WhatsApp</button>
                      <button className="btn-green" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(f.name + " " + f.village + " גולן")}`)}>📍 נווט</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ textAlign:"center", marginTop:28 }}>
              <button className="btn-red" style={{ fontSize:15, padding:"14px 32px" }} onClick={() => setTab("register")}>
                🌱 רשמו את העסק שלכם – חינם
              </button>
            </div>
          </div>
        )}

        {/* ====== TIPS ====== */}
        {tab === "tips" && (
          <div className="fade-up">
            <div style={{ textAlign:"center", marginBottom:38 }}>
              <div style={{ fontFamily:"'Caveat', cursive", fontSize:50, fontWeight:700, color:"#1a3a28", marginBottom:10 }}>שווקו חכם 💡</div>
              <p style={{ fontSize:15, color:"#2d6a4f", lineHeight:1.85, maxWidth:480, margin:"0 auto" }}>
                ייעוץ מועצת קלווד לעונת 2026.<br/>4 צעדים מיידיים למכירה ישירה בלי סוחרים.
              </p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:34 }}>
              {TIPS.map((t, i) => (
                <div key={i} className="tip-glass">
                  <div style={{ display:"flex", gap:12, marginBottom:10 }}>
                    <span style={{ fontSize:30 }}>{t.icon}</span>
                    <div>
                      <span style={{ background:"rgba(39,174,96,0.13)", color:"#1a5c3a", fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:20, display:"inline-block", marginBottom:5 }}>צעד {i+1}</span>
                      <div style={{ fontSize:15, fontWeight:800, color:"#1a3a28" }}>{t.title}</div>
                    </div>
                  </div>
                  <p style={{ fontSize:13, color:"#2d4a3a", lineHeight:1.75 }}>{t.body}</p>
                </div>
              ))}
            </div>
            <div className="glass" style={{ padding:"30px 32px" }}>
              <div style={{ fontFamily:"'Caveat', cursive", fontSize:28, color:"#1a3a28", marginBottom:22 }}>💰 כמה תרוויחו יותר?</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:22 }}>
                <div style={{ background:"rgba(200,200,200,0.18)", border:"1.5px solid rgba(180,180,180,0.2)", borderRadius:18, padding:22, textAlign:"center" }}>
                  <div style={{ fontSize:12, color:"#999", marginBottom:8, fontWeight:700 }}>🔻 דרך סוחר</div>
                  <div style={{ fontSize:40, fontWeight:900, color:"#bbb" }}>24 ₪</div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>לק"ג · הסוחר קובע</div>
                </div>
                <div style={{ background:"linear-gradient(135deg,rgba(192,57,43,0.1),rgba(231,76,60,0.05))", border:"1.5px solid rgba(192,57,43,0.22)", borderRadius:18, padding:22, textAlign:"center" }}>
                  <div style={{ fontSize:12, color:"#c0392b", marginBottom:8, fontWeight:700 }}>✅ קטיף עצמי ישיר</div>
                  <div style={{ fontSize:40, fontWeight:900, color:"#c0392b" }}>45 ₪</div>
                  <div style={{ fontSize:11, color:"#922b21", marginTop:4 }}>לק"ג · אתם קובעים</div>
                </div>
              </div>
              {[["דרך סוחר","53%","#ccc","24,000 ₪"],["קטיף עצמי","100%","linear-gradient(90deg,#27ae60,#52c97a)","45,000 ₪"]].map(([label,w,bg,val]) => (
                <div key={label} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, fontWeight:700, color:"#2d6a4f", marginBottom:5 }}><span>{label}</span><span style={{ color:"#1a3a28" }}>{val} על 1,000 ק"ג</span></div>
                  <div style={{ background:"rgba(200,200,200,0.28)", borderRadius:50, height:11, overflow:"hidden" }}>
                    <div style={{ width:w, height:"100%", background:bg, borderRadius:50, transition:"width 1s" }} />
                  </div>
                </div>
              ))}
              <div style={{ background:"linear-gradient(135deg,rgba(39,174,96,0.1),rgba(82,201,122,0.07))", border:"1.5px solid rgba(39,174,96,0.2)", borderRadius:14, padding:"16px 20px", fontSize:14, color:"#1a5c3a", fontWeight:600, lineHeight:1.75, marginTop:18 }}>
                📈 הפרש של <strong style={{ color:"#c0392b", fontSize:20 }}>15,000–21,000 ₪</strong> לטובת קטיף עצמי<br/>על אותה כמות בדיוק של דובדבנים.
              </div>
            </div>
          </div>
        )}

        {/* ====== REGISTER ====== */}
        {tab === "register" && (
          <div className="fade-up">
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontFamily:"'Caveat', cursive", fontSize:48, fontWeight:700, color:"#1a3a28", marginBottom:10 }}>רשמו את העסק שלכם 🌿</div>
              <p style={{ fontSize:14, color:"#2d6a4f", lineHeight:1.8 }}>חינמי לגמרי · רק 2 דקות · תיירים ימצאו אתכם מחר</p>
            </div>
            {!user ? (
              <div className="glass" style={{ padding:"48px 36px", textAlign:"center" }}>
                <div style={{ fontSize:52, marginBottom:16 }}>🔑</div>
                <div style={{ fontFamily:"'Caveat', cursive", fontSize:32, fontWeight:700, color:"#1a3a28", marginBottom:12 }}>
                  יש להתחבר תחילה
                </div>
                <p style={{ fontSize:14, color:"#2d6a4f", lineHeight:1.8, marginBottom:28, maxWidth:360, margin:"0 auto 28px" }}>
                  כדי לרשום עסק ולנהל אותו בעתיד,<br/>יש להתחבר עם Gmail או אימייל.
                </p>
                <button className="btn-red" style={{ fontSize:15, padding:"13px 32px" }} onClick={() => setShowLogin(true)}>
                  🔑 כניסה / הרשמה
                </button>
              </div>
            ) : myFarm ? (
              <div className="glass" style={{ padding:"48px 36px", textAlign:"center" }}>
                <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
                <div style={{ fontFamily:"'Caveat', cursive", fontSize:32, fontWeight:700, color:"#1a3a28", marginBottom:12 }}>
                  העסק שלך כבר רשום!
                </div>
                <p style={{ fontSize:14, color:"#2d6a4f", marginBottom:28 }}>לעריכת הפרטים עברו לטאב <strong>🌾 העסק שלי</strong></p>
                <button className="btn-red" style={{ fontSize:15, padding:"13px 32px" }} onClick={() => setTab("myfarm")}>
                  🌾 לעסק שלי
                </button>
              </div>
            ) : (
            <div className="glass" style={{ padding:"32px 36px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                {[["שם המטע / העסק","text","לדוגמה: מטע אבו ג'בל","name"],["שם הבעלים","text","שמכם המלא","owner"],["טלפון / WhatsApp","tel","050-XXX-XXXX","phone"],["שעות קבלה","text","07:00 – 14:00","hours"],["מחיר קטיף עצמי","text","35 ₪ לק\"ג","price"]].map(([lbl,type,ph,field]) => (
                  <div key={field}>
                    <label>{lbl}</label>
                    <input type={type} placeholder={ph} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label>ישוב</label>
                  <VillageSelect value={form.village} onChange={v => setForm(f => ({ ...f, village: v }))} />
                </div>
                <div>
                  <label>סוג העסק</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label>תיאור קצר</label>
                  <textarea rows={3} placeholder="ספרו לתיירים על העסק, הנוף והדובדבנים שלכם..." style={{ resize:"vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                {submitMsg && <div style={msgStyle(submitMsg.ok)}>{submitMsg.text}</div>}
                <button className="btn-red" style={{ fontSize:16, padding:15 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "שולח..." : "✅ שלחו בקשת רישום"}
                </button>
                <div style={{ fontSize:12, color:"#27ae60", textAlign:"center", fontWeight:700 }}>לאחר אישור · העסק יופיע בפורטל תוך 24 שעות</div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ====== MY FARM ====== */}
        {tab === "myfarm" && editForm && (
          <div className="fade-up">
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontFamily:"'Caveat', cursive", fontSize:46, fontWeight:700, color:"#1a3a28", marginBottom:8 }}>העסק שלי 🌾</div>
              <p style={{ fontSize:14, color:"#2d6a4f" }}>עדכנו פרטים והעלו תמונות — השינויים יופיעו בפורטל מיד</p>
            </div>
            <div className="glass" style={{ padding:"32px 36px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

                {/* Photo management */}
                <div>
                  <label>תמונות ({(editForm.photos || []).length}/10)</label>
                  {(editForm.photos || []).length > 0 && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:8, marginBottom:12 }}>
                      {(editForm.photos || []).map((url, i) => (
                        <div key={i} style={{ position:"relative", aspectRatio:"1", borderRadius:10, overflow:"hidden" }}>
                          <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          <button onClick={() => handleDeletePhoto(url)} style={{ position:"absolute", top:4, left:4, background:"rgba(192,57,43,0.85)", color:"#fff", border:"none", borderRadius:"50%", width:22, height:22, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(editForm.photos || []).length < 10 && (
                    <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"rgba(39,174,96,0.08)", border:"2px dashed rgba(39,174,96,0.35)", borderRadius:14, padding:"16px", cursor:"pointer", color:"#1e6b42", fontSize:14, fontWeight:700 }}>
                      {uploading ? "מעלה..." : `📸 הוסף תמונות (עד ${10-(editForm.photos||[]).length} נוספות)`}
                      <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handlePhotoUpload} disabled={uploading} />
                    </label>
                  )}
                </div>

                {[["שם המטע / העסק","text","name"],["שם הבעלים","text","owner"],["טלפון / WhatsApp","tel","phone"],["שעות קבלה","text","hours"],["מחיר קטיף עצמי","text","price"]].map(([lbl,type,field]) => (
                  <div key={field}>
                    <label>{lbl}</label>
                    <input type={type} value={editForm[field]??""} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label>ישוב</label>
                  <VillageSelect value={editForm.village ?? "בוקעאתא"} onChange={v => setEditForm(f => ({ ...f, village: v }))} />
                </div>
                <div>
                  <label>סוג העסק</label>
                  <select value={editForm.type??""} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                    {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label>תיאור קצר</label>
                  <textarea rows={3} style={{ resize:"vertical" }} value={editForm.description??""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                {editMsg && <div style={msgStyle(editMsg.ok)}>{editMsg.text}</div>}
                <button className="btn-red" style={{ fontSize:16, padding:15 }} onClick={handleEditSave} disabled={editSaving}>
                  {editSaving ? "שומר..." : "💾 שמור שינויים"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====== ADMIN ====== */}
        {tab === "admin" && isAdmin && <AdminPanel />}

      </main>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setShowLogin(false)}>
          <div style={{ background:"rgba(255,255,255,0.95)", borderRadius:24, padding:"36px 40px", width:"100%", maxWidth:380, boxShadow:"0 24px 80px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:"'Caveat', cursive", fontSize:36, fontWeight:700, color:"#1a3a28", marginBottom:6 }}>כניסה 🔑</div>
            <p style={{ fontSize:13, color:"#2d6a4f", marginBottom:24 }}>כניסה לבעלי עסקים ולמנהלים</p>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><label>אימייל</label><input type="email" placeholder="your@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} /></div>
              <div><label>סיסמה</label><input type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} /></div>
              {loginError && <div style={{ color:"#922b21", fontSize:13, fontWeight:700 }}>{loginError}</div>}
              <button className="btn-red" style={{ fontSize:15, padding:13 }} onClick={handleLogin} disabled={loginLoading}>{loginLoading ? "מתחבר..." : "כניסה"}</button>
              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0" }}>
                <div style={{ flex:1, height:1, background:"rgba(0,0,0,0.1)" }} /><span style={{ fontSize:12, color:"#999" }}>או</span><div style={{ flex:1, height:1, background:"rgba(0,0,0,0.1)" }} />
              </div>
              <button onClick={() => db.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: window.location.origin } })} style={{ background:"#fff", border:"1.5px solid #ddd", borderRadius:50, padding:"12px 20px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, color:"#333", fontFamily:"inherit", width:"100%", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                כניסה עם Google
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAVE */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:2, pointerEvents:"none" }}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width:"100%", height:70, display:"block" }}>
          <path d="M0,45 Q180,10 360,45 Q540,80 720,45 Q900,10 1080,45 Q1260,80 1440,45 L1440,80 L0,80 Z" fill="rgba(39,174,96,0.1)" />
          <path d="M0,58 Q200,28 400,58 Q600,88 800,58 Q1000,28 1200,58 Q1340,78 1440,58 L1440,80 L0,80 Z" fill="rgba(52,152,219,0.07)" />
        </svg>
      </div>
    </div>
  );
}
