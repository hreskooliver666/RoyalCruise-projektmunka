/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.royalcruise.backend.BookingService;
import com.royalcruise.backend.model.Booking;
import com.royalcruise.backend.model.UserAccount;
import com.royalcruise.backend.repository.BookingRepository;
import com.royalcruise.backend.repository.RouteItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private RouteItemRepository routeItemRepository;

    private BookingService bookingService;

    // A foglalaskezelo szolgaltatast mock repositorykkal inicializalja minden teszt futasa elott.
    @BeforeEach
    void setUp() {
        bookingService = new BookingService(
                bookingRepository,
                routeItemRepository,
                new ObjectMapper()
        );
    }

    // Ellenorzi, hogy a felhasznalo a sajat, indulasi datum elotti foglalasat sikeresen lemondhatja.
    @Test
    void cancelBookingForUserDeletesOwnBookingBeforeDeparture() {
        UserAccount user = new UserAccount();
        setUserId(user, 1L);

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setRouteDate(LocalDate.now().plusDays(2).toString());

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));

        boolean cancelled = bookingService.cancelBookingForUser(user, 10L);

        assertTrue(cancelled);
        verify(bookingRepository).delete(booking);
    }

    // Ellenorzi, hogy mas felhasznalo foglalasat nem lehet lemondani (jogosultsagi vedelmi ag).
    @Test
    void cancelBookingForUserRejectsOtherUsersBooking() {
        UserAccount owner = new UserAccount();
        setUserId(owner, 1L);

        UserAccount attacker = new UserAccount();
        setUserId(attacker, 2L);

        Booking booking = new Booking();
        booking.setUser(owner);
        booking.setRouteDate(LocalDate.now().plusDays(2).toString());

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));

        assertThrows(IllegalArgumentException.class, () -> bookingService.cancelBookingForUser(attacker, 10L));
        verify(bookingRepository, never()).delete(any(Booking.class));
    }

    // Ellenorzi, hogy indulas napjan vagy azt kovetoen a rendszer mar nem engedi a lemondast.
    @Test
    void cancelBookingForUserRejectsDepartureDayOrLater() {
        UserAccount user = new UserAccount();
        setUserId(user, 1L);

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setRouteDate(LocalDate.now().toString());

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));

        assertThrows(IllegalStateException.class, () -> bookingService.cancelBookingForUser(user, 10L));
        verify(bookingRepository, never()).delete(any(Booking.class));
    }

    // Ellenorzi, hogy hianyzo foglalasazonosito eseten false ertekkel ter vissza a lemondasi muvelet.
    @Test
    void cancelBookingForUserReturnsFalseWhenMissing() {
        UserAccount user = new UserAccount();
        setUserId(user, 1L);

        when(bookingRepository.findById(10L)).thenReturn(Optional.empty());

        boolean cancelled = bookingService.cancelBookingForUser(user, 10L);

        assertFalse(cancelled);
        verify(bookingRepository, never()).delete(any(Booking.class));
    }

    // Reflektiven beallitja a UserAccount ID-t, hogy tulajdonosi viszonyt tudjunk szimulalni a tesztekben.
    private static void setUserId(UserAccount user, Long id) {
        try {
            var field = UserAccount.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Nem sikerült beállítani a teszt user ID-t.", ex);
        }
    }
}
