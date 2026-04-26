// Ez a fájl egy újrahasznosítható kártya UI-komponenst ad egységes stílussal és opcionális kattintási kezeléssel.
import classes from "./Card.module.css";

// A Card komponens közös vizuális keretet ad a benne lévő tartalomnak, és opcionálisan kattinthatóvá teszi a blokkot.
export default function Card({ children, onClick }) {
  return (
    <article className={classes.card} onClick={onClick}>
      {children}
    </article>
  );
}
