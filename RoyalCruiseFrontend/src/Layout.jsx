// Ez a fájl a közös oldalvázat adja: fejlécet, tartalmi konténert és láblécet rendez egységes elrendezésbe.
import { Link } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import ScrollToTopButton from "./components/scroll-to-top-button/ScrollToTopButton";
import classes from "./Layout.module.css";

// A Layout komponens minden oldal köré azonos keretet rajzol, és a children tartalmat a fő részben jeleníti meg.
export default function Layout({ children }) {
  return (
    <>
      <header className={classes.header}>
        <Link to="/" className={classes.logo}>
          <img
            src="https://img.freepik.com/premium-vector/letter-r-crown-logo-queen-sign-beauty-fashion-star-elegant-luxury-symbol_754537-7610.jpg"
            alt="RoyalCruise Logo"
            className={classes.logoImage}
          />
        </Link>

        <Header />
      </header>

      <main className={classes.main}>{children}</main>

      <ScrollToTopButton />

      <Footer />
    </>
  );
}
