// Ez a fájl a regisztrációs oldal felépítését és az AuthForm komponenshez kötött account létrehozást kezeli.
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import useAuth from "../auth/useAuth.jsx";
import classes from "./Register.module.css";

// A Register oldal a felhasználói adatok elküldésével új fiókot hoz létre, majd siker esetén továbbléptet.
export default function Register() {
  // 1) Auth és űrlapállapotok inicializálása.
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    passwordAgain: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    phone: "",
    gender: "Férfi",
  });

  // 2) Mező- és űrlapszintű validációs segédfüggvények.

// Ez a segédfüggvény ellenőrzi az aktuális űrlapmező érvényességét.
  function validateField(name, value, currentForm) {
    const trimmedValue = typeof value === "string" ? value.trim() : value;

    switch (name) {
      case "username":
        if (!trimmedValue) return "A felhasználónév kötelező.";
        if (trimmedValue.length < 3 || trimmedValue.length > 30) {
          return "A felhasználónév 3 és 30 karakter között lehet.";
        }
        return "";
      case "email":
        if (!trimmedValue) return "Az email cím kötelező.";
        if (!/^\S+@\S+\.\S+$/.test(trimmedValue)) return "Érvénytelen email cím.";
        return "";
      case "password":
        if (!value) return "A jelszó kötelező.";
        if (value.length < 8 || value.length > 64) return "A jelszó 8 és 64 karakter között lehet.";
        return "";
      case "passwordAgain":
        if (!value) return "A jelszó ismétlése kötelező.";
        if (value !== currentForm.password) return "A két jelszó nem egyezik.";
        return "";
      case "address":
        if (!trimmedValue) return "A lakcím kötelező.";
        return "";
      case "city":
        if (!trimmedValue) return "A város kötelező.";
        return "";
      case "country":
        if (!trimmedValue) return "Az ország kötelező.";
        return "";
      case "postalCode":
        if (!trimmedValue) return "Az irányítószám kötelező.";
        if (!/^[0-9A-Za-z\- ]{3,12}$/.test(trimmedValue)) return "Az irányítószám formátuma érvénytelen.";
        return "";
      case "phone":
        if (!trimmedValue) return "A telefonszám kötelező.";
        if (!/^\+?[0-9 ]{7,15}$/.test(trimmedValue)) return "A telefonszám formátuma érvénytelen.";
        return "";
      case "gender":
        if (value !== "Férfi" && value !== "Nő") return "A nem mező csak 'Férfi' vagy 'Nő' lehet.";
        return "";
      default:
        return "";
    }
  }

// Ez a segédfüggvény végigellenőrzi a teljes regisztrációs űrlapot.
  function validateForm(currentForm) {
    const nextErrors = {};
    Object.entries(currentForm).forEach(([name, value]) => {
      const fieldError = validateField(name, value, currentForm);
      if (fieldError) {
        nextErrors[name] = fieldError;
      }
    });
    return nextErrors;
  }

// Ez a segédfüggvény frissíti a megadott mező értékét és hibastátuszát.
  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => {
      const nextForm = { ...prev, [name]: value };
      const fieldError = validateField(name, value, nextForm);

      setFieldErrors((prevErrors) => {
        const nextErrors = { ...prevErrors };
        if (fieldError) {
          nextErrors[name] = fieldError;
        } else {
          delete nextErrors[name];
        }

        if (name === "password" && nextForm.passwordAgain) {
          const passwordAgainError = validateField("passwordAgain", nextForm.passwordAgain, nextForm);
          if (passwordAgainError) {
            nextErrors.passwordAgain = passwordAgainError;
          } else {
            delete nextErrors.passwordAgain;
          }
        }

        return nextErrors;
      });

      return nextForm;
    });
  }

// Ez a segédfüggvény mezőelhagyáskor lefuttatja a megfelelő validációt.
  function handleBlur(event) {
    const { name, value } = event.target;
    const fieldError = validateField(name, value, form);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (fieldError) {
        next[name] = fieldError;
      } else {
        delete next[name];
      }
      return next;
    });
  }

// Ez a segédfüggvény visszaadja a mezőállapothoz tartozó CSS osztálynevet.
  function getFieldClass(fieldName) {
    return fieldErrors[fieldName] ? `${classes.invalidField}` : "";
  }

  // 3) Regisztrációs beküldés: validáció, API-hívás, sikeres navigáció.
  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    const nextErrors = validateForm(form);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Kérlek javítsd a hibás mezőket.");
      return;
    }

    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      setError(err.message || "Sikertelen regisztráció.");
    }
  }

  // 4) Regisztrációs űrlap kirajzolása mezőhibákkal és segédlinkekkel.
  return (
    <section>
      <form className={classes.form} onSubmit={handleRegister}>
        <h2>Regisztráció</h2>

        <label>Felhasználónév</label>
        <input className={getFieldClass("username")} name="username" type="text" required value={form.username} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.username && <p className={classes.fieldError}>{fieldErrors.username}</p>}

        <label>Email cím</label>
        <input className={getFieldClass("email")} name="email" type="email" required value={form.email} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.email && <p className={classes.fieldError}>{fieldErrors.email}</p>}

        <label>Jelszó</label>
        <input className={getFieldClass("password")} name="password" type="password" required value={form.password} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.password && <p className={classes.fieldError}>{fieldErrors.password}</p>}

        <label>Jelszó újra</label>
        <input className={getFieldClass("passwordAgain")} name="passwordAgain" type="password" required value={form.passwordAgain} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.passwordAgain && <p className={classes.fieldError}>{fieldErrors.passwordAgain}</p>}

        <label>Ország</label>
        <input className={getFieldClass("country")} name="country" type="text" required value={form.country} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.country && <p className={classes.fieldError}>{fieldErrors.country}</p>}

        <label>Város</label>
        <input className={getFieldClass("city")} name="city" type="text" required value={form.city} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.city && <p className={classes.fieldError}>{fieldErrors.city}</p>}

        <label>Irányítószám</label>
        <input className={getFieldClass("postalCode")} name="postalCode" type="text" required value={form.postalCode} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.postalCode && <p className={classes.fieldError}>{fieldErrors.postalCode}</p>}

        <label>Lakcím</label>
        <input className={getFieldClass("address")} name="address" type="text" required value={form.address} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.address && <p className={classes.fieldError}>{fieldErrors.address}</p>}

        <label>Tel. szám</label>
        <input className={getFieldClass("phone")} name="phone" type="tel" required value={form.phone} onChange={updateField} onBlur={handleBlur} />
        {fieldErrors.phone && <p className={classes.fieldError}>{fieldErrors.phone}</p>}

        <label>Nem</label>
        <select className={getFieldClass("gender")} name="gender" value={form.gender} onChange={updateField} onBlur={handleBlur}>
          <option value="Férfi">Férfi</option>
          <option value="Nő">Nő</option>
        </select>
        {fieldErrors.gender && <p className={classes.fieldError}>{fieldErrors.gender}</p>}

        <button type="submit">Fiók létrehozása</button>
      </form>
      {error && <p className={classes.error}>{error}</p>}
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        Már van fiókod? <Link to="/login">Bejelentkezés</Link>
      </p>
    </section>
  );
}
