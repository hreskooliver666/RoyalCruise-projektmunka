/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.royalcruise.backend.model.*;
import com.royalcruise.backend.AuthService;
import com.royalcruise.backend.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class BookingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private BookingService bookingService;

    private BookingRequest bookingRequest;
    private BookingResponse bookingResponse;
    private UserAccount user;
    private UserAccount admin;

    // 1) Foglalási kéréshez szükséges alapadatok és mock felhasználók előkészítése.
    @BeforeEach
    void setUp() {
        bookingRequest = new BookingRequest(
                "route-1",
                "Mediterrán kaland",
                "Földközi-tenger",
                "Barcelona",
                "2026-08-01",
                "Standard",
                2,
                100,
                50,
                25,
                175,
                List.of(new BookingExtraRequest("Wellness csomag", 25)),
                0,
                2
        );

        bookingResponse = new BookingResponse(
                1L,
                "user@example.com",
                "testuser",
                "route-1",
                "Mediterrán kaland",
                "Földközi-tenger",
                "Barcelona",
                "2026-08-01",
                "Standard",
                2,
                100,
                50,
                25,
                175,
                List.of(new BookingExtraRequest("Wellness csomag", 25)),
                LocalDateTime.of(2026, 4, 22, 10, 0)
        );

        user = createUser(1L, Role.USER);
        admin = createUser(2L, Role.ADMIN);
    }

    // 2) A foglalás létrehozásának sikeres, jogosultsági és hibás ágai.
    @Test
    void createBookingReturnsCreated() throws Exception {
        when(authService.getUserByToken("token")).thenReturn(Optional.of(user));
        when(bookingService.createBooking(eq(user), any(BookingRequest.class))).thenReturn(bookingResponse);

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.routeId", is("route-1")))
                .andExpect(jsonPath("$.username", is("testuser")))
                .andExpect(jsonPath("$.totalPrice", is(175)));
    }

    // Ellenorzi, hogy token nelkul foglalas letrehozasa eseten 401 valasz erkezik.
    @Test
    void createBookingWithoutTokenReturnsUnauthorized() throws Exception {
        when(authService.getUserByToken(null)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", containsString("Bejelentkezés szükséges")));
    }

    // Ellenorzi, hogy admin szerepkorrel a foglalasi vegpont hasznalata tiltott.
    @Test
    void createBookingWithAdminReturnsForbidden() throws Exception {
        when(authService.getUserByToken("admin-token")).thenReturn(Optional.of(admin));

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer admin-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Admin fiókkal")));
    }

    // 3) A saját foglalások listázása és a lemondási ágak ellenőrzése.
    @Test
    void getMyBookingsReturnsList() throws Exception {
        when(authService.getUserByToken("token")).thenReturn(Optional.of(user));
        when(bookingService.getBookingsByUser(user)).thenReturn(List.of(bookingResponse));

        mockMvc.perform(get("/api/bookings/me")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].routeId", is("route-1")));
    }

    // Ellenorzi, hogy admin tokennel a sajat foglalasok vegpont nem erheto el.
    @Test
    void getMyBookingsWithAdminReturnsForbidden() throws Exception {
        when(authService.getUserByToken("admin-token")).thenReturn(Optional.of(admin));

        mockMvc.perform(get("/api/bookings/me")
                        .header("Authorization", "Bearer admin-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Admin fiókhoz")));
    }

    // Ellenorzi, hogy sikeres lemondasnal a vegpont 204 No Content statuszt ad.
    @Test
    void cancelBookingReturnsNoContent() throws Exception {
        when(authService.getUserByToken("token")).thenReturn(Optional.of(user));
        when(bookingService.cancelBookingForUser(user, 1L)).thenReturn(true);

        mockMvc.perform(delete("/api/bookings/1")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isNoContent());
    }

    // Ellenorzi, hogy nem letezo foglalasazonosito eseten 404-es valasz erkezik.
    @Test
    void cancelBookingNotFoundReturns404() throws Exception {
        when(authService.getUserByToken("token")).thenReturn(Optional.of(user));
        when(bookingService.cancelBookingForUser(user, 999L)).thenReturn(false);

        mockMvc.perform(delete("/api/bookings/999")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("nem található")));
    }

    // Ellenorzi, hogy admin tokennel a lemondasi vegpont meghivasa tiltott.
    @Test
    void cancelBookingWithAdminReturnsForbidden() throws Exception {
        when(authService.getUserByToken("admin-token")).thenReturn(Optional.of(admin));

        mockMvc.perform(delete("/api/bookings/1")
                        .header("Authorization", "Bearer admin-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Admin fiókkal")));
    }

    // Tesztfelhasznalot hoz letre adott szerepkorrel, hogy a jogosultsagi agakat kulon tudjuk validalni.
    private UserAccount createUser(Long id, Role role) {
        UserAccount account = new UserAccount();
        ReflectionTestUtils.setField(account, "id", id);
        account.setUsername(role == Role.ADMIN ? "admin" : "testuser");
        account.setEmail(role == Role.ADMIN ? "admin@example.com" : "user@example.com");
        account.setPassword("encoded-password");
        account.setAddress("Address 1");
        account.setCountry("Hungary");
        account.setPostalCode("1234");
        account.setPhone("+36301234567");
        account.setGender("Férfi");
        account.setRole(role);
        return account;
    }
}

