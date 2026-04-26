import { vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AllRoutes from "./AllRoutes.jsx";
import {
  getAllRoutes,
  getDestinations,
  getRouteGroups,
  searchRoutesWithFallback,
} from "../api/routesApi.js";
import { getFirstBookableRouteOccurrence } from "../utils/routeStopSchedule.js";

// Az API-réteget teljesen mockoljuk, hogy a tesztek determinisztikusan,
// hálózati függés nélkül, kizárólag a komponens oldali szűrési logikát ellenőrizzék.
vi.mock("../api/routesApi.js", () => ({
  getAllRoutes: vi.fn(),
  getDestinations: vi.fn(),
  getRouteGroups: vi.fn(),
  searchRoutesWithFallback: vi.fn(),
}));

// Reprezentatív route-minta, amely tartalmaz:
// - több hajótípust,
// - több célállomást és route-csoportot,
// - rövid (potenciálisan nem foglalható) és hosszabb útvonalakat,
// így a szűrési és megjelenítési szabályok valószerűen tesztelhetők.
const BASE_ROUTES = [
  {
    id: 1,
    name: "Mediterran Korut A",
    routeName: "Mediterran Kor",
    destination: "Mediterran",
    stops: ["Barcelona", "Marseille", "Roma"],
    date: "2026-05-05",
    shipName: "RC Aurora",
    price: 1200,
    image: "/assets/images/placeholder.jpg",
    availableSeats: 24,
    onboardPrograms: ["Program A", "Program B", "Program C"],
  },
  {
    id: 2,
    name: "Mediterran Korut B",
    routeName: "Mediterran Kor",
    destination: "Mediterran",
    stops: ["Barcelona", "Napoly", "Valencia"],
    date: "2026-05-08",
    shipName: "RC Horizon",
    price: 1400,
    image: "/assets/images/placeholder.jpg",
    availableSeats: 18,
    onboardPrograms: ["Program D", "Program E", "Program F"],
  },
  {
    id: 3,
    name: "Adria Korut",
    routeName: "Adria Kor",
    destination: "Adria",
    stops: ["Velence", "Dubrovnik", "Korfu"],
    date: "2026-06-02",
    shipName: "RC Serenita",
    price: 1600,
    image: "/assets/images/placeholder.jpg",
    availableSeats: 10,
    onboardPrograms: ["Program G", "Program H", "Program I"],
  },
  {
    id: 4,
    name: "Rovid Korut",
    routeName: "Rovid Kor",
    destination: "Mediterran",
    stops: ["Palermo", "Catania"],
    date: "2026-05-01",
    shipName: "RC Aurora",
    price: 1000,
    image: "/assets/images/placeholder.jpg",
    availableSeats: 8,
    onboardPrograms: ["Program J", "Program K", "Program L"],
  },
  {
    id: 5,
    name: "Atfuto Korut",
    routeName: "Atfuto Kor",
    destination: "Mediterran",
    stops: ["Athén", "Mykonos", "Rodosz"],
    date: "2026-04-20",
    shipName: "RC Horizon",
    price: 1300,
    image: "/assets/images/placeholder.jpg",
    availableSeats: 12,
    onboardPrograms: ["Program M", "Program N", "Program O"],
  },
  {
    id: 6,
    name: "Aktiv Foglalhato Korut",
    routeName: "Aktiv Kor",
    destination: "Mediterran",
    stops: ["Athén", "Heraklion", "Mykonos", "Rodosz", "Limassol"],
    date: "2026-04-23",
    shipName: "RC Horizon",
    price: 1500,
    image: "/assets/images/placeholder.jpg",
    availableSeats: 22,
    onboardPrograms: ["Program P", "Program Q", "Program R"],
  },
];

function renderAllRoutes() {
  return render(
    <MemoryRouter initialEntries={["/routes"]}>
      <Routes>
        <Route path="/routes" element={<AllRoutes />} />
      </Routes>
    </MemoryRouter>
  );
}

// Ez a seged osszekapcsolja a label szoveget a mellette levo select elemmel.
function getSelectByLabel(labelText) {
  const label = screen.getByText(labelText);
  return label.parentElement.querySelector("select");
}

// Ez a segédfüggvény a select összes opciójának látható szövegét adja vissza,
// így egyszerűen ellenőrizhető, milyen választási lehetőségek érhetők el a felületen.
function getOptionTexts(selectElement) {
  return Array.from(selectElement.querySelectorAll("option")).map((option) => option.textContent?.trim());
}

// Ez a segédfüggvény a megjelenített route-kártyák címeit adja vissza a DOM aktuális sorrendjében.
// A rendezés ellenőrzésénél ebből dolgozunk, mert ez tükrözi pontosan azt, amit a felhasználó lát.
function getRenderedRouteTitles() {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent?.trim())
    .filter(Boolean);
}

