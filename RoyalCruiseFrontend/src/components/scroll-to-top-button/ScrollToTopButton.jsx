// Ez a fájl a lebegő „vissza az oldal tetejére” gomb láthatóságát és animált görgetését valósítja meg.
import { useEffect, useState } from "react";
import classes from "./ScrollToTopButton.module.css";

const SHOW_AFTER_PX = 280;

// Ez a segédfüggvény animáltan visszagörgeti az oldalt a tetejére.
function animateScrollToTop() {
  const startPosition = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  const duration = 450;
  const startTime = performance.now();

// Ez a segédfüggvény az animáció simításához a progress értéket easing görbévé alakítja.
  const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);

// Ez a belső léptetőfüggvény képkockánként számolja ki az aktuális görgetési pozíciót az animáció időtartama alatt.
  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const nextPosition = Math.round(startPosition * (1 - easeOutCubic(progress)));

    window.scrollTo(0, nextPosition);

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
}

// A ScrollToTopButton komponens a görgetési pozíció alapján ki- és bekapcsolja a gombot, majd kattintásra animált felgörgetést indít.
export default function ScrollToTopButton() {
  // 1) Láthatósági állapot a görgetési pozíció alapján.
  const [isVisible, setIsVisible] = useState(false);

  // 2) Görgetési és méretváltozási eseményfigyelők regisztrálása/takarítása.
  useEffect(() => {
// Ez a belső függvény a függőleges pozíció alapján eldönti, hogy a gomb látható legyen-e.
    const updateVisibility = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setIsVisible(scrollTop > SHOW_AFTER_PX);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  // 3) Gombkattintásra animált felgörgetés indítása.
// Ez a kattintáskezelő elindítja az animált visszagörgetést a lap tetejére.
  const handleClick = () => {
    animateScrollToTop();
  };

  return (
    <button
      type="button"
      className={`${classes.button} ${isVisible ? classes.visible : ""}`}
      onClick={handleClick}
      aria-label="Ugrás az oldal tetejére"
      title="Ugrás az oldal tetejére"
    >
      ↑
    </button>
  );
}