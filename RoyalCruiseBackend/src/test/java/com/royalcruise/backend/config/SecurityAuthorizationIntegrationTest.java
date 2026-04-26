package com.royalcruise.backend.config;

import com.royalcruise.backend.controller.AdminController;
import com.royalcruise.backend.controller.BookingController;
import com.royalcruise.backend.controller.RouteController;
import com.royalcruise.backend.repository.BookingRepository;
import com.royalcruise.backend.repository.UserAccountRepository;
import com.royalcruise.backend.service.AuthService;
import com.royalcruise.backend.service.BookingService;
import com.royalcruise.backend.service.CruiseDataService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integrációs szintű jogosultsági tesztek a legfontosabb API-hozzáférési szabályokra.
 *
 * A cél az, hogy regresszió esetén azonnal kiderüljön:
 * - publikus endpoint marad-e publikus,
 * - auth endpoint token nélkül tényleg 401-e,
 * - admin endpoint USER role-lal 403-e,
 * - admin endpoint ADMIN role-lal 200-e.
 */
@WebMvcTest(controllers = {RouteController.class, BookingController.class, AdminController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SecurityAuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // A SecurityFilterChain és a controller réteg ezekre a beanekre támaszkodik, ezért tesztben mockoljuk őket.
    @MockBean
    private CruiseDataService cruiseDataService;

    @MockBean
    private AuthService authService;

    @MockBean
    private BookingService bookingService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @MockBean
    private BookingRepository bookingRepository;

    @Test
    void publicRoutesEndpointShouldWorkWithoutToken() throws Exception {
        // A publikus /api/routes végpontnál elég egy minimálisan üres lista a sikeres 200-as válaszhoz.
        when(cruiseDataService.getAllRoutes()).thenReturn(List.of());

        mockMvc.perform(get("/api/routes"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void bookingsMeShouldReturn401WithoutToken() throws Exception {
        // Token nélkül az authenticated() szabály miatt 401-et várunk egységes JSON hibaformátummal.
        mockMvc.perform(get("/api/bookings/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(containsString("Bejelentkezés szükséges")));
    }

    @Test
    void adminUsersShouldReturn403ForUserRole() throws Exception {
        // USER szerepkörnél az /api/admin/** hozzáférés tiltott, ezért 403 a helyes válasz.
        mockMvc.perform(get("/api/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.user("normal-user").roles("USER")))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(containsString("Nincs jogosultság az admin adatokhoz")));
    }

    @Test
    void adminUsersShouldReturn200ForAdminRole() throws Exception {
        // ADMIN szerepkörnél a hívás átmegy az autorizáción, ezért a controller üzleti válasza (itt üres lista) érkezik.
        when(userAccountRepository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin-user").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }
}