// Egyszerű lookup a mintaadatokhoz: a képernyőn látott route-címhez tartozó mock-route rekordot adja vissza.
function getRouteByTitle(title) {
  return BASE_ROUTES.find((route) => route.name === title);
}

function addDays(isoDate, days) {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().split("T")[0];
}

// A blokk célja az AllRoutes oldali szűrés + hajótípus-opciók regresszióvédelme:
// ezek a tesztek biztosítják, hogy a korábbi hibák (eltűnő opciók, hibás route-megjelenítés)
// későbbi refaktor után se térjenek vissza.
describe("AllRoutes ship type filtering", () => {
  // Minden teszt előtt újrainicializáljuk a mockokat, hogy a tesztek függetlenek maradjanak.
  // Itt állítjuk be az alap API-válaszokat is, amelyeket az egyes tesztek szükség esetén felülírhatnak.
  beforeEach(() => {
    vi.clearAllMocks();

    getAllRoutes.mockResolvedValue(BASE_ROUTES);
    getDestinations.mockResolvedValue(["Mediterran", "Adria"]);
    getRouteGroups.mockImplementation(async (destination) => {
      if (destination === "Mediterran") return ["Mediterran Kor"];
      if (destination === "Adria") return ["Adria Kor"];
      return [];
    });
    searchRoutesWithFallback.mockResolvedValue(BASE_ROUTES);
  });

  // Ellenőrzi az alapállapotot: szűrés nélkül a Hajótípus mezőben az összes ismert hajó
  // szerepeljen, hogy a felhasználó teljes listából tudjon választani.
  it("shows all ship types before applying filters", async () => {
    renderAllRoutes();

    const shipSelect = getSelectByLabel("Hajótípus");

    await waitFor(() => {
      const options = getOptionTexts(shipSelect);
      expect(options).toContain("RC Aurora");
      expect(options).toContain("RC Horizon");
      expect(options).toContain("RC Serenita");
    });
  });

  // Ellenőrzi, hogy célállomás + útvonal szűrés után a hajótípus-opciók ne szűküljenek túl:
  // ha egy route-csoporthoz több hajó tartozik, akkor mindegyik maradjon elérhető választásként.
  it("keeps all relevant ship types after destination + route filtering", async () => {
    searchRoutesWithFallback.mockResolvedValue([BASE_ROUTES[0]]);

    renderAllRoutes();

    const destinationSelect = getSelectByLabel("Utazási cél");
    const routeSelect = getSelectByLabel("Útvonal");
    const shipSelect = getSelectByLabel("Hajótípus");

    await waitFor(() => {
      const destinationOptions = getOptionTexts(destinationSelect);
      expect(destinationOptions).toContain("Mediterran");
    });

    await userEvent.selectOptions(destinationSelect, "Mediterran");

    await waitFor(() => {
      const routeOptions = getOptionTexts(routeSelect);
      expect(routeOptions).toContain("Mediterran Kor");
    });

    await userEvent.selectOptions(routeSelect, "Mediterran Kor");
    await userEvent.click(screen.getByRole("button", { name: "Szűrés alkalmazása" }));

    await waitFor(() => {
      expect(searchRoutesWithFallback).toHaveBeenCalled();
    });

    await waitFor(() => {
      const shipOptions = getOptionTexts(shipSelect);
      expect(shipOptions).toContain("RC Aurora");
      expect(shipOptions).toContain("RC Horizon");
      expect(shipOptions).not.toContain("RC Serenita");
    });
  });

  // Ellenőrzi a mezőkonzisztenciát: ha a korábban kiválasztott hajótípus az új szűrők mellett
  // már nem releváns, a komponens automatikusan nullázza a kiválasztást,
  // így nem marad beragadt, érvénytelen filter állapot.
  it("resets selected ship type when it becomes unavailable", async () => {
    renderAllRoutes();

    const destinationSelect = getSelectByLabel("Utazási cél");
    const shipSelect = getSelectByLabel("Hajótípus");

    await waitFor(() => {
      const shipOptions = getOptionTexts(shipSelect);
      expect(shipOptions).toContain("RC Horizon");
    });

    await userEvent.selectOptions(shipSelect, "RC Horizon");
    expect(shipSelect.value).toBe("RC Horizon");

    await userEvent.selectOptions(destinationSelect, "Adria");

    await waitFor(() => {
      expect(shipSelect.value).toBe("");
      const shipOptions = getOptionTexts(shipSelect);
      expect(shipOptions).toContain("RC Serenita");
      expect(shipOptions).not.toContain("RC Horizon");
    });
  });

  // Ellenőrzi az új üzleti szabályt: a route-kártya akkor sem tűnik el,
  // ha az aktuális forduló már nem foglalható, amennyiben létezik a route-hoz
  // későbbi, legközelebbi foglalható indulás.
  it("shows route card when a nearest future bookable departure exists", async () => {
    renderAllRoutes();

    await waitFor(() => {
      expect(screen.getByText("Rovid Korut")).toBeTruthy();
    });
  });

  // Ellenőrzi a fallback kiválasztás helyességét olyan route esetén,
  // ahol az aktuális ciklus nem foglalható: a kártya továbbra is megjelenik,
  // és tartalmaz legközelebbi indulás blokkot (nem üres/hibás előfordulásra mutat).
  it("shows nearest future bookable departure when current cycle is not bookable", async () => {
    renderAllRoutes();

    await waitFor(() => {
      expect(screen.getByText("Atfuto Korut")).toBeTruthy();
    });

    expect(screen.getAllByText("Legközelebbi indulás").length).toBeGreaterThan(0);
  });

  // Ellenőrzi a kritikus élő esetet: ha a hajó jelenleg úton van,
  // és a mai nap után még legalább két városi megálló marad, akkor az adott route
  // nem váltható le indokolatlanul későbbi fordulóra, hanem látható marad aktuálisként.
  it("keeps currently in-transit and bookable routes visible", async () => {
    renderAllRoutes();

    await waitFor(() => {
      expect(screen.getByText("Aktiv Foglalhato Korut")).toBeTruthy();
    });

    expect(screen.getAllByText("Úton van a hajó").length).toBeGreaterThan(0);
  });

  // Ellenőrzi, hogy a rendezés panelben az ár szerinti növekvő és csökkenő mód
  // valóban a route.price mező szerint rendezi a kártyákat.
  it("sorts route cards by price in ascending and descending order", async () => {
    renderAllRoutes();

    const sortSelect = getSelectByLabel("Rendezés");

    await waitFor(() => {
      expect(getRenderedRouteTitles().length).toBeGreaterThan(1);
    });

    await userEvent.selectOptions(sortSelect, "priceAsc");

    const ascTitles = getRenderedRouteTitles();
    const ascPrices = ascTitles.map((title) => getRouteByTitle(title)?.price);
    const expectedAscPrices = [...ascPrices].sort((a, b) => a - b);
    expect(ascPrices).toEqual(expectedAscPrices);

    await userEvent.selectOptions(sortSelect, "priceDesc");

    const descTitles = getRenderedRouteTitles();
    const descPrices = descTitles.map((title) => getRouteByTitle(title)?.price);
    const expectedDescPrices = [...descPrices].sort((a, b) => b - a);
    expect(descPrices).toEqual(expectedDescPrices);
  });

  // Ellenőrzi, hogy a név szerinti rendezésnél a localeCompare("hu") szerinti
  // alfabetikus növekvő/csökkenő sorrend jelenik meg.
  it("sorts route cards by name in Hungarian ascending and descending order", async () => {
    renderAllRoutes();

    const sortSelect = getSelectByLabel("Rendezés");

    await waitFor(() => {
      expect(getRenderedRouteTitles().length).toBeGreaterThan(1);
    });

    await userEvent.selectOptions(sortSelect, "nameAsc");

    const ascTitles = getRenderedRouteTitles();
    const expectedAscTitles = [...ascTitles].sort((a, b) => a.localeCompare(b, "hu"));
    expect(ascTitles).toEqual(expectedAscTitles);

    await userEvent.selectOptions(sortSelect, "nameDesc");

    const descTitles = getRenderedRouteTitles();
    const expectedDescTitles = [...descTitles].sort((a, b) => b.localeCompare(a, "hu"));
    expect(descTitles).toEqual(expectedDescTitles);
  });

  // Ellenőrzi a dátum-rendezés irányát: az alapértelmezett dateAsc sorrend
  // után dateDesc-re váltva a lista a legkésőbbi indulásoktól halad a korábbiak felé.
  // Az elvárt sorrendet ugyanazzal az occurrence-kiválasztási logikával számoljuk,
  // mint amit a komponens használ (getFirstBookableRouteOccurrence).
  it("sorts route cards by occurrence date in descending order", async () => {
    renderAllRoutes();

    const sortSelect = getSelectByLabel("Rendezés");

    await waitFor(() => {
      expect(getRenderedRouteTitles().length).toBeGreaterThan(1);
    });

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const expectedDateDescTitles = BASE_ROUTES
      .map((route) => ({
        route,
        occurrence: getFirstBookableRouteOccurrence(route, todayIso, todayIso, 2),
      }))
      .filter((entry) => Boolean(entry.occurrence))
      .sort((left, right) => String(left.occurrence.startDate).localeCompare(String(right.occurrence.startDate)))
      .sort((left, right) => String(right.occurrence.startDate).localeCompare(String(left.occurrence.startDate)))
      .map((entry) => entry.route.name);

    await userEvent.selectOptions(sortSelect, "dateDesc");

    const dateDescTitles = getRenderedRouteTitles();
    expect(dateDescTitles).toEqual(expectedDateDescTitles);
  });

  // Ellenőrzi a dátummezők üzleti szabályát a /routes oldalon:
  // - indulásnál nincs múltbeli dátum (min = ma),
  // - érkezésnél indulás nélkül is min = ma,
  // - indulás kiválasztása után érkezés min = indulás + 1 nap,
  // - ha már volt kiválasztott érkezési dátum, és az indulást későbbre állítjuk,
  //   akkor az érkezés automatikusan korrigálódik (indulás + 1 napra).
  it("enforces non-past dates and minimum one-day arrival gap", async () => {
    renderAllRoutes();

    const startInput = screen.getByLabelText("Indulás dátuma");
    const endInput = screen.getByLabelText("Érkezés dátuma");

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const initialEndDate = addDays(todayIso, 5);
    const nextStartDate = initialEndDate;
    const minimumArrival = addDays(nextStartDate, 1);

    expect(startInput.getAttribute("min")).toBe(todayIso);
    expect(endInput.getAttribute("min")).toBe(todayIso);

    await act(async () => {
      fireEvent.change(endInput, { target: { value: initialEndDate } });
    });
    expect(endInput.value).toBe(initialEndDate);

    await act(async () => {
      fireEvent.change(startInput, { target: { value: nextStartDate } });
    });

    expect(endInput.getAttribute("min")).toBe(minimumArrival);
    expect(endInput.value).toBe(minimumArrival);
  });
});
