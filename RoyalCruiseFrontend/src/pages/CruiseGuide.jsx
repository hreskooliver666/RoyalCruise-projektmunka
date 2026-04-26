// Ez a fájl az utazási útmutató oldal statikus tartalmát és tippekre bontott szerkezetét tartalmazza.
import classes from "./CruiseGuide.module.css";

// A CruiseGuide oldal gyakorlati tanácsokat ad a hajóút előkészítéséhez és fedélzeti eligazodáshoz.
export default function CruiseGuide() {
  return (
    <div className={classes.guideContainer}>
      {/* Hero szekció */}
      <section className={classes.heroSection}>
        <div className={classes.heroContent}>
          <h1>Tudnivalók & Útmutató</h1>
          <p>Minden, amit tudnod kell a tökéletes utazáshoz</p>
        </div>
      </section>

      {/* Ki vagyunk mi */}
      <section className={classes.aboutSection}>
        <div className={classes.sectionContent}>
          <h2>Ki vagyunk mi?</h2>
          <p>
            A RoyalCruise Magyarország vezető hajóútranszporteri közé tartozik. Az elmúlt két évtizedben 
            több mint 100.000 utast szállítottunk Európa legszebb kikötőibe és szigeteire. Hivatásunk, hogy 
            az utazás egy felejthetetlen kaland legyen.
          </p>
          <div className={classes.statsGrid}>
            <div className={classes.stat}>
              <h3>100K+</h3>
              <p>Elégedett utazó</p>
            </div>
            <div className={classes.stat}>
              <h3>20+</h3>
              <p>Hajóút</p>
            </div>
            <div className={classes.stat}>
              <h3>20+</h3>
              <p>Év tapasztalat</p>
            </div>
            <div className={classes.stat}>
              <h3>5⭐</h3>
              <p>Értékelés</p>
            </div>
          </div>
        </div>
      </section>

      {/* Szolgáltatások szekció */}
      <section className={classes.servicesSection}>
        <div className={classes.sectionContent}>
          <h2>Szolgáltatásaink</h2>
          <div className={classes.servicesGrid}>
            <div className={classes.service}>
              <span className={classes.serviceIcon}>🚢</span>
              <h3>Luxushajók</h3>
              <p>Modern, kényelmes szállások az összes kabintípusban</p>
            </div>
            <div className={classes.service}>
              <span className={classes.serviceIcon}>🍽️</span>
              <h3>Világklasszis étkezés</h3>
              <p>Michelin-csillagos séfek által készített ételek</p>
            </div>
            <div className={classes.service}>
              <span className={classes.serviceIcon}>🎭</span>
              <h3>Szórakoztatás</h3>
              <p>Napi koncertek, előadások és kulturális programok</p>
            </div>
            <div className={classes.service}>
              <span className={classes.serviceIcon}>💆</span>
              <h3>Spa & Wellness</h3>
              <p>Teljes fürdőkomplexum és relaxációs szolgáltatások</p>
            </div>
            <div className={classes.service}>
              <span className={classes.serviceIcon}>🏊</span>
              <h3>Szabadidő aktivitások</h3>
              <p>Úszómedence, fitnessz, jóga és vízisportok</p>
            </div>
            <div className={classes.service}>
              <span className={classes.serviceIcon}>🎯</span>
              <h3>Személyre szabott programok</h3>
              <p>Családok, párok és egyedülálló utazók számára</p>
            </div>
          </div>
        </div>
      </section>

      {/* Célpontok szekció */}
      <section className={classes.destinationsSection}>
        <div className={classes.sectionContent}>
          <h2>Legkedveltebb célpontok</h2>
          <div className={classes.destinationsGrid}>
            <div className={classes.destination}>
              <h3>Mediterrán</h3>
              <p>Görögország, Olaszország, Spanyolország</p>
            </div>
            <div className={classes.destination}>
              <h3>Balti-tenger</h3>
              <p>Észtország, Lettország, Litvánia</p>
            </div>
            <div className={classes.destination}>
              <h3>Skandinávia</h3>
              <p>Norvégia, Svédország, Dánia</p>
            </div>
            <div className={classes.destination}>
              <h3>Tengeri</h3>
              <p>Horvátország, Montenegró</p>
            </div>
          </div>
        </div>
      </section>

      {/* Utazási dokumentumok */}
      <section className={classes.documentsSection}>
        <div className={classes.sectionContent}>
          <h2>Utazási Dokumentumok & Vízum</h2>
          <div className={classes.documentsGrid}>
            <div className={classes.documentItem}>
              <h3>📄 Útlevél</h3>
              <p>
                Napi érvényes útlevél szükséges az Europán kívüli utazásokhoz. 
                Legyen 6 hónapnál hosszabb lejárati ideje az utazás végétől.
              </p>
            </div>
            <div className={classes.documentItem}>
              <h3>🛂 Vízum</h3>
              <p>
                Az EU polgárai visa nélkül utazhatnak az EU tagállamokba. 
                EU-n kívüli utazásokhoz ellenőrizd az aktuális vízumkövetelményeket.
              </p>
            </div>
            <div className={classes.documentItem}>
              <h3>💳 Utazási dokumentumok</h3>
              <p>
                Jegyek, foglalási megerősítés és hajón hozzáadott kártyáid nyomtatva és digitálisan mentse.
              </p>
            </div>
            <div className={classes.documentItem}>
              <h3>💉 Oltások & Egészség</h3>
              <p>
                Bizonyos úticélokhoz ajánlott vagy kötelező oltások. Konzultálj utazás előtt orvossal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Biztonság & Biztosítás */}
      <section className={classes.securitySection}>
        <div className={classes.sectionContent}>
          <h2>Biztonság & Biztosítás</h2>
          <div className={classes.securityContent}>
            <div className={classes.securityItem}>
              <h3>Baleset és betegség biztosítás</h3>
              <p>Teljes körű fedezet az egész utazás alatt. Orvosi kezelés és szükség szerinti evakuálás.</p>
            </div>
            <div className={classes.securityItem}>
              <h3>Törlési biztosítás</h3>
              <p>Megbetegedés, munkaadó által rendelt munka vagy bármely váratlan esemény miatt történő lemondás.</p>
            </div>
            <div className={classes.securityItem}>
              <h3>Utazási dokumentumok biztosítása</h3>
              <p>Útlevél, jegyek és egyéb fontos dokumentumok elvesztésének fedezete</p>
            </div>
            <div className={classes.securityItem}>
              <h3>Bőrönd és értékek biztosítása</h3>
              <p>Utazási csomag és személyes értékek elvesztésének vagy károsodásának fedezete</p>
            </div>
            <div className={classes.securityItem}>
              <h3>Utazási késedelmi biztosítás</h3>
              <p>Kompenzáció, ha a hajó közlekedésből kimarad</p>
            </div>
            <div className={classes.securityItem}>
              <h3>Szülőszülés-biztosítás</h3>
              <p>Váratlan szülészeti szövődmények esetén fedezet</p>
            </div>
          </div>
        </div>
      </section>

      {/* Egészségügyi tudnivalók */}
      <section className={classes.healthSection}>
        <div className={classes.sectionContent}>
          <h2>Egészségügyi Információk</h2>
          <div className={classes.healthGrid}>
            <div className={classes.healthItem}>
              <h3>🏥 Orvosi Felügyelet</h3>
              <p>
                Összes hajónkon van orvos és teljes orvosi felszereléssel felszerelt klinika. 
                Kizárólag napi 24 órás orvosi segítség.
              </p>
            </div>
            <div className={classes.healthItem}>
              <h3>💊 Gyógyszerek & Receptek</h3>
              <p>
                Hozz magaddal elegendő mennyiséget az Ön rendelkezésére álló gyógyszerre. 
                Az orvos előírhat alapvető gyógyszereket szükség szerint.
              </p>
            </div>
            <div className={classes.healthItem}>
              <h3>🦟 Fertőző Betegségek</h3>
              <p>
                Ellenőrizd a úticél közegészségügyi feltételeit. Az ajánlott vagy kötelező 
                oltásokkal kapcsolatban konzultálj orvossal.
              </p>
            </div>
            <div className={classes.healthItem}>
              <h3>♿ Fogyatékosságok & Akadálymentesítés</h3>
              <p>
                A legtöbb hajóunk akadálymentes. Jelezd előre fogyatékosságodat vagy speciális igényedet.
              </p>
            </div>
            <div className={classes.healthItem}>
              <h3>🧘 Wellness & Fitnesz</h3>
              <p>
                Napi jóga, fitnessz órák és meditáció. Spa és massage szolgáltatások is elérhetők.
              </p>
            </div>
            <div className={classes.healthItem}>
              <h3>🚫 COVID-19 Intézkedések</h3>
              <p>
                Követjük az aktuális nemzetközi egészségügyi előírásokat és ajánlásokat. 
                Ellenőrizd az utazás előtt az aktuális feltételeket.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fizetési & Törlési Feltételek */}
      <section className={classes.termsSection}>
        <div className={classes.sectionContent}>
          <h2>Fizetési & Törlési Feltételek</h2>
          <div className={classes.termsContent}>
            <div className={classes.term}>
              <h3>💳 Fizetési módok</h3>
              <p>
                Elfogadunk: hitelkártyákat (Visa, Mastercard), banki átutalást, és online fizetési megoldásokat. 
                Az első foglalási részlet a foglaláskor esedékes.
              </p>
            </div>
            <div className={classes.term}>
              <h3>🔄 Foglalás módosítási díjak</h3>
              <p>
                A dátum vagy kabin módosítása díjmentes 90 nappal az utazás előtt. 
                Később módosítás után díjat számítunk fel.
              </p>
            </div>
            <div className={classes.term}>
              <h3>❌ Törlési feltételek</h3>
              <p>
                90+ nap előtt: Teljes visszatérítés. 
                60-89 nap: 25% díj. 
                30-59 nap: 50% díj. 
                Kevesebb mint 30 nap: Nem térítendő.
              </p>
            </div>
            <div className={classes.term}>
              <h3>⚠️ Rendkívüli körülmények</h3>
              <p>
                Közlekedési zavarás, útvonalas mód és egyéb rendkívüli körülmények esetén 
                megfelelő alternatívát biztosítunk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA szekció */}
      <section className={classes.ctaSection}>
        <div className={classes.sectionContent}>
          <h2>Kérdéseid vannak?</h2>
          <p>Fedezd fel az útvonalakat, vagy olvasd el a részletes rólunk oldalt</p>
          <div className={classes.ctaButtons}>
            <a href="/routes" className={classes.primaryBtn}>
              Hajóutak megtekintése
            </a>
            <a href="/company" className={classes.secondaryBtn}>
              Rólunk bővebben
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
