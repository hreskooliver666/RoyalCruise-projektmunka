// Ez a fájl a nyitóoldal adatlekérését, kiemelt útvonal-kártyáit és promóciós szekcióit kezeli.
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BookingForm from "../components/booking/BookingForm.jsx";
import { getAllRoutes } from "../api/routesApi.js";
import classes from "./Home.module.css";
import routeClasses from "./Routes.module.css";
import { getShipNameForRoute } from "../utils/routeShipAssignment.js";
import formatPrice from "../utils/formatPrice.js";
import {
  formatStopDate,
  getFirstBookableRouteOccurrence,
  getRouteOnboardPrograms,
} from "../utils/routeStopSchedule.js";

const FALLBACK_QUICK_CITY_FILTERS = [
  { label: "Barcelona", value: "Barcelona" },
  { label: "Róma", value: "Róma" },
  { label: "Velence", value: "Velence" },
  { label: "Dubrovnik", value: "Dubrovnik" },
  { label: "Oslo", value: "Oslo" },
  { label: "Stockholm", value: "Stockholm" },
  { label: "Santorini", value: "Santorini" },
  { label: "Helsinki", value: "Helsinki" },
];

// Ez a segédfüggvény összeállítja a leggyakrabban érintett városok szűrőlistáját.
function getTopTouchedCityFilters(routes, limit = 8) {
  const cityCounts = new Map();

  routes.forEach((route) => {
    const uniqueStops = new Set(Array.isArray(route.stops) ? route.stops.filter(Boolean) : []);
    uniqueStops.forEach((city) => {
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    });
  });

  return Array.from(cityCounts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], "hu");
    })
    .slice(0, limit)
    .map(([city]) => ({ label: city, value: city }));
}

// Ez a segédfüggvény a városnévhez magyar helyhatározói toldalékot illeszt.
function withHungarianLocationSuffix(city) {
  const text = String(city ?? "").trim();
  if (!text) return "";

  const vowels = [...text.toLowerCase()].filter((char) => "aáeéiíoóöőuúüű".includes(char));
  const lastVowel = vowels[vowels.length - 1] || "a";
  const usesBackSuffix = "aáoóuú".includes(lastVowel);
  const suffix = usesBackSuffix ? "ban" : "ben";

  return `${text}-${suffix}`;
}

// Ez a segédfüggvény visszaadja, hogy a kiválasztott út éppen melyik helyszínen tart.
function getCurrentJourneyLocation(schedule, currentStopIndex) {
  if (!Array.isArray(schedule) || currentStopIndex < 0 || currentStopIndex >= schedule.length) {
    return "a Tengeren";
  }

  const currentStop = schedule[currentStopIndex];
  if (currentStop?.isSeaDay) {
    return "a Tengeren";
  }

  return withHungarianLocationSuffix(currentStop?.city);
}

