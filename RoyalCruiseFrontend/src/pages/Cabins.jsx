// Ez az oldalkomponens a kabinok áttekintő nézetét adja: címet, rövid útmutatót és a kabinlista komponenst jelenít meg.
import CabinsList from "../components/cabins-list/CabinsList.jsx";

// A Cabins oldal statikus bevezető szöveget mutat, majd a CabinsList komponensre bízza a konkrét csomagkártyák kirajzolását.
export default function Cabins() {
  return (
    <section>
      <h1>Hajó kabinjai</h1>
      {/* Ez a leírás segít a felhasználónak megérteni, hogy három csomag közül választhat, és kattintással nyithat részleteket. */}
      <p style={{ marginBottom: "1.5rem", color: "#9ca3af", fontSize: "0.95rem" }}>
        Válassz a három elérhető kabincsomag közül: Standard, Deluxe vagy Suite.
        Kattints egy csomagra a részletes leírásért és a tartalom megtekintéséhez.
      </p>
      <CabinsList />
    </section>
  );
}
