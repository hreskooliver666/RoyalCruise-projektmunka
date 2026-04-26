/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.controller;

import com.royalcruise.backend.model.AdminUserResponse;
import com.royalcruise.backend.model.ErrorResponse;
import com.royalcruise.backend.model.Role;
import com.royalcruise.backend.model.UserAccount;
import com.royalcruise.backend.repository.BookingRepository;
import com.royalcruise.backend.repository.UserAccountRepository;
import com.royalcruise.backend.BookingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
// Ez a controller HTTP vegpontokat ad, bemeneti kerest fogad es a megfelelo service/repository logikara delegal.
public class AdminController {

    private final UserAccountRepository userAccountRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

    public AdminController(
            UserAccountRepository userAccountRepository,
            BookingRepository bookingRepository,
            BookingService bookingService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUsers() {
        // 1) Az admin jogosultságot a Spring Security ellenőrzi,
        //    így itt már csak az üzleti lekérdezési logika fut.

        try {
            List<AdminUserResponse> users = userAccountRepository.findAll().stream()
                    .map(user -> new AdminUserResponse(
                            user.getId(),
                            user.getUsername(),
                            user.getEmail(),
                            user.getAddress(),
                            user.getCountry(),
                            user.getPostalCode(),
                            user.getPhone(),
                            user.getGender(),
                            user.getRole() != null ? user.getRole().name() : "USER",
                            user.getCreatedAt()
                    ))
                    .toList();

            return ResponseEntity.ok(users);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Hiba az admin felhasználók lekérésében: " + ex.getMessage()));
        }
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id
    ) {
        // 1) A jogosultságot már a framework eldöntötte; itt a domain-szabályokat tartjuk be.
        //    (pl. admin felhasználó védelme, kapcsolódó foglalások törlése)

        try {
            UserAccount user = userAccountRepository.findById(id).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("A felhasználó nem található."));
            }

            if (user.getRole() == Role.ADMIN) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponse("Admin felhasználó nem törölhető."));
            }

            bookingRepository.deleteByUser(user);
            userAccountRepository.delete(user);
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Hiba a felhasználó törlésében: " + ex.getMessage()));
        }
    }

    @GetMapping("/bookings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getBookings() {
        // 1) Csak admin felhasználó juthat idáig; az összes foglalás listáját adjuk vissza.

        try {
            return ResponseEntity.ok(bookingService.getAllBookings());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Hiba a foglalások lekérésében: " + ex.getMessage()));
        }
    }

    @DeleteMapping("/bookings/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteBooking(
            @PathVariable Long id
    ) {
        // 1) Jogosultság után biztonságosan töröljük a megadott foglalást.

        try {
            boolean deleted = bookingService.deleteBookingById(id);
            if (!deleted) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("A foglalás nem található."));
            }
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Hiba a foglalás törlésében: " + ex.getMessage()));
        }
    }

}

