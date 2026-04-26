// Ez a fájl egy kényelmi hookot ad, amely biztonságosan kiolvassa a kabin context aktuális értékét.
import { useContext } from "react";
import CabinsContext from "../contexts/CabinsContext.jsx";

// A useCabins hook visszaadja a CabinsContext értékét, és hibát dob, ha provideren kívül használják.
export default function useCabins() {
  return useContext(CabinsContext);
}
