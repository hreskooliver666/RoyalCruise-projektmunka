// Selenium alap API: böngészőindítás és driver építés.
import { Builder, Browser } from "selenium-webdriver";
// Chrome-specifikus opciók (headless, argumentumok).
import chrome from "selenium-webdriver/chrome.js";

// Az összes Selenium teszt ebből a base URL-ből indul.
// Felülírható környezeti változóval CI-ben vagy lokális futtatásnál.
export const BASE_URL = process.env.SELENIUM_BASE_URL || "http://127.0.0.1:4173";

// Létrehozza és visszaadja az előkonfigurált Chrome WebDriver példányt.
export async function createDriver() {
  // A Selenium Chrome opciógyűjtő objektuma.
  const options = new chrome.Options();
  // Alapértelmezetten headless módban futtatunk;
  // csak SELENIUM_HEADLESS=false esetén indul grafikus módban.
  const isHeadless = String(process.env.SELENIUM_HEADLESS || "true").toLowerCase() !== "false";

  // Új Chrome headless mód bekapcsolása, ha kért.
  if (isHeadless) {
    options.addArguments("--headless=new");
  }

  // Stabilabb tesztfuttatáshoz szükséges runtime argumentumok.
  options.addArguments(
    // Fix viewport a reprodukálható screenshotokhoz és layout ellenőrzéshez.
    "--window-size=1440,1200",
    // CI környezetben gyakori vizuális / GPU anomáliák csökkentése.
    "--disable-gpu",
    // Konzolzaj csökkentése teszt outputban.
    "--disable-logging",
    "--log-level=3",
    // Konténeres futásnál gyakori jogosultsági probléma megelőzése.
    "--no-sandbox",
    // Alacsony shared memory környezetekben stabilitás javítása.
    "--disable-dev-shm-usage"
  );

  // Driver építés: Chrome böngésző + a fenti opciók.
  return new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(options)
    .build();
}

// Egy relatív útvonalat a BASE_URL-hez illesztve megnyit a driverben.
export async function openPath(driver, path) {
  // Biztosítja, hogy az útvonal / jellel induljon.
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Navigáció a teljes cél URL-re.
  await driver.get(`${BASE_URL}${normalizedPath}`);
}
