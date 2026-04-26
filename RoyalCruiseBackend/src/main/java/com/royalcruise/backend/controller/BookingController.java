
package com.royalcruise.backend.controller;

import com.royalcruise.backend.model.*;
import com.royalcruise.backend.AuthService;
import com.royalcruise.backend.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
// Ez a controller HTTP vegpontokat ad, bemeneti kerest fogad es a megfelelo service/repository logikara delegal.
public class BookingController {

    private final AuthService authService;
    private final BookingService bookingService;

    public BookingController(AuthService authService, BookingService bookingService) {
        this.authService = authService;
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<?> createBooking(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody BookingRequest request
    ) {
        // 1) A felhasználói azonosítás, szerepkör-ellenőrzés és foglalási művelet előkészítése.
        String token = extractBearerToken(authorization);
        UserAccount user = authService.getUserByToken(token).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Bejelentkezés szükséges a foglaláshoz."));
        }

        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Admin fiókkal itt nem lehet foglalni. Használd az admin foglalási felületet."));
        }

        try {
            BookingResponse response = bookingService.createBooking(user, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(ex.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyBookings(@RequestHeader(value = "Authorization", required = false) String authorization) {
        // 1) A saját foglalások lekéréséhez először azonosítjuk a bejelentkezett felhasználót.
        String token = extractBearerToken(authorization);
        UserAccount user = authService.getUserByToken(token).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Bejelentkezés szükséges."));
        }

        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Admin fiókhoz nem tartozik saját foglalási lista ezen a végponton."));
        }

        List<BookingResponse> bookings = bookingService.getBookingsByUser(user);
        return ResponseEntity.ok(bookings);
    }

    @DeleteMapping({"/{id}", "/me/{id}"})
    public ResponseEntity<?> cancelMyBooking(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id
    ) {
        // 1) A lemondás előtt ellenőrizzük a felhasználót és a szerepkört.
        String token = extractBearerToken(authorization);
        UserAccount user = authService.getUserByToken(token).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Bejelentkezés szükséges."));
        }

        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Admin fiókkal nem lehet saját foglalást lemondani ezen a felületen."));
        }

        try {
            boolean cancelled = bookingService.cancelBookingForUser(user, id);
            if (!cancelled) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("A foglalás nem található."));
            }

            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Hiba a foglalás lemondásában: " + ex.getMessage()));
        }
    }

    private String extractBearerToken(String authorization) {
        // 1) Csak a szabályos Bearer fejlécből vágjuk ki a JWT tokent.
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7);
    }
}

