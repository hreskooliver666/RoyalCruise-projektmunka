// Ez a fájl a sikeres bejelentkezés utáni visszajelző oldalt és automatikus továbbléptetést kezeli.
import { Link } from "react-router-dom";
import classes from "./LoginSuccess.module.css";

// A LoginSuccess oldal rövid megerősítést jelenít meg, majd továbbnavigál a felhasználói céloldalra.
export default function LoginSuccess() {
  const navigationOptions = [
    {
      path: "/",
      label: "Főoldal",
      description: "Vissza a kezdőoldalra és a legfrissebb ajánlatokhoz.",
    },
    {
      path: "/routes",
      label: "Összes hajóút",
      description: "Böngészd végig az elérhető útvonalakat és időpontokat.",
    },
    {
      path: "/cabins",
      label: "Kabinok",
      description: "Nézd meg a kabintípusokat és a hozzájuk tartozó szolgáltatásokat.",
    },
    {
      path: "/regions",
      label: "Régiók",
      description: "Fedezd fel, milyen úti célok közül választhatsz.",
    },
  ];

  return (
    <section className={classes.wrapper}>
      <div className={classes.container}>
        <p className={classes.badge}>Royal Cruise fiók</p>
        <h1 className={classes.message}>Sikeres bejelentkezés</h1>
        <p className={classes.subtext}>
          Üdv a fedélzeten! Válassz egy következő lépést, és folytasd a böngészést.
        </p>

        <div className={classes.buttonGrid}>
          {navigationOptions.map((option) => (
            <Link
              key={option.path}
              className={classes.navButton}
              to={option.path}
            >
              <span className={classes.buttonTitle}>{option.label}</span>
              <span className={classes.buttonDescription}>{option.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