// A Home oldal betölti a kiemelt útvonalakat, régiókat és ajánlatokat, majd ezekből interaktív kezdőfelületet épít.
export default function Home() {
  // 1) Dátum- és URL-kontextus előkészítése.
  // Ez a keresési paraméter olvasó teszi lehetővé, hogy az URL-ből indulási dátumot vegyünk át.
  const [searchParams] = useSearchParams();
  // Ez az alapértelmezett referencia-dátum, amelyre a „legközelebbi indulás” számítás épül.
  const todayIso = new Date().toISOString().split("T")[0];
  // Ez a tényleges referencia-dátum: URL paraméter esetén azt, egyébként a mai napot használja.
  const activeReferenceDate = searchParams.get("startDate") || todayIso;

  // Ez a galéria képlistája, amelyet a nyitóoldali látványszekció lapozható formában jelenít meg.
  const galleryImages = [
    "/assets/images/Hajó1.png",
    "/assets/images/Hajó2.png",
    "/assets/images/Fedelzeti1.png",
    "/assets/images/Fedelzeti2.png",
    "/assets/images/StandardSzoba.png",
    "/assets/images/StandardFürdőszoba.png",
    "/assets/images/DeluxeSzoba.png",
    "/assets/images/DeluxeFürdőszoba.png",
    "/assets/images/DeluxeErkély.png",
    "/assets/images/SuiteSzoba.png",
    "/assets/images/SuiteFürdőszoba.png",
    "/assets/images/SuiteGardrób.png",
    "/assets/images/VR_szoba1.png",
    "/assets/images/VR_szoba2.png",
    "/assets/images/MiniDisco1.png",
    "/assets/images/MiniDisco2.png",
    "/assets/images/Étterem1.png",
    "/assets/images/Étterem2.png"
  ];

  // 2) Lokális állapotok és navigációs segédek inicializálása.
  // Ez a navigációs segéd irányítja a felhasználót részletes oldalakra és szűrt listákra.
  const navigate = useNavigate();
  // Ez az állapot kapcsolja be a nyitó szekció betöltés utáni animációs osztályait.
  const [loaded, setLoaded] = useState(false);
  // Ez az állapot tárolja a nyitóoldalon kártyán megjelenített ajánlott útvonalakat.
  const [recommendedRoutes, setRecommendedRoutes] = useState([]);
  // Ez az állapot a gyors szűrőgombokhoz használt, gyakran érintett városok listáját tartja.
  const [quickCityFilters, setQuickCityFilters] = useState(FALLBACK_QUICK_CITY_FILTERS);

  // 3) Kezdő oldali adatok és animációk betöltése.
  // Ez az effekt rövid késleltetés után aktiválja az oldal belépési animációját.
  useEffect(() => {
    setTimeout(() => setLoaded(true), 50);
  }, []);

  // Ez az effekt betölti az útvonalakat, kiválasztja az ajánlott elemeket, és előállítja a legjobb gyors városszűrőket.
  useEffect(() => {
    getAllRoutes()
      .then((routes) => {
        if (Array.isArray(routes)) {
          // Az ajánlott kártyákhoz az első ténylegesen foglalható előfordulást választjuk ki útvonalanként.
          const recommendedCards = routes
            .map((route) => ({
              route,
              occurrence: getFirstBookableRouteOccurrence(route, activeReferenceDate, todayIso, 2),
            }))
            .filter(({ occurrence }) => Boolean(occurrence))
            .sort((a, b) => String(a.occurrence.startDate || "").localeCompare(String(b.occurrence.startDate || "")))
            .slice(0, 3);

          setRecommendedRoutes(recommendedCards);
          const topFilters = getTopTouchedCityFilters(routes);
          if (topFilters.length) {
            setQuickCityFilters(topFilters);
          }
        }
      })
      .catch(() => {
        setRecommendedRoutes([]);
        setQuickCityFilters(FALLBACK_QUICK_CITY_FILTERS);
      });
  }, [activeReferenceDate, todayIso]);

  // 4) Galériaállapot és lapozó kezelők.
  // Ez az állapot tartja nyilván, hogy a galéria jelenleg melyik képet mutatja.
  const [currentIndex, setCurrentIndex] = useState(0);

// Ez a kezelő a képgalériában a következő elemre léptet körkörös indexeléssel.
  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
  };

