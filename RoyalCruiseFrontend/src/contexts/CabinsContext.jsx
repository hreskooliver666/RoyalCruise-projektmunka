// Ez a fájl a kabinadatok megosztásához használt React Context objektumot definiálja.
import { createContext } from "react";

const CabinsContext = createContext({
  cabins: [],
  isLoading: true,
  error: null,
});

export default CabinsContext;
