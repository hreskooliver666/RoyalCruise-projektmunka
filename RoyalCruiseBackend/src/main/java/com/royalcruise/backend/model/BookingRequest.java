package com.royalcruise.backend.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// Foglalási kérés adatszerkezet, amely az útvonalhoz, a kabinhoz és az árképzéshez szükséges adatokat hordozza.
public record BookingRequest(
        @NotBlank String routeId,
        @NotBlank String routeName,
        @NotBlank String destination,
        @NotBlank String routeDepartureFrom,
        @NotBlank String routeDate,
        @NotBlank String cabin,
        @Min(1) Integer guests,
        @Min(0) int basePrice,
        @Min(0) int cabinPrice,
        @Min(0) int extrasPrice,
        @Min(0) int totalPrice,
        // Az extra lista lehet ures, mert a frontend extraszolgaltatas nelkul is enged foglalni.
        @Valid @NotNull List<BookingExtraRequest> extras,
        @Min(0) int boardingStopIndex,
        @Min(0) int arrivalStopIndex
) {
}
