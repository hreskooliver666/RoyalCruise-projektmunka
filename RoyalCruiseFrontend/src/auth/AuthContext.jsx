// Ez a fájl a bejelentkezett felhasználó adatait és auth műveleteit hordozó React Contextet deklarálja.
import { createContext } from "react";

const AuthContext = createContext({
  user: null,
  isAdmin: false,
  authLoading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  refreshSession: async () => {},
});

export default AuthContext;
