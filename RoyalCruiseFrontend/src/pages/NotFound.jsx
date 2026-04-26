// Ez a fájl a nem létező útvonalakhoz tartozó 404-es hibaoldal megjelenítését tartalmazza.
import { Link } from "react-router-dom";
import classes from "./NotFound.module.css";

// A NotFound oldal egyértelmű visszajelzést ad a hibás URL-ről, és visszavezet a fő navigációba.
export default function NotFound() {
  return (
    <section className={classes.page}>
      <div className={classes.card}>
        <p className={classes.code}>404</p>
        <h1>Oldal nem található</h1>
        <p className={classes.text}>
          Az általad keresett oldal nem létezik, vagy már áthelyeztük.
        </p>
        <Link to="/" className={classes.button}>
          Vissza a főoldalra
        </Link>
      </div>
    </section>
  );
}