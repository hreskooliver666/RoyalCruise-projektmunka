/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.royalcruise.backend.model.*;
import com.royalcruise.backend.repository.BookingRepository;
import com.royalcruise.backend.repository.RouteItemRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
// Ez a service osztaly uzleti szabalyokat futtat, validal es az adat-hozzaferesi reteget hivja.
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RouteItemRepository routeItemRepository;
    private final ObjectMapper objectMapper;

    public BookingService(
            BookingRepository bookingRepository,
            RouteItemRepository routeItemRepository,
            ObjectMapper objectMapper
    ) {
        this.bookingRepository = bookingRepository;
        this.routeItemRepository = routeItemRepository;
        this.objectMapper = objectMapper;
    }

        public BookingResponse createBooking(UserAccount user, BookingRequest request) {
        // 1) A vendégszámot normalizáljuk, majd kötelező minimumot ellenőrzünk.
        int guests = request.guests() == null ? 1 : request.guests();
        if (guests < 1) {
            throw new IllegalArgumentException("Legalább 1 fő megadása kötelező.");
        }

        // 2) Az útvonal létezését ellenőrizzük.
        routeItemRepository.findById(request.routeId())
                .orElseThrow(() -> new IllegalArgumentException("A kiválasztott útvonal nem található."));

        // 3) A foglalási entitást kitöltjük a requestből.
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setRouteId(request.routeId());
        booking.setRouteName(request.routeName());
        booking.setDestination(request.destination());
        booking.setRouteDepartureFrom(request.routeDepartureFrom());
        booking.setRouteDate(request.routeDate());
        booking.setCabin(request.cabin());
        booking.setGuests(guests);
        booking.setBoardingStopIndex(request.boardingStopIndex());
        booking.setArrivalStopIndex(request.arrivalStopIndex());
        booking.setBasePrice(request.basePrice());
        booking.setCabinPrice(request.cabinPrice());
        booking.setExtrasPrice(request.extrasPrice());
        booking.setTotalPrice(request.totalPrice());
        // A frontend enged ures extralistat, ezert null esetben is stabilan ures listat tarolunk.
        booking.setExtrasJson(toJson(request.extras()));

        // 4) Mentés után a tartósan tárolt rekordból állítjuk elő a válasz DTO-t.
        Booking saved = bookingRepository.save(booking);
        return toResponse(saved);
    }

        public List<BookingResponse> getBookingsByUser(UserAccount user) {
        // 1) A felhasználó saját foglalásait időrendben visszafelé kérjük le.
        return bookingRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

        public List<BookingResponse> getAllBookings() {
        // 1) Az összes foglalást admin célra, létrehozási idő szerint csökkenő sorrendben adjuk vissza.
        return bookingRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

        public boolean deleteBookingById(Long bookingId) {
        // 1) Ha nincs ilyen azonosító, a törlés nem hajtható végre.
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            return false;
        }

        bookingRepository.delete(booking);
        return true;
    }

        public boolean cancelBookingForUser(UserAccount user, Long bookingId) {
        // 1) A foglalást csak a saját tulajdonosa mondhatja le.
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            return false;
        }

        if (booking.getUser() == null || booking.getUser().getId() == null || !booking.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Ez a foglalás nem a bejelentkezett felhasználóhoz tartozik.");
        }

        // 2) Az indulási dátum értelmezése után ellenőrizzük a lemondási szabályt.
        LocalDate departureDate;
        try {
            departureDate = LocalDate.parse(booking.getRouteDate());
        } catch (Exception ex) {
            throw new IllegalStateException("A foglalás indulási dátuma nem értelmezhető.");
        }

        LocalDate today = LocalDate.now();
        if (!today.isBefore(departureDate)) {
            throw new IllegalStateException("Az indulás napján vagy utána a foglalás már nem mondható le.");
        }

        bookingRepository.delete(booking);
        return true;
    }

        private BookingResponse toResponse(Booking booking) {
        // 1) A tárolt booking entitást a frontendnek szánt válaszobjektummá alakítjuk.
        return new BookingResponse(
                booking.getId(),
                booking.getUser().getEmail(),
                booking.getUser().getUsername(),
                booking.getRouteId(),
                booking.getRouteName(),
                booking.getDestination(),
                booking.getRouteDepartureFrom(),
                booking.getRouteDate(),
                booking.getCabin(),
                booking.getGuests(),
                booking.getBasePrice(),
                booking.getCabinPrice(),
                booking.getExtrasPrice(),
                booking.getTotalPrice(),
                fromJson(booking.getExtrasJson()),
                booking.getCreatedAt()
        );
    }

        private String toJson(List<BookingExtraRequest> extras) {
        // 1) Null helyett ures listat normalizalunk, hogy az extras nelkuli foglalas is mentheto legyen.
        List<BookingExtraRequest> safeExtras = extras == null ? new ArrayList<>() : extras;
        try {
            return objectMapper.writeValueAsString(safeExtras);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Nem sikerült menteni az extra szolgáltatásokat.");
        }
    }

        private List<BookingExtraRequest> fromJson(String extrasJson) {
        // 1) A JSON-ban tárolt extra szolgáltatásokat visszaalakítjuk listává.
        try {
            return objectMapper.readValue(extrasJson, new TypeReference<>() {
            });
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }
}

