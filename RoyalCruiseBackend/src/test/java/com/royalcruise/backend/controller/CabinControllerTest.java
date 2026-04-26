/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service.controller;

import com.royalcruise.backend.model.Cabin;
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
class CabinControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CruiseDataService cruiseDataService;

    private Cabin cabin;

    // 1) Kabinlista-alapállapot előkészítése a lekérdezési tesztekhez.
    @BeforeEach
    void setUp() {
        cabin = new Cabin();
        cabin.setId("standard");
        cabin.setName("Standard Cabin");
        cabin.setType("Standard");
        cabin.setCapacity(2);
        cabin.setPricePerNight(150);
        cabin.setDescription("Comfortable cabin");
        cabin.setImage("standard.jpg");
        cabin.setAmenities(List.of("WiFi", "TV"));
    }

    // 2) A kabinlista, az egyedi kabin és a vendégszűrt lekérés ellenőrzése.
    @Test
    void getAllCabinsReturnsList() throws Exception {
        when(cruiseDataService.getAllCabins()).thenReturn(List.of(cabin));

        mockMvc.perform(get("/api/cabins").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("standard")))
                .andExpect(jsonPath("$[0].capacity", is(2)));
    }

    // Ellenorzi, hogy letezo kabinazonosito eseten a reszletes kabinadatok visszaadasra kerulnek.
    @Test
    void getCabinByIdReturnsCabin() throws Exception {
        when(cruiseDataService.getCabinById("standard")).thenReturn(Optional.of(cabin));

        mockMvc.perform(get("/api/cabins/standard").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Standard Cabin")))
                .andExpect(jsonPath("$.type", is("Standard")));
    }

    // Ellenorzi, hogy hianyzo kabinazonosito eseten a vegpont 404 Not Found valaszt ad.
    @Test
    void getCabinByIdReturns404WhenMissing() throws Exception {
        when(cruiseDataService.getCabinById("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/cabins/missing").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // Ellenorzi, hogy vendegszam szerinti kabinkereses a megfelelo (itt ures) listaval ter vissza.
    @Test
    void searchCabinsFiltersByGuests() throws Exception {
        when(cruiseDataService.searchCabins(4)).thenReturn(List.of());

        mockMvc.perform(get("/api/cabins/search")
                        .param("guests", "4")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
