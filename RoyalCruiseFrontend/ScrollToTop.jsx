// Ez a fájl útvonalváltáskor automatikusan a lap tetejére görgető segédkomponenst tartalmaz.
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// A ScrollToTop komponens figyeli az aktuális útvonalat, és navigáció után visszaállítja a nézetet a tetejére.
export default function ScrollToTop() {
  // 1) Aktuális útvonal figyelése a görgetési pozíció visszaállításához.
  const { pathname } = useLocation();

  // 2) Útvonalváltáskor manuális scroll-restoration beállítás és top pozíció kényszerítése.
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

// Ez a belső függvény azonnal a dokumentum tetejére gördít, amikor az útvonal megváltozik.
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();
    const frameId = window.requestAnimationFrame(scrollToTop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  // 3) Ez a segédkomponens nem renderel látható UI-elemet.
  return null;
}
