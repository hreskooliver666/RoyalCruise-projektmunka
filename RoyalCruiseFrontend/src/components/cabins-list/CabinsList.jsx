// Ez a fájl a kabincsomagok kártyás listázását és kiválasztási interakcióját tartalmazza.
import { useNavigate } from "react-router-dom";
import useCabins from "../../hooks/useCabins.jsx";
import Card from "../../ui/Card.jsx";
import formatPrice from "../../utils/formatPrice.js";
import classes from "./CabinsList.module.css";

const CABIN_IMAGE_FALLBACKS = {
  standard: "/assets/images/StandardSzoba.png",
  deluxe: "/assets/images/DeluxeSzoba.png",
  suite: "/assets/images/SuiteSzoba.png",
};

function getCabinImage(cabin) {
  const typeKey = String(cabin?.type || cabin?.name || "").toLowerCase();
  return CABIN_IMAGE_FALLBACKS[typeKey] || cabin?.image || "";
}

function getCabinCapacity(cabin) {
  return 10;
}

// A CabinsList komponens a rendelkezésre álló kabinokat megjeleníti, és a felhasználót a részletes oldalra navigálja.
export default function CabinsList({ cabinsOverride }) {
  const { cabins, isLoading, error } = useCabins();
  const navigate = useNavigate();

  const list = cabinsOverride ?? cabins;
  const usingOverride = Boolean(cabinsOverride);

  if (!usingOverride && isLoading) return <p style={{ padding: "1rem" }}>Betöltés...</p>;
  if (!usingOverride && error) return <p style={{ padding: "1rem" }}>Hiba: {error}</p>;
  if (!list || list.length === 0)
    return <p style={{ padding: "1rem" }}>Nincs a feltételeknek megfelelő kabin.</p>;

  return (
    <div className={classes.grid}>
      {list.map((cabin) => (
        <Card key={cabin.id} onClick={() => navigate(`/cabins/${cabin.id}`)}>
          <div className={classes.imageWrapper}>
            <img src={getCabinImage(cabin)} alt={cabin.name} />
            <span className={classes.badge}>{cabin.type}</span>
          </div>
          <div className={classes.content}>
            <h3>{cabin.name}</h3>
            <p className={classes.desc}>{cabin.description}</p>
            <div className={classes.meta}>
              <span>{getCabinCapacity(cabin)} fő</span>
              <span className={classes.price}>+{formatPrice(cabin.pricePerNight)} felár</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
