// Ez a fájl a kabinok betöltését és contexten keresztüli elérhetővé tételét végző provider komponenst tartalmazza.
import { useEffect, useState } from "react";
import CabinsContext from "./CabinsContext.jsx";
import { getAllCabins } from "../api/cruiseApp.js";

// A CabinsProvider komponens betölti a kabinlistát, hibát/állapotot kezel, majd az adatokat contexten keresztül a gyermekkomponenseknek adja.
export default function CabinsProvider({ children }) {
  // 1) Kabinadatokhoz tartozó állapotok inicializálása.
  // Ez az állapot tartja a backendről letöltött kabinlista elemeit a teljes alkalmazás számára.
  const [cabins, setCabins] = useState([]);
  // Ez az állapot jelzi, hogy a kabinok betöltése még folyamatban van-e.
  const [isLoading, setIsLoading] = useState(true);
  // Ez az állapot tárolja a betöltés során keletkező, felületen megjeleníthető hibaüzenetet.
  const [error, setError] = useState(null);

  // 2) Kezdeti kabinbetöltés és biztonságos unmount-kezelés.
  // Ez az effekt egyszer lefutva letölti a kabinadatokat, és megszakítja az állapotfrissítést, ha a komponens időközben unmountolódik.
  useEffect(() => {
    let mounted = true;

    // Ez a belső aszinkron függvény a kabinok lekérését, hibakezelését és loading állapotváltását egy helyen kezeli.
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAllCabins();
        if (mounted) setCabins(data);
      } catch (err) {
        if (mounted) setError(err.message || "Nem sikerült betölteni a kabinokat.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  // 3) Betöltött kabinállapot továbbadása contexten keresztül.
  return (
    <CabinsContext.Provider value={{ cabins, isLoading, error }}>
      {children}
    </CabinsContext.Provider>
  );
}
