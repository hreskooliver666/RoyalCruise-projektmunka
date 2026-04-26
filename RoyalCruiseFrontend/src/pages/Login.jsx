// Ez a fájl a bejelentkezési oldal felépítését és az AuthForm komponenshez kapcsolt login folyamatot tartalmazza.
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import useAuth from "../auth/useAuth.jsx";
import AuthForm from "../components/auth/AuthForm.jsx";

// A Login oldal összeköti az űrlap beküldését a bejelentkezési API-hívással és a sikeres navigációval.
export default function Login() {
  // 1) Auth műveletek és oldalállapotok inicializálása.
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // 2) Bejelentkezési folyamat: hitelesítés, szerepkör alapú továbbirányítás, hibaüzenet-kezelés.
  async function handleLogin(email, password) {
    setError("");
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/login-success");
      }
    } catch (err) {
      setError(err.message || "Sikertelen bejelentkezés.");
    }
  }

  // 3) Bejelentkező űrlap és regisztrációs átvezető link megjelenítése.
  return (
    <section>
      <AuthForm
        title="Bejelentkezés"
        buttonLabel="Belépés"
        onSubmit={handleLogin}
      />
      {error && <p style={{ textAlign: "center", color: "#b00020" }}>{error}</p>}
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        Nincs fiókod? <Link to="/register">Regisztráció</Link>
      </p>
    </section>
  );
}
