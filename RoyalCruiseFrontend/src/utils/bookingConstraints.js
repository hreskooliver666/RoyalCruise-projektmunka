// Ez a util a mai napon futo hajoutak indulasi korlatainak szamitasat centralizalja.

// Visszaadja a mai nap utani varosi megallok szamat es az elso jovo beli varosi indexet.
function getFuturePortStats(portStops, todayIso) {
  const safeStops = Array.isArray(portStops) ? portStops : [];
  const nextFuturePortIndex = safeStops.findIndex((stop) => String(stop?.date || "") > todayIso);
  const futureCityStopCountFromToday = safeStops.filter((stop) => String(stop?.date || "") > todayIso).length;

  return {
    nextFuturePortIndex,
    futureCityStopCountFromToday,
  };
}

// Ez a fuggveny kiszamolja a futo (mai) indulashoz tartozo foglalasi korlatokat.
// Szabaly: ha ma fut az ut, akkor csak a kovetkezo jovo beli varostol lehet indulni,
// es csak akkor engedunk foglalast, ha ma utan legalabb 2 varosi megallo marad.
export function computeTodayInTransitBoardingConstraints({
  portStops,
  todayIso,
  maxBoardingIndex,
  isTodayInTransitSelection,
  minFutureCityStopsRequired = 2,
}) {
  const {
    nextFuturePortIndex,
    futureCityStopCountFromToday,
  } = getFuturePortStats(portStops, todayIso);

  const isTodayBookingRuleSatisfied =
    nextFuturePortIndex >= 0 && futureCityStopCountFromToday >= minFutureCityStopsRequired;

  const isBookingBlockedByTodayRule = Boolean(isTodayInTransitSelection) && !isTodayBookingRuleSatisfied;

  // Ha tiltott, akkor a minimumot a max fole toljuk, igy nem marad ervenyes indulasi opcio.
  const minimumSelectableBoardingIndex = isTodayInTransitSelection
    ? (isTodayBookingRuleSatisfied ? Math.min(nextFuturePortIndex, maxBoardingIndex) : maxBoardingIndex + 1)
    : 0;

  // A maximum marad a normal szakaszkorlat, hogy tobb jovo beli varos is valaszthato legyen.
  const maximumSelectableBoardingIndex = maxBoardingIndex;

  return {
    nextFuturePortIndex,
    futureCityStopCountFromToday,
    isTodayBookingRuleSatisfied,
    isBookingBlockedByTodayRule,
    minimumSelectableBoardingIndex,
    maximumSelectableBoardingIndex,
  };
}

// Ez a segédfüggvény ellenőrzi, hogy a mai nap után marad-e elég városi megálló.
export function hasMinimumFutureCityStops(occurrence, todayIso, minimumRequired = 2) {
  const schedule = Array.isArray(occurrence?.stopSchedule) ? occurrence.stopSchedule : [];
  const futureCityStops = schedule.filter((stop) => {
    if (!stop || stop.isSeaDay) return false;
    return String(stop.date || "") > todayIso;
  });

  return futureCityStops.length >= minimumRequired;
}
