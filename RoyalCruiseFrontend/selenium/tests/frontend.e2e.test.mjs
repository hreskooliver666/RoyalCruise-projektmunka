import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { By, until } from "selenium-webdriver";
import { BASE_URL, createDriver, openPath } from "../support/browser.mjs";

// Selenium smoke tesztek, amelyek a frontend legfontosabb felhasznaloi utvonalait ellenorzik.
describe("RoyalCruise frontend Selenium smoke", () => {
  let driver;

  // Egyetlen browser drivert indit a teljes tesztcsoporthoz.
  before(async () => {
    driver = await createDriver();
  });

  // Minden teszt elott tiszta kliens oldali allapotot allit be (url, storage, cookie).
  beforeEach(async () => {
    await openPath(driver, "/");
    await driver.executeScript("window.localStorage.clear(); window.sessionStorage.clear();");
    await driver.manage().deleteAllCookies();
  });

  // A tesztcsoport vegen leallitja a browser peldanyt.
  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // Ellenorzi, hogy a fooldal betoltodik, latszik a hero cim es a Hajoutak fo navigacios link.
  test("home page loads with hero title and main navigation", async () => {
    await openPath(driver, "/");

    const heroTitle = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(., 'ROYALCRUISE')]")),
      15000
    );

    assert.equal(await heroTitle.isDisplayed(), true);

    const routesLink = await driver.findElement(By.linkText("Hajóutak"));
    assert.equal(await routesLink.isDisplayed(), true);
  });

  // Ellenorzi, hogy ismeretlen URL-en a 404 oldal jelenik meg, es onnan vissza lehet lepni a fooldalra.
  test("unknown URL renders 404 page and can navigate back home", async () => {
    await openPath(driver, "/asdasd");

    const notFoundHeading = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(., 'Oldal nem található')]")),
      10000
    );
    assert.equal(await notFoundHeading.isDisplayed(), true);

    const code = await driver.findElement(By.xpath("//*[contains(normalize-space(.), '404')]"));
    assert.equal(await code.isDisplayed(), true);

    const backButton = await driver.findElement(
      By.xpath("//a[contains(normalize-space(.), 'Vissza a főoldalra')]")
    );
    await backButton.click();

    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return url === `${BASE_URL}/` || url === BASE_URL;
    }, 10000);
  });

  // Ellenorzi, hogy a vedett /profile utvonal bejelentkezes nelkul automatikusan a login oldalra iranyit.
  test("protected profile route redirects unauthenticated users to login", async () => {
    await openPath(driver, "/profile");

    await driver.wait(async () => {
      const currentUrl = await driver.getCurrentUrl();
      return currentUrl.includes("/login");
    }, 10000);

    const loginTitle = await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(., 'Bejelentkezés')]")),
      10000
    );
    assert.equal(await loginTitle.isDisplayed(), true);
  });

  // Ellenorzi, hogy a hamburger menun keresztul elerheto es megnyithato a regiok oldala.
  test("hamburger menu can navigate to regions page", async () => {
    await openPath(driver, "/");

    const hamburger = await driver.wait(
      until.elementLocated(By.css("div[class*='hamburger']")),
      10000
    );
    await hamburger.click();

    const regionsMenuButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(normalize-space(.), 'Régiók')]")),
      8000
    );
    await regionsMenuButton.click();

    await driver.wait(async () => {
      const currentUrl = await driver.getCurrentUrl();
      return currentUrl.includes("/regions");
    }, 10000);
  });

  // Ellenorzi, hogy nagy gorgetes utan megjelenik a fel-gomb es kattintasra visszavisz a lap tetejere.
  test("scroll-to-top button becomes visible and scrolls back to page top", async () => {
    await openPath(driver, "/");

    await driver.executeScript("window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });");

    const scrollTopButton = await driver.wait(
      until.elementLocated(By.css("button[aria-label='Ugrás az oldal tetejére']")),
      10000
    );

    await driver.wait(async () => {
      const opacity = await driver.executeScript(
        "return window.getComputedStyle(arguments[0]).opacity;",
        scrollTopButton
      );
      return Number(opacity) > 0.9;
    }, 8000);

    await scrollTopButton.click();

    await driver.wait(async () => {
      const top = await driver.executeScript(
        "return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;"
      );
      return Number(top) <= 24;
    }, 8000);
  });

  // Ellenorzi a regressziot: talal egy epp futo utat, ahol legalabb 2 indulasi opcio latszik,
  // es ellenorzi, hogy a 2. indulasi varos tenylegesen kivalaszthato.
  test("RouteDetail allows selecting the second departure city when enough future city stops exist", async () => {
    await openPath(driver, "/routes");

    const routeCards = await driver.wait(
      until.elementsLocated(By.css("div[class*='card']")),
      15000
    );
    const routeCardCount = routeCards.length;

    let hasCandidateRoute = false;

    for (let cardIndex = 0; cardIndex < routeCardCount; cardIndex += 1) {
      const currentRouteCards = await driver.findElements(By.css("div[class*='card']"));
      if (cardIndex >= currentRouteCards.length) {
        break;
      }

      const routeCard = currentRouteCards[cardIndex];
      const hasInTransitBadge = await routeCard.findElements(
        By.xpath(".//*[contains(normalize-space(.), 'Úton van a hajó')]")
      );

      if (!hasInTransitBadge.length) {
        continue;
      }

      await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", routeCard);
      await routeCard.click();

      await driver.wait(async () => {
        const currentUrl = await driver.getCurrentUrl();
        return currentUrl.includes("/route/");
      }, 10000);

      const departureOptions = await driver.executeScript(
        "const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Induló város')); const select = label ? label.querySelector('select') : null; return select ? Array.from(select.options).map((option) => option.value) : [];"
      );

      if (departureOptions.length >= 2) {
        const secondOptionValue = departureOptions[1];
        await driver.executeScript(
          "const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Induló város')); const select = label ? label.querySelector('select') : null; if (!select) return false; select.value = arguments[0]; select.dispatchEvent(new Event('change', { bubbles: true })); return true;",
          secondOptionValue
        );

        await driver.wait(async () => {
          const selectedValue = await driver.executeScript(
            "const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Induló város')); const select = label ? label.querySelector('select') : null; return select ? select.value : '';"
          );
          return selectedValue === secondOptionValue;
        }, 6000);

        hasCandidateRoute = true;
        break;
      }

      await openPath(driver, "/routes");
      await driver.wait(until.elementsLocated(By.css("div[class*='card']")), 15000);
    }

    assert.equal(
      hasCandidateRoute,
      true,
      "No in-transit route with at least 2 departure options was found for this regression check"
    );
  });
});
