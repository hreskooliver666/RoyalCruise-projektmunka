// Ezek a tesztek a mai napon futo utak indulasi korlatainak regressziojat vedik.
import { computeTodayInTransitBoardingConstraints, hasMinimumFutureCityStops } from "./bookingConstraints.js";

describe("computeTodayInTransitBoardingConstraints", () => {
  // Ellenorzi, hogy ha ma utan legalabb 3 varosi megallo marad, a masodik indulasi opcio is valaszthato marad.
  it("allows more than one boarding option when enough future city stops remain", () => {
    const portStops = [
      { city: "Mykonos", date: "2026-04-24" },
      { city: "Kusadasi", date: "2026-04-26" },
      { city: "Rodosz", date: "2026-04-28" },
    ];

    const result = computeTodayInTransitBoardingConstraints({
      portStops,
      todayIso: "2026-04-23",
      maxBoardingIndex: 1,
      isTodayInTransitSelection: true,
    });

    expect(result.isBookingBlockedByTodayRule).toBe(false);
    expect(result.minimumSelectableBoardingIndex).toBe(0);
    expect(result.maximumSelectableBoardingIndex).toBe(1);
  });

  // Ellenorzi, hogy mai napon blokkoljuk a foglalast, ha ma utan mar nincs legalabb 2 varosi megallo.
  it("blocks booking when fewer than two future city stops remain", () => {
    const portStops = [
      { city: "Kusadasi", date: "2026-04-26" },
    ];

    const result = computeTodayInTransitBoardingConstraints({
      portStops,
      todayIso: "2026-04-25",
      maxBoardingIndex: 0,
      isTodayInTransitSelection: true,
    });

    expect(result.isBookingBlockedByTodayRule).toBe(true);
    expect(result.minimumSelectableBoardingIndex).toBe(1);
  });

  // Ellenorzi, hogy nem mai (nem futo) kivalasztasnal a mai-napi specialis korlatok nem lepnek eletbe.
  it("does not apply current-day blocking for non in-transit selection", () => {
    const portStops = [
      { city: "Athen", date: "2026-05-02" },
      { city: "Mykonos", date: "2026-05-04" },
      { city: "Rodosz", date: "2026-05-06" },
    ];

    const result = computeTodayInTransitBoardingConstraints({
      portStops,
      todayIso: "2026-04-23",
      maxBoardingIndex: 1,
      isTodayInTransitSelection: false,
    });

    expect(result.isBookingBlockedByTodayRule).toBe(false);
    expect(result.minimumSelectableBoardingIndex).toBe(0);
    expect(result.maximumSelectableBoardingIndex).toBe(1);
  });
});

describe("hasMinimumFutureCityStops", () => {
  it("returns true when at least two future city stops remain", () => {
    const occurrence = {
      stopSchedule: [
        { city: "Barcelona", date: "2026-04-20", isSeaDay: false },
        { city: "Tengeri nap", date: "2026-04-21", isSeaDay: true },
        { city: "Marseille", date: "2026-04-22", isSeaDay: false },
        { city: "Roma", date: "2026-04-24", isSeaDay: false },
      ],
    };

    expect(hasMinimumFutureCityStops(occurrence, "2026-04-21", 2)).toBe(true);
  });

  it("returns false when fewer than two future city stops remain", () => {
    const occurrence = {
      stopSchedule: [
        { city: "Barcelona", date: "2026-04-20", isSeaDay: false },
        { city: "Tengeri nap", date: "2026-04-21", isSeaDay: true },
        { city: "Marseille", date: "2026-04-22", isSeaDay: false },
      ],
    };

    expect(hasMinimumFutureCityStops(occurrence, "2026-04-21", 2)).toBe(false);
  });
});
