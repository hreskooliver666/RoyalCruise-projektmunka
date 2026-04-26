// Ez a fájl az oldal alján megjelenő közös lábléc tartalmát és navigációs hivatkozásait definiálja.
import { NavLink } from "react-router-dom";
import classes from "./Footer.module.css";

// A Footer komponens statikus információkat, gyorslinkeket és jogi hivatkozásokat jelenít meg minden oldalon.
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={classes.footer}>
      <div className={classes.column}>
        <NavLink to="/about" className={classes.columnTitle}>
          <h4>Kapcsolatok</h4>
        </NavLink>
        <p>Email: info@royalcruise.hu</p>
        <p>Telefon: +36 30 123 4567</p>
      </div>

      <div className={classes.column}>
        <NavLink to="/cruise-guide" className={classes.columnTitle}>
          <h4>Tudnivalók</h4>
        </NavLink>
        <p>
          Hasznos útmutatók a foglaláshoz,<br />
          utazáshoz és fedélzeti élményekhez.
        </p>
      </div>

      <div className={classes.column}>
        <NavLink to="/company" className={classes.columnTitle}>
          <h4>Rólunk</h4>
        </NavLink>
        <p>
          Ismerd meg a RoyalCruise történetét,<br />
          szemléletét és szolgáltatásait.
        </p>
      </div>

      <div className={classes.copyrightRow}>
        <span>Minden jog fenntartva © {currentYear} RoyalCruise</span>
      </div>
    </footer>
  );
}
