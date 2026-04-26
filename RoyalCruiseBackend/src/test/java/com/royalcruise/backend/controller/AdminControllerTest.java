/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service.controller;

import com.royalcruise.backend.model.Role;
import com.royalcruise.backend.model.UserAccount;
import com.royalcruise.backend.repository.BookingRepository;
import com.royalcruise.backend.repository.UserAccountRepository;
import com.royalcruise.backend.service.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @MockBean
    private BookingRepository bookingRepository;

    @MockBean
    private BookingService bookingService;

    private UserAccount admin;
    private UserAccount regularUser;

    // 1) Admin és nem-admin felhasználók tesztkörnyezetének előkészítése.
    @BeforeEach
    void setUp() {
        admin = createUser(1L, Role.ADMIN, "admin");
        regularUser = createUser(2L, Role.USER, "user");
    }

    // 2) A felhasználói lista lekérésének jogosultság- és tartalomellenőrzése.
    @Test
    void getUsersReturnsForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.user("user").roles("USER"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Nincs jogosultság")));
    }

    // Ellenorzi, hogy admin tokennel a rendszer a felhasznalokat admin-nezetre mapelt JSON-kent adja vissza.
    @Test
    void getUsersReturnsMappedAdminView() throws Exception {
        when(userAccountRepository.findAll()).thenReturn(List.of(admin, regularUser));

        mockMvc.perform(get("/api/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].role", is("ADMIN")))
                .andExpect(jsonPath("$[1].username", is("user")));
    }

    // 3) A felhasználótörlés hibás és sikeres ágainak ellenőrzése.
    @Test
    void deleteUserReturns404WhenUserMissing() throws Exception {
        when(userAccountRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/admin/users/999")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("nem található")));
    }

    // Ellenorzi, hogy admin felhasznalo torleset a rendszer bad request hibaval elutasitja.
    @Test
    void deleteUserReturnsBadRequestForAdminUser() throws Exception {
        when(userAccountRepository.findById(1L)).thenReturn(Optional.of(admin));

        mockMvc.perform(delete("/api/admin/users/1")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Admin felhasználó")));
    }

    // Ellenorzi, hogy normal felhasznalo torlesekor a kapcsolodo foglalasok is torlesre kerulnek.
    @Test
    void deleteUserDeletesRegularUserAndBookings() throws Exception {
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(regularUser));
        doNothing().when(bookingRepository).deleteByUser(regularUser);
        doNothing().when(userAccountRepository).delete(regularUser);

        mockMvc.perform(delete("/api/admin/users/2")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
    }

    // 4) Az admin foglaláslista lekérése és törlési ágai.
    @Test
    void getBookingsReturnsListForAdmin() throws Exception {
        when(bookingService.getAllBookings()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/bookings")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // Ellenorzi, hogy admin jogosultsaggal a foglalas torlese 204 No Content valasszal zarul.
    @Test
    void deleteBookingReturnsNoContentForAdmin() throws Exception {
        when(bookingService.deleteBookingById(7L)).thenReturn(true);

        mockMvc.perform(delete("/api/admin/bookings/7")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteBookingReturns404WhenMissing() throws Exception {
        when(bookingService.deleteBookingById(7L)).thenReturn(false);

        mockMvc.perform(delete("/api/admin/bookings/7")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("nem található")));
    }

    // Tesztfelhasznalot epit fix alapadatokkal, hogy konnyen kulonbseget tegyunk admin es user szerepkor kozott.
    private UserAccount createUser(Long id, Role role, String username) {
        UserAccount account = new UserAccount();
        ReflectionTestUtils.setField(account, "id", id);
        account.setUsername(username);
        account.setEmail(username + "@example.com");
        account.setPassword("encoded-password");
        account.setAddress("Address 1");
        account.setCountry("Hungary");
        account.setPostalCode("1234");
        account.setPhone("+36301234567");
        account.setGender("Férfi");
        account.setRole(role);
        ReflectionTestUtils.setField(account, "createdAt", LocalDateTime.of(2026, 1, 1, 10, 0));
        return account;
    }
}

