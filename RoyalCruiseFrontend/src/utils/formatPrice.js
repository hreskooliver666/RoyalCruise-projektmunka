// Ez a fájl az árak EUR-ból HUF-ba konvertálását és egységes megjelenítési formázását kezeli.
const FALLBACK_EUR_TO_HUF_RATE = 400;
const envRate = Number(import.meta.env.VITE_EUR_TO_HUF_RATE);
export const EUR_TO_HUF_RATE = Number.isFinite(envRate) && envRate > 0
  ? envRate
  : FALLBACK_EUR_TO_HUF_RATE;

export function convertEurToHuf(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round(numericValue * EUR_TO_HUF_RATE);
}

// A formatPrice függvény szám vagy szöveg bemenetből felhasználóbarát, forint alapú ármegjelenítést készít.
export default function formatPrice(value) {
  return `${new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: 0,
  }).format(convertEurToHuf(value))} HUF`;
}
