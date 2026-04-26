/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.model;

import java.time.LocalDateTime;
import java.util.List;

// Ez a modell osztaly/DTO az API adatszerkezetet irja le: keres, valasz vagy perzisztalt entitas mezokkel.
public record BookingResponse(
        Long id,
        String userEmail,
        String username,
        String routeId,
        String routeName,
        String destination,
        String routeDepartureFrom,
        String routeDate,
        String cabin,
        int guests,
        int basePrice,
        int cabinPrice,
        int extrasPrice,
        int totalPrice,
        List<BookingExtraRequest> extras,
        LocalDateTime createdAt
) {
}
