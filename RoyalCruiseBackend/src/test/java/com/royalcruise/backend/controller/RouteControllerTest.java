/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service.controller;

import com.royalcruise.backend.model.RouteItem;
import com.royalcruise.backend.service.CruiseDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class RouteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CruiseDataService cruiseDataService;

    private RouteItem route;

    // Minden teszt előtt létrehozunk egy minta útvonalat, amelyet a mock szolgáltatás visszaad.
    @BeforeEach
    void setUp() {
        route = new RouteItem();
        route.setId("route-1");
        route.setName("Mediterrán kaland");
        route.setImage("route.jpg");
        route.setDescription("Sample route");
        route.setStops(List.of("Barcelona", "Marseille", "Roma"));
        route.setDate("2026-08-01");
        route.setPrice(299);
        route.setDestination("Földközi-tenger");
        route.setRouteName("Mediterrán körút");
        route.setAvailableSeats(120);
    }

    // Ellenorzi, hogy a teljes utvonal lista vegpont 200 OK-val es a vart elemekkel valaszol.
    @Test
    void getAllRoutesReturnsList() throws Exception {
        when(cruiseDataService.getAllRoutes()).thenReturn(List.of(route));

        mockMvc.perform(get("/api/routes").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("route-1")))
                .andExpect(jsonPath("$[0].availableSeats", is(120)));
    }

    // Ellenorzi, hogy letezo route azonosito eseten a vegpont a megfelelo utvonal adatait adja vissza.
    @Test
    void getRouteByIdReturnsRoute() throws Exception {
        when(cruiseDataService.getRouteById("route-1")).thenReturn(Optional.of(route));

        mockMvc.perform(get("/api/routes/route-1").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Mediterrán kaland")))
                .andExpect(jsonPath("$.destination", is("Földközi-tenger")));
    }

    // Ellenorzi, hogy hianyzo route azonosito eseten a rendszer 404 Not Found valaszt ad.
    @Test
    void getRouteByIdReturns404WhenMissing() throws Exception {
        when(cruiseDataService.getRouteById("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/routes/missing").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // Ellenorzi, hogy a keresesi parametereknek megfeleloen szurt utvonalakat kap vissza a kliens.
    @Test
    void searchRoutesReturnsFilteredRoutes() throws Exception {
        // A controller az uj, bovitett searchRoutes alairast hivja, ezert itt is azt mockoljuk.
        when(cruiseDataService.searchRoutes(
            "Földközi-tenger",
            "Mediterrán körút",
            null,
            null,
            "2026-08-01",
            "2026-08-31",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            2,
            100,
            350,
            "RC Aurora"
        ))
                .thenReturn(List.of(route));

        mockMvc.perform(get("/api/routes/search")
                        .param("destination", "Földközi-tenger")
                        .param("routeName", "Mediterrán körút")
                        .param("startDate", "2026-08-01")
                        .param("endDate", "2026-08-31")
                        .param("guests", "2")
                        .param("minPrice", "100")
                        .param("maxPrice", "350")
                        .param("shipType", "RC Aurora")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].routeName", is("Mediterrán körút")));
    }

    // Ellenorzi, hogy a celallomasok listazasa a vart darabszammal es sorrendben erkezik.
    @Test
    void getDestinationsReturnsList() throws Exception {
        when(cruiseDataService.getDestinations()).thenReturn(List.of("Földközi-tenger", "Skandinávia"));

        mockMvc.perform(get("/api/routes/destinations").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0]", is("Földközi-tenger")));
    }

    // Ellenorzi, hogy adott celallomashoz a route-csoportok helyes listaja jelenik meg.
    @Test
    void getRouteGroupsReturnsList() throws Exception {
        when(cruiseDataService.getRouteGroupsForDestination("Földközi-tenger"))
                .thenReturn(List.of("Mediterrán körút", "Adriai körút"));

        mockMvc.perform(get("/api/routes/route-groups")
                        .param("destination", "Földközi-tenger")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[1]", is("Adriai körút")));
    }
}
