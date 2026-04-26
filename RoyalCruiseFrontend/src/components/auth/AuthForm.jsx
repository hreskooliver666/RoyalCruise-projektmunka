// Ez a fájl a bejelentkező/regisztrációs űrlap mezőit, validációját és beküldési folyamatát kezeli.
import { useState } from "react";
import classes from "./AuthForm.module.css";

// Az AuthForm komponens a felhasználói hitelesítési adatok bekérését, hibakezelését és submit eseményének átadását végzi.
export default function AuthForm({ title, onSubmit, buttonLabel }) {
  // 1) Űrlapmezők lokális állapotainak inicializálása.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 2) Beküldési kezelő: alapértelmezett submit tiltása és adatok továbbadása a szülő callbacknek.
// Ez a segédfüggvény elküldi az űrlap adatait, és kezeli a sikeres vagy hibás választ.
  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(email, password);
  }

  // 3) Bejelentkező/regisztrációs űrlapmezők és submit gomb kirajzolása.
  return (
    <form className={classes.form} onSubmit={handleSubmit}>
      <h2>{title}</h2>

      <label>Email cím</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label>Jelszó</label>
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">{buttonLabel}</button>
    </form>
  );
}
