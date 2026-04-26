// Ez a fájl a vállalat történetét bemutató oldal idővonalszerű tartalmát és blokkstruktúráját tartalmazza.
import classes from "./CompanyStory.module.css";

const timeline = [
  {
    year: "2004",
    title: "Kezdetek Budapesten",
    text: "A RoyalCruise egy családi vállalkozásként indult, kezdetben exkluzív dunai utak szervezésével.",
  },
  {
    year: "2011",
    title: "Nemzetközi nyitás",
    text: "Elindultak mediterrán és adriai útvonalaink, saját partnerhajókkal és magyar nyelvű személyzettel.",
  },
  {
    year: "2018",
    title: "Prémium flotta",
    text: "Flottánk modernizálása során bevezettük az új generációs, környezetkímélő hajókat.",
  },
  {
    year: "2026",
    title: "Élményközpontú korszak",
    text: "A hangsúly a teljes utasélményre került: személyre szabott programok, wellness és gasztronómia.",
  },
];

const ships = [
  {
    name: "RC Aurora",
    route: "Mediterrán körutak",
    details:
      "Panorámás lakosztályok, fedélzeti spa, gourmet étterem és esti showműsorok. Ideális pároknak és első hajóutasoknak.",
    capacity: "2 450 utas",
    crew: "920 fős személyzet",
    decks: "14 vendégfedélzet",
    cabins: "Belső, ablakos, erkélyes és prémium lakosztály",
    features: [
      "Infinity medence tengerre néző napozóterasszal",
      "Fine dining koncepció három tematikus étteremmel",
      "Élőzene és Broadway-stílusú esti produkciók",
    ],
  },
  {
    name: "RC Horizon",
    route: "Északi és balti felfedező utak",
    details:
      "Jégbiztos hajótest, téli kertek, csendes lounge zónák és prémium kabinok. Kifejezetten hosszabb, kényelmes felfedező utakra tervezve.",
    capacity: "1 980 utas",
    crew: "840 fős személyzet",
    decks: "12 vendégfedélzet",
    cabins: "Ablakos kabinok, panoráma lakosztályok, connecting családi opciók",
    features: [
      "Megfigyelő fedélzet 360°-os kilátással",
      "Téli wellness zóna szaunavilággal",
      "Gasztroprogramok helyi, északi alapanyagokra építve",
    ],
  },
  {
    name: "RC Serenita",
    route: "Adria és görög szigetek",
    details:
      "Családbarát programok, gyerekklub, különleges kulináriai estek és privát teraszok. Nyugodt ritmusú, élménydús útvonalakhoz ajánlott.",
    capacity: "2 180 utas",
    crew: "880 fős személyzet",
    decks: "13 vendégfedélzet",
    cabins: "Standard és superior kabinok, családi lakosztályok, exkluzív terrace suite",
    features: [
      "Egész napos gyerek- és tinédzserprogramok",
      "Regionális ízekre épülő vacsoraestek",
      "Privát beach transzferek több kikötőben",
    ],
  },
];

const shipFacts = [
  {
    title: "Fedélzeti kényelem",
    text: "Minden hajónkon modern légkondicionált közösségi terek, gyors Wi-Fi, csendes pihenőzónák és 24 órás recepció működik.",
  },
  {
    title: "Gasztronómia",
    text: "A büfé, az à la carte éttermek és a tematikus estek kombinációja miatt a klasszikus és a különleges étrendi igények is biztosan lefedhetők.",
  },
  {
    title: "Biztonság és egészség",
    text: "Fedélzeti orvosi pont, rendszeres biztonsági gyakorlat, korszerű navigációs rendszer és dedikált vendégkapcsolati csapat támogatja az utazást.",
  },
];

const highlights = [
  "24/7 magyar nyelvű ügyfélszolgálat",
  "Orvosi ügyelet és biztonsági protokollok minden fedélzeten",
  "Rugalmas programok: aktív kirándulásoktól a nyugodt wellness napokig",
  "Fenntartható üzemeltetés: energiahatékony rendszerek és hulladékcsökkentés",
  "Tapasztalt személyzet, nemzetközi minősítéssel",
  "Akár személyre szabott céges és VIP útvonalak szervezése",
];

// A CompanyStory oldal kronologikusan mutatja be a cég fejlődésének fő állomásait.
export default function CompanyStory() {
  return (
    <div className={classes.page}>
      <section className={classes.heroSection}>
        <div className={classes.heroContent}>
          <h1>Rólunk - A RoyalCruise története</h1>
          <p>
            Ismerd meg, hogyan lettünk a magyar hajóutak egyik meghatározó szereplői,
            milyen hajókkal utazunk, és mitől lesz különleges minden utunk.
          </p>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.sectionContent}>
          <h2>Cégünk története</h2>
          <div className={classes.timelineGrid}>
            {timeline.map((item) => (
              <article key={item.year} className={classes.timelineCard}>
                <span className={classes.yearBadge}>{item.year}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={classes.sectionAlt}>
        <div className={classes.sectionContent}>
          <h2>Hajóink részletesen</h2>
          <div className={classes.shipGrid}>
            {ships.map((ship) => (
              <article key={ship.name} className={classes.shipCard}>
                <h3>{ship.name}</h3>
                <p className={classes.shipRoute}>{ship.route}</p>
                <p>{ship.details}</p>
                <div className={classes.shipMeta}>
                  <span>{ship.capacity}</span>
                  <span>{ship.crew}</span>
                  <span>{ship.decks}</span>
                </div>
                <p className={classes.shipCabins}>
                  <strong>Kabinkínálat:</strong> {ship.cabins}
                </p>
                <ul className={classes.shipFeatures}>
                  {ship.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.sectionContent}>
          <h2>További tudnivalók a flottáról</h2>
          <div className={classes.factsGrid}>
            {shipFacts.map((fact) => (
              <article key={fact.title} className={classes.factCard}>
                <h3>{fact.title}</h3>
                <p>{fact.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.sectionContent}>
          <h2>Ami miatt az utasaink minket választanak</h2>
          <div className={classes.highlightGrid}>
            {highlights.map((point) => (
              <div key={point} className={classes.highlightItem}>
                <span className={classes.check}>✓</span>
                <p>{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={classes.ctaSection}>
        <div className={classes.sectionContent}>
          <h2>Nézz körül, vagy lépj velünk kapcsolatba</h2>
          <p>
            Ha szeretnél többet tudni szolgáltatásainkról, örömmel segítünk a megfelelő hajóút
            kiválasztásában.
          </p>
          <div className={classes.ctaButtons}>
            <a href="/routes" className={classes.primaryBtn}>Aktuális hajóutak</a>
            <a href="/about" className={classes.secondaryBtn}>Kapcsolatok oldal</a>
          </div>
        </div>
      </section>
    </div>
  );
}
