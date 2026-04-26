// Ez a fájl egy biztonságos hookot ad az auth context eléréséhez a komponensekben.
import { useContext } from "react";
import AuthContext from "./AuthContext.jsx";

// A useAuth hook visszaadja az AuthContext tartalmát, és jelzi a hibás használatot, ha nincs körülötte provider.
export default function useAuth() {
  return useContext(AuthContext);
}
