// Ez a fájl egy kiválasztott kabincsomag részletes leírását, szolgáltatásait és árazását jeleníti meg.
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCabin } from "../api/cruiseApp.js";
import formatPrice from "../utils/formatPrice.js";
import classes from "./CabinDetail.module.css";

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

// A CabinDetail oldal az URL-ben kapott azonosító alapján betölti és részletesen bemutatja a kiválasztott kabint.
export default function CabinDetail() {
  // 1) URL-paraméter és kabinoldali állapotok inicializálása.
  const { id } = useParams();
  const [cabin, setCabin] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2) Kabinadat betöltése az azonosító alapján, unmount-védett állapotfrissítéssel.
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getCabin(id)
      .then((c) => {
        if (mounted) {
          setCabin(c);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setCabin(null);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <p style={{ padding: "1rem" }}>Betöltés...</p>;
  if (!cabin) return <p style={{ padding: "1rem" }}>A kabin nem található.</p>;

  // 3) Részletes kabinoldal kirajzolása (kép, meta adatok, felszereltség, navigáció).
  return (
    <section className={classes.wrapper}>
      <Link to="/cabins" className={classes.back}>
        &lt; Vissza a kabinokhoz
      </Link>

      <div className={classes.layout}>
        <div className={classes.imageCol}>
          <img src={getCabinImage(cabin)} alt={cabin.name} />
        </div>
        <div className={classes.infoCol}>
          <h1>{cabin.name}</h1>
          <p className={classes.type}>{cabin.type}</p>
          <p className={classes.desc}>{cabin.description}</p>

          <div className={classes.meta}>
            <p>
              <strong>Férőhely:</strong> {getCabinCapacity(cabin)} fő
            </p>
            <p>
              <strong>Felár:</strong> +{formatPrice(cabin.pricePerNight)}
            </p>
          </div>

          <div>
            <h2>Felszereltség</h2>
            <ul className={classes.amenities}>
              {cabin.amenities?.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>

          <Link to="/routes" className={classes.routesButton}>
            Hajóutak megtekintése
          </Link>
        </div>
      </div>
    </section>
  );
}
