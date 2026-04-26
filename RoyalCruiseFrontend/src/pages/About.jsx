// Ez a fájl a vállalatot bemutató statikus információs oldal tartalmát és szerkezetét tartalmazza.
import classes from "./About.module.css";

// Az About komponens a Royal Cruise szolgáltatásait, értékeit és bemutatkozó szövegét jeleníti meg.
export default function About() {
  return (
    <div className={classes.aboutContainer}>
      {/* Header szekció */}
      <section className={classes.heroSection}>
        <div className={classes.heroContent}>
          <h1>Kapcsolatok</h1>
          <p>Minden elérhetőségünk egy helyen, gyors és egyszerű ügyintézéshez</p>
        </div>
      </section>

      {/* Kontakt szekció */}
      <section className={classes.contactSection}>
        <div className={classes.sectionContent}>
          <h2>Lépj velünk kapcsolatba</h2>
          <div className={classes.contactGrid}>
            <div className={classes.contactCard}>
              <span className={classes.icon}>📧</span>
              <h3>Email</h3>
              <p>
                <a href="mailto:info@royalcruise.hu">info@royalcruise.hu</a>
              </p>
              <small>24 órán belül válaszolunk</small>
            </div>

            <div className={classes.contactCard}>
              <span className={classes.icon}>📞</span>
              <h3>Telefon</h3>
              <p>
                <a href="tel:+36301234567">+36 30 123 4567</a>
              </p>
              <small>Hétfő-Péntek: 9:00-18:00, Szo: 9:00-13:00</small>
            </div>

            <div className={classes.contactCard}>
              <span className={classes.icon}>🌍</span>
              <h3>Online ügyintézés</h3>
              <p>
                <a href="https://royalcruise.hu">www.royalcruise.hu</a>
              </p>
              <small>Foglalás, módosítás és információk online</small>
            </div>

            <div className={classes.contactCard}>
              <span className={classes.icon}>📍</span>
              <h3>Cím</h3>
              <p>Budapest, Magyarország</p>
              <small>Személyes ügyfélszolgálat előzetes egyeztetéssel</small>
            </div>
          </div>
        </div>
      </section>

      {/* CTA szekció */}
      <section className={classes.ctaSection}>
        <div className={classes.sectionContent}>
          <h2>További segítségre van szükséged?</h2>
          <p>Nézd meg az aktuális hajóutakat, vagy ismerd meg a vállalati történetünket</p>
          <div className={classes.ctaButtons}>
            <a href="/routes" className={classes.secondaryBtn}>
              Aktuális hajóutak
            </a>
            <a href="/company" className={classes.primaryBtn}>
              Rólunk bővebben
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
