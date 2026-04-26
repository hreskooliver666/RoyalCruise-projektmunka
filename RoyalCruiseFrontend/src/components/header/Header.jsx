// Ez a fájl a felső navigációs fejlécet, menüpontokat és felhasználói állapothoz igazodó gombokat tartalmazza.
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuth from "../../auth/useAuth.jsx";
import classes from "./Header.module.css";

// A Header komponens kezeli a fő navigáció megjelenítését és a bejelentkezési állapothoz tartozó menüelemeket.
export default function Header() {
  // 1) Felhasználói állapot, navigáció és mobil menüállapot inicializálása.
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // 2) Kijelentkezési folyamat és menüállapot visszaállítása.
  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    navigate("/");
  }

  function handleMenuNavigate(path) {
    navigate(path);
    setMenuOpen(false);
  }

  // 3) Fejléc kirajzolása: fő navigáció, hamburger menü és lenyíló gyorsműveletek.
  return (
    <div className={classes.container}>
      <div className={classes.inner}>

        {/* Bal oldali nav */}
        <nav className={classes.nav}>
          <NavLink to="/" className={`${classes.link} ${classes.homeLink}`}>Főoldal</NavLink>
          <NavLink to="/routes" className={classes.link}>Hajóutak</NavLink>
          {user && <NavLink to="/profile" className={classes.link}>Profil</NavLink>}

          {!user && <NavLink to="/login" className={classes.link}>Belépés</NavLink>}
          {!user && <NavLink to="/register" className={classes.link}>Regisztráció</NavLink>}

          {isAdmin && <NavLink to="/admin" className={classes.link}>Admin</NavLink>}
          {isAdmin && <NavLink to="/admin/bookings" className={classes.link}>Felhasználók foglalásai</NavLink>}
        </nav>

        {/* JOBB OLDALI HAMBURGER – külön elem, nem a nav része */}
        <div
          className={classes.hamburger}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className={menuOpen ? classes.open : ""}></span>
          <span className={menuOpen ? classes.open : ""}></span>
          <span className={menuOpen ? classes.open : ""}></span>
        </div>

        {/* LENYÍLÓ MENÜ */}
        {menuOpen && (
          <div className={classes.dropdown}>
            <button className={classes.mobilePrimaryMenuItem} onClick={() => handleMenuNavigate("/")}>
              Főoldal
            </button>
            <button className={classes.mobilePrimaryMenuItem} onClick={() => handleMenuNavigate("/routes")}>
              Hajóutak
            </button>
            {user && (
              <button className={classes.mobilePrimaryMenuItem} onClick={() => handleMenuNavigate("/profile")}>
                Profil
              </button>
            )}
            {!user && (
              <button className={classes.mobilePrimaryMenuItem} onClick={() => handleMenuNavigate("/login")}>
                Belépés
              </button>
            )}
            {!user && (
              <button className={classes.mobilePrimaryMenuItem} onClick={() => handleMenuNavigate("/register")}>
                Regisztráció
              </button>
            )}
            {isAdmin && (
              <button className={classes.mobilePrimaryMenuItem} onClick={() => handleMenuNavigate("/admin")}>
                Admin
              </button>
            )}
            {isAdmin && (
              <button className={classes.mobilePrimaryMenuItem} onClick={() => handleMenuNavigate("/admin/bookings")}>
                Felhasználók foglalásai
              </button>
            )}

            <button onClick={() => { navigate("/regions"); setMenuOpen(false); }}>
              Régiók
            </button>
            <button onClick={() => { navigate("/cabins"); setMenuOpen(false); }}>
              Kabinok
            </button>
            <button onClick={() => { navigate("/cruise-guide"); setMenuOpen(false); }}>
              Tudnivalók
            </button>
            <button onClick={() => { navigate("/about"); setMenuOpen(false); }}>
              Kapcsolat
            </button>
            <button onClick={() => { navigate("/company"); setMenuOpen(false); }}>
              Rólunk
            </button>
            {user && (
              <button className={classes.logoutMenuItem} onClick={handleLogout}>
                Kijelentkezés
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