// Ez a kezelő a képgalériában az előző elemre léptet körkörös indexeléssel.
  const prevImage = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? galleryImages.length - 1 : prev - 1
    );
  };

  // 5) Felület kirajzolása: hero, történet, foglalás, útvonalak, galéria, ajánlott utak.
  return (
    <>

      <section
        className={`${classes.heroSection} ${loaded ? classes.loaded : ""}`}
      >
        <div className={classes.heroImage}></div>
        <div className={classes.heroOverlay}></div>

        <div className={classes.heroContent}>
          <h1 className={classes.title}>ROYALCRUISE</h1>
          <p className={classes.subtitle}>
            Tengeri utazások és felejthetetlen élmények
          </p>
        </div>
      </section>


            {/* A hajó története */}
<section className={classes.storySection}>
  <div className={classes.storyContent}>
    <h2>A hajó története</h2>
    <p>
      A RoyalCruise zászlóshajója több mint egy évtizede szeli a világ óceánjait,
      és már első útjai óta a luxus, a kényelem és a modern hajózás szimbóluma.
      A hajó tervezésekor a mérnökök célja az volt, hogy egy olyan úszó várost
      hozzanak létre, ahol a vendégek egyszerre élvezhetik a tenger végtelen
      nyugalmát és a szárazföldi szállodák kényelmét. A fedélzeten található
      luxus éttermek, tágas medencék és elegáns kabinok mind azt a célt
      szolgálják, hogy az utazók valóban felejthetetlen élményekkel térjenek
      haza. A RoyalCruise hajója ma már több kontinens kikötőit köti össze,
      miközben minden útján megőrzi azt a különleges hangulatot, amely miatt
      utasai újra és újra visszatérnek.
    </p>
  </div>

  <div className={classes.storyImageWrapper}>
    <img
      src="/assets/images/Hajó2.png"
      alt="RoyalCruise története"
      className={classes.storyImage}
    />
  </div>
</section>

      {/* Foglalási modul */}
      <section className={classes.bookingSection}>
        <h2>Foglalj kabint az óceánra néző szobák egyikébe</h2>
        <p className={classes.lead}>
          Válassz belső, tengerre néző, erkélyes kabinok vagy luxus lakosztályok közül,
          és intézd a foglalást online, pár kattintással.
        </p>
        <div className={classes.bookingPanel}>
          <BookingForm />
        </div>
      </section>

      {/* Mediterrán / Földközi-tengeri hajóutak */}
      <section className={classes.routesSection}>
        <h2>Hajóutak világszerte</h2>
        <p className={classes.routesIntro}>
          Nézd meg az aktuális útvonalakat, időpontokat és árakat egy helyen.
        </p>

      <div className={classes.routesCtaWrapper}>
        <div className={classes.quickCityGrid}>
          {quickCityFilters.map((city) => (
            <button
              key={city.value}
              type="button"
              className={classes.quickCityButton}
              onClick={() =>
                navigate(`/routes?touchedCity=${encodeURIComponent(city.value)}`)
              }
            >
              {city.label}
            </button>
          ))}
        </div>

        <button
          className={classes.routesCtaButton}
          onClick={() => navigate("/routes")}
        >
          Összes hajóút megtekintése
        </button>
      </div>

      </section>

    {/* GALÉRIA */}
    <section className={classes.gallerySection}>
      <h2>Galéria</h2>

      <div className={classes.galleryWrapper}>
        <button className={classes.arrowLeft} onClick={prevImage}>
          ❮
        </button>

        <img
          src={galleryImages[currentIndex]}
          alt="Hajó galéria"
          className={classes.galleryImage}
        />

        <button className={classes.arrowRight} onClick={nextImage}>
          ❯
        </button>
      </div>

      <div className={classes.dots}>
        {galleryImages.map((_, index) => (
          <span
            key={index}
            className={`${classes.dot} ${
              index === currentIndex ? classes.activeDot : ""
            }`}
            onClick={() => setCurrentIndex(index)}
          ></span>
        ))}
      </div>
    </section>



      {/* Ajánlott utak */}
      <section className={classes.recommendedSection}>
        <h2>Ajánlott hajóutak</h2>

        <div className={classes.cardGrid}>
          {recommendedRoutes.map((card) => {
            const route = card.route;
            const occurrence = card.occurrence;
            const schedule = Array.isArray(occurrence?.stopSchedule) ? occurrence.stopSchedule : [];
            const isInTransitToday = Boolean(
              occurrence.startDate &&
              occurrence.endDate &&
              todayIso >= occurrence.startDate &&
              todayIso <= occurrence.endDate
            );
            // Ez a számított érték a mai dátum alapján meghatározza, hogy az aktuális út melyik megállónál tart.
            const currentStopIndex = (() => {
              const exactTodayIndex = schedule.findIndex((stop) => stop?.date === todayIso);
              if (exactTodayIndex !== -1) return exactTodayIndex;
              return -1;
            })();
            const currentJourneyLocation = getCurrentJourneyLocation(schedule, currentStopIndex);
            const onboardPrograms = Array.isArray(route.onboardPrograms) && route.onboardPrograms.length
              ? route.onboardPrograms
              : getRouteOnboardPrograms(route);

            return (
            <div key={route.id} className={`${routeClasses.card} ${classes.verticalRouteCard}`}>
              <div className={`${routeClasses.cardLayout} ${classes.verticalRouteCardLayout}`}>
                <section className={`${routeClasses.leftColumn} ${classes.verticalLeftColumn}`}>
                  <img src={route.image} alt={route.name} />
                  <h3 className={classes.verticalRouteTitle}>{route.name}</h3>
                  <p className={`${routeClasses.regionLabel} ${classes.centeredRegionLabel}`}>{route.destination}</p>
                  <p className={`${routeClasses.routeStops} ${classes.verticalRouteStops}`}>{route.stops?.length ? route.stops.join(" → ") : route.name}</p>
                </section>

                <section className={`${routeClasses.middleColumn} ${classes.verticalMiddleColumn}`}>
                  <div className={`${routeClasses.stopScheduleBlock} ${classes.verticalStopScheduleBlock}`}>
                    <p className={routeClasses.stopScheduleTitle}>Legközelebbi indulás</p>
                    <p className={routeClasses.stopScheduleLead}>
                      {formatStopDate(occurrence.startDate)}
                    </p>
                    <p
                      className={`${routeClasses.inTransitBadge} ${classes.compactTransitBadge} ${!isInTransitToday ? classes.hiddenTransitBadge : ""}`}
                      aria-hidden={!isInTransitToday}
                    >
                      Úton van a hajó
                    </p>
                    {isInTransitToday && currentStopIndex !== -1 ? (
                      <p className={routeClasses.currentStopLabel}>
                        Most <span className={routeClasses.currentStopLocation}>{currentJourneyLocation}</span> jár
                      </p>
                    ) : null}
                    <ul className={`${routeClasses.stopScheduleList} ${classes.verticalStopScheduleList}`}>
                      {schedule.map((stop, index) => (
                        <li
                          key={`${route.id}-${stop.city}-${stop.date}-${index}`}
                          className={[
                            stop.isSeaDay ? routeClasses.seaDayRow : "",
                            index === currentStopIndex ? routeClasses.currentStopRow : "",
                          ].filter(Boolean).join(" ") || undefined}
                        >
                          <span>{stop.city}</span>
                          <span>{formatStopDate(stop.date)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className={`${routeClasses.rightColumn} ${classes.verticalRightColumn}`}>
                  <div className={`${routeClasses.programBlock} ${classes.verticalProgramBlock}`}>
                    <p className={routeClasses.programTitle}>Fedélzeti programok</p>
                    <ul className={`${routeClasses.programList} ${classes.verticalProgramList}`}>
                      {onboardPrograms.slice(0, 3).map((program, programIndex) => (
                        <li key={`${route.id}-program-${programIndex}`}>{program}</li>
                      ))}
                    </ul>
                  </div>
                  <p className={`${routeClasses.shipInfo} ${classes.verticalInfoRow}`}>Hajó: {route.shipName || getShipNameForRoute(route)}</p>
                  <p className={`${routeClasses.shipInfo} ${classes.verticalInfoRow}`}>
                      A szabad helyek számához kattintson a kártyára
                  </p>
                  <span className={`${routeClasses.priceTag} ${classes.verticalPriceTag}`}>{formatPrice(route.price)}-tól</span>
                  <p className={routeClasses.priceNote}>(Az ár a teljes útra vonatkozik!)</p>
                  <button
                    className={classes.detailsBtn}
                    onClick={() => navigate(`/route/${route.id}`, { state: { route, occurrenceReferenceDate: occurrence.startDate || activeReferenceDate || todayIso } })}
                  >
                    További részletek
                  </button>
                </section>
              </div>
            </div>
          );})}
        </div>
      </section>

    </>
  );
}







