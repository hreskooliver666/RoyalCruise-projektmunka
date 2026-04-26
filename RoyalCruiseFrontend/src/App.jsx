// Ez a fájl az alkalmazás fő útvonalait és jogosultság-alapú védelmét szervezi egy központi belépési komponensben.
import { Routes, Route, Navigate } from "react-router-dom";
import AllRoutes from "./pages/AllRoutes.jsx";
import Layout from "./Layout.jsx";
import Home from "./pages/Home.jsx";
import Cabins from "./pages/Cabins.jsx";
import CabinDetail from "./pages/CabinDetail.jsx";
import Login from "./pages/Login.jsx";
import LoginSuccess from "./pages/LoginSuccess.jsx";
import Register from "./pages/Register.jsx";
import useAuth from "./auth/useAuth.jsx";
import ScrollToTop from "./ScrollToTop.jsx";
import RecommendedRoute from "./pages/RecommendedRoute.jsx";
import Regions from "./pages/Regions.jsx";
import RegionDetail from "./pages/RegionDetail.jsx";
import RouteDetail from "./pages/RouteDetail.jsx";
import BookingSummary from "./pages/BookingSummary.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminBookings from "./pages/AdminBookings.jsx";
import Profile from "./pages/Profile.jsx";
import About from "./pages/About.jsx";
import CruiseGuide from "./pages/CruiseGuide.jsx";
import CompanyStory from "./pages/CompanyStory.jsx";
import NotFound from "./pages/NotFound.jsx";

// Ez a komponens dönti el, hogy a bejelentkezett felhasználó elérheti-e a védett oldalakat.
// Ez a komponens csak bejelentkezett felhasználóknak engedi a védett oldalak megnyitását.
function ProtectedRoute({ children }) {
  // 1) Auth állapot kiolvasása és betöltés közbeni várakoztatás.
  const { user, authLoading } = useAuth();
  if (authLoading) return <p style={{ padding: "1rem" }}>Betöltés...</p>;
  // 2) Nem hitelesített felhasználó átirányítása a belépési oldalra.
  if (!user) return <Navigate to="/login" replace />;
  // 3) Jogosult esetben a védett tartalom renderelése.
  return children;
}

// Ez a komponens csak az admin felhasználók számára engedi meg az admin felületek megnyitását.
// Ez a komponens csak admin jogosultsággal engedi az admin oldalak elérését.
function AdminRoute({ children }) {
  // 1) Auth és admin szerepkör állapotának kiolvasása.
  const { user, isAdmin, authLoading } = useAuth();
  if (authLoading) return <p style={{ padding: "1rem" }}>Betöltés...</p>;
  // 2) Nem bejelentkezett felhasználó visszairányítása.
  if (!user) return <Navigate to="/login" replace />;
  // 3) Nem admin felhasználó elterelése a főoldalra.
  if (!isAdmin) return <Navigate to="/" replace />;
  // 4) Admin jogosultság esetén a védett admin tartalom renderelése.
  return children;
}

// Az App komponens összerakja a publikus, felhasználói és admin útvonalakat, majd a megfelelő védelmi rétegen keresztül rendereli őket.
export default function App() {
  // 1) Globális layout, görgetéskezelő és útvonalak összefűzése.
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        {/* A főoldal a nyitó tartalmat jeleníti meg. */}
        <Route path="/" element={<Home />} />

        {/* A kabinoldalak a szálláskínálatot és a részleteket mutatják. */}
        <Route path="/cabins" element={<Cabins />} />

        <Route path="/cabins/:id" element={<CabinDetail />} />

        {/* A belépési és regisztrációs oldalak a felhasználói hozzáférést kezelik. */}
        <Route path="/login" element={<Login />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/register" element={<Register />} />

        {/* Az összes hajóutat bemutató oldal a teljes kínálatot listázza. */}
        <Route path="/routes" element={<AllRoutes />} />

        {/* A régióoldalak a hajóutakat földrajzi térség szerint csoportosítják. */}
        <Route path="/regions" element={<Regions />} />
        <Route path="/regions/:regionId" element={<RegionDetail />} />

        {/* Az út részletező oldala egyetlen hajóút teljes adatlapját mutatja. */}
        <Route path="/route/:id" element={<RouteDetail />} />

        {/* A foglalási összegzés a kiválasztott adatok ellenőrzésére szolgál. */}
        <Route path="/booking-summary" element={<BookingSummary />} />

        {/* A profiloldal a saját foglalásokat és fiókadatokat jeleníti meg. */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Az admin felület az üzemeltetői nézetet és műveleteket biztosítja. */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Az admin foglaláskezelő oldal a foglalások kezelését támogatja. */}
        <Route
          path="/admin/bookings"
          element={
            <AdminRoute>
              <AdminBookings />
            </AdminRoute>
          }
        />

        {/* Az ajánlott út részletei a kiemelt útvonalat magyarázzák el. */}
        <Route path="/recommended/:routeId" element={<RecommendedRoute />} />

        {/* Az ismertető oldal a vállalat bemutatására szolgál. */}
        <Route path="/about" element={<About />} />

        {/* A részletes cégsztori oldal háttértörténetet ad a vállalkozásról. */}
        <Route path="/company" element={<CompanyStory />} />

        {/* Az utazási útmutató oldal segít az útvonalak megértésében. */}
        <Route path="/cruise-guide" element={<CruiseGuide />} />

        {/* Az ismeretlen útvonalakat a 404-es oldal kezeli. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
