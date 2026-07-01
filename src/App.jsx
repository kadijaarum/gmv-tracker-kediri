import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { app } from "./firebaseConfig.js";
import installStorageAdapter, { fetchMyRole } from "./storageAdapter.js";
import GMVDashboard from "./GMVDashboard.jsx";

installStorageAdapter();

const auth = getAuth(app);

// ============================================================
// KONFIGURASI LOGIN — SESUAIKAN BAGIAN INI UNTUK AREA BARUMU
// ============================================================
//
// Format: username_ketik: { email: "email_di_firebase", label: "Nama Toko" }
//
// Langkah:
//   1. Ganti username, email, dan label di bawah sesuai toko barumu
//   2. Buat user dengan email yang SAMA di Firebase Console > Authentication > Users
//   3. Buat dokumen di Firestore > userRoles > {uid_user} dengan field accountId: "tt1" dll
//
// Catatan:
//   - Email di sini BUKAN email asli siapapun — hanya identitas teknis di Firebase
//   - username bisa apa saja (huruf kecil, tanpa spasi)
//   - accountId harus salah satu dari: tt1, tt2, tt3, tt4, tt5, tt6, shopee, atau admin
//
const STORE_LOGINS = {
  // === GANTI NAMA TOKO DI SINI ===
  toko1: { email: "velvet@cosmetic.com",   label: "Velvet" },   // accountId: tt1
  toko2: { email: "glowy@cosmetic.com",   label: "Glowy" },   // accountId: tt2
  toko3: { email: "glam@cosmetic.com",   label: "Glam" },   // accountId: tt3
  toko4: { email: "cerin@cosmetic.com",   label: "Cerin" },   // accountId: tt4
  toko5: { email: "toko5@area-baru.com",   label: "Nama Toko 5" },   // accountId: tt5
  toko6: { email: "toko6@area-baru.com",   label: "Nama Toko 6" },   // accountId: tt6
  shopee: { email: "shopee@area-baru.com", label: "Shopee" },         // accountId: shopee
  admin:  { email: "admin@localhost.com",  label: "Admin" },          // accountId: admin
  // ================================
};

// Label tampilan di header saat login (ikut accountId dari Firestore userRoles)
// Sesuaikan dengan nama toko yang kamu pakai di atas
const ACCOUNT_ID_LABELS = {
  tt1:    STORE_LOGINS.toko1?.label || "Toko 1",
  tt2:    STORE_LOGINS.toko2?.label || "Toko 2",
  tt3:    STORE_LOGINS.toko3?.label || "Toko 3",
  tt4:    STORE_LOGINS.toko4?.label || "Toko 4",
  tt5:    STORE_LOGINS.toko5?.label || "Toko 5",
  tt6:    STORE_LOGINS.toko6?.label || "Toko 6",
  shopee: STORE_LOGINS.shopee?.label || "Shopee",
  admin:  "Admin",
};
// ============================================================

export default function App() {
  const [user, setUser] = useState(undefined);
  const [myAccountId, setMyAccountId] = useState(null);
  const [roleError, setRoleError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setRoleError("");
      setMyAccountId(null);
      if (u) {
        try {
          const role = await fetchMyRole(u.uid);
          if (!role) {
            setRoleError("Login berhasil, tapi accountId belum diset di Firestore (koleksi userRoles). Hubungi admin.");
            await signOut(auth);
          } else {
            setMyAccountId(role);
          }
        } catch (e) {
          setRoleError("Gagal membaca peran akun dari Firestore. Pastikan Firestore Rules sudah ter-publish.");
          await signOut(auth);
        }
      }
    });
    return unsub;
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoggingIn(true);
    const entry = STORE_LOGINS[username.trim().toLowerCase()];
    if (!entry) {
      setError(`Username "${username}" tidak dikenali. Username yang terdaftar: ${Object.keys(STORE_LOGINS).join(", ")}.`);
      setLoggingIn(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, entry.email, password);
    } catch (err) {
      setError(`Login gagal — kode: ${err.code || "tidak diketahui"}. ${err.code === "auth/too-many-requests" ? "Terlalu banyak percobaan gagal, tunggu beberapa menit." : err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "Password salah." : err.code === "auth/user-not-found" ? "Email belum terdaftar di Firebase Authentication." : "Detail: " + (err.message || "-")}`);
    }
    setLoggingIn(false);
  };

  if (user === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#75716A" }}>
        Memuat…
      </div>
    );
  }

  if (!user || !myAccountId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#FAF8FF", fontFamily: "sans-serif" }}>
        <form onSubmit={handleLogin} style={{ background: "#fff", padding: 32, borderRadius: 14, border: "1px solid #E8E1F5", width: 340, boxShadow: "0 8px 30px -8px rgba(124,58,237,0.18)" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: "#1A1523" }}>GMV Tracker</h1>
          <p style={{ fontSize: 13, color: "#6B6478", marginBottom: 18 }}>Login dengan akun toko kamu.</p>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6478", display: "block", marginBottom: 4 }}>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="contoh: toko1" autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", border: "1px solid #E8E1F5", borderRadius: 8, marginBottom: 12, fontSize: 14 }} />
          <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6478", display: "block", marginBottom: 4 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", border: "1px solid #E8E1F5", borderRadius: 8, marginBottom: 12, fontSize: 14 }} />
          {(error || roleError) && <div style={{ color: "#BE123C", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{error || roleError}</div>}
          <button type="submit" disabled={loggingIn}
            style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: loggingIn ? 0.7 : 1 }}>
            {loggingIn ? "Masuk…" : "Masuk"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "#FAF8FF" }}>
        <span style={{ fontSize: 12, color: "#6B6478" }}>Login sebagai: <b style={{ color: "#1A1523" }}>{ACCOUNT_ID_LABELS[myAccountId] || myAccountId}</b></span>
        <button onClick={() => signOut(auth)} style={{ fontSize: 12, color: "#6B6478", background: "none", border: "none", cursor: "pointer" }}>Keluar</button>
      </div>
      <GMVDashboard myAccountId={myAccountId} />
    </div>
  );
}
