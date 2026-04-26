/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.royalcruise.backend.CruiseDataService;
import com.royalcruise.backend.model.Cabin;
import com.royalcruise.backend.model.RouteItem;
import com.royalcruise.backend.repository.CabinRepository;
import com.royalcruise.backend.repository.RouteItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CruiseDataServiceTest {

    @Mock
    private CabinRepository cabinRepository;

    @Mock
    private RouteItemRepository routeItemRepository;

    private CruiseDataService cruiseDataService;

    // 1) Seedszinkronhoz szükséges repository-válaszok előkészítése.
    @BeforeEach
    void setUp() {
        lenient().when(cabinRepository.findById(anyString())).thenReturn(Optional.empty());
        lenient().when(routeItemRepository.findById(anyString())).thenReturn(Optional.empty());
        lenient().when(cabinRepository.save(any(Cabin.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(routeItemRepository.save(any(RouteItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        cruiseDataService = new CruiseDataService(new ObjectMapper(), cabinRepository, routeItemRepository);
    }

    // 2) A kabinlekérdezés és vendégszűrés viselkedését ellenőrző tesztek.
    @Test
    void getAllCabinsReturnsSavedCabins() {
        Cabin cabin = createCabin("standard", 2);
        when(cabinRepository.findAll()).thenReturn(List.of(cabin));

        List<Cabin> result = cruiseDataService.getAllCabins();

        assertEquals(1, result.size());
        assertEquals("standard", result.get(0).getId());
    }

    // Ellenorzi, hogy a minimum ferohely alapjan csak a megfelelo kapacitasu kabinok maradnak.
    @Test
    void searchCabinsFiltersByGuests() {
        Cabin small = createCabin("small", 2);
        Cabin big = createCabin("big", 4);
        when(cabinRepository.findAll()).thenReturn(List.of(small, big));

        List<Cabin> result = cruiseDataService.searchCabins(3);

        assertEquals(1, result.size());
        assertEquals("big", result.get(0).getId());
    }

    // 3) Az útvonal lekérdezése az éppen tárolt férőhely adatokkal történik.
    @Test
    void getRouteByIdReturnsStoredSeatsAndCabinAvailabilityMap() {
        RouteItem route = createRoute("route-1", "Földközi-tenger", "Mediterrán körút", 100, 299, "2026-08-01");
        // A jelenlegi service nem számol újra booking alapon, hanem a route rekordban tárolt állapotot adja vissza.
        route.setCabinAvailableSeats(Map.of("Standard", 40, "Deluxe", 20, "Suite", 10));

        when(routeItemRepository.findById("route-1")).thenReturn(Optional.of(route));

        Optional<RouteItem> result = cruiseDataService.getRouteById("route-1");

        assertTrue(result.isPresent());
        assertEquals(100, result.get().getAvailableSeats());
        assertNotNull(result.get().getCabinAvailableSeats());
        assertFalse(result.get().getCabinAvailableSeats().isEmpty());
    }

    // 4) A keresési és rendezési szűrők működését ellenőrző tesztek.
    @Test
    void searchRoutesFiltersSortsAndAppliesShipType() {
        RouteItem a = createRoute("route-a", "Földközi-tenger", "Mediterrán körút", 100, 250, "2026-08-15");
        RouteItem b = createRoute("route-b", "Skandinávia", "Északi körút", 100, 300, "2026-09-01");
        when(routeItemRepository.findAll()).thenReturn(List.of(a, b));

        List<RouteItem> result = cruiseDataService.searchRoutes(
                "Földközi-tenger",
                "Mediterrán körút",
                "2026-08-01",
                "2026-08-31",
                1,
                200,
                260,
                "RC Aurora"
        );

        assertEquals(1, result.size());
        assertEquals("route-a", result.get(0).getId());
    }

    // 5) A célállomás- és útvonalcsoport-listák egyediségét ellenőrző tesztek.
    @Test
    void getDestinationsReturnsDistinctValues() {
        RouteItem a = createRoute("route-a", "Földközi-tenger", "Mediterrán körút", 100, 250, "2026-08-15");
        RouteItem b = createRoute("route-b", "Földközi-tenger", "Adriai körút", 100, 300, "2026-09-01");
        RouteItem c = createRoute("route-c", "Skandinávia", "Északi körút", 100, 300, "2026-09-01");
        when(routeItemRepository.findAll()).thenReturn(List.of(a, b, c));

        List<String> result = cruiseDataService.getDestinations();

        assertEquals(List.of("Földközi-tenger", "Skandinávia"), result);
    }

    // Ellenorzi, hogy celallomasra szurve csak az oda tartozo, egyedi route-nevek jelennek meg.
    @Test
    void getRouteGroupsForDestinationReturnsDistinctRouteNames() {
        RouteItem a = createRoute("route-a", "Földközi-tenger", "Mediterrán körút", 100, 250, "2026-08-15");
        RouteItem b = createRoute("route-b", "Földközi-tenger", "Adriai körút", 100, 300, "2026-09-01");
        RouteItem c = createRoute("route-c", "Skandinávia", "Északi körút", 100, 300, "2026-09-01");
        when(routeItemRepository.findAll()).thenReturn(List.of(a, b, c));

        List<String> result = cruiseDataService.getRouteGroupsForDestination("Földközi-tenger");

        assertEquals(List.of("Mediterrán körút", "Adriai körút"), result);
    }

    // Segedfuggveny, amely tesztkabin objektumot epit fel a keresesi es listazasi esetekhez.
    private Cabin createCabin(String id, int capacity) {
        Cabin cabin = new Cabin();
        cabin.setId(id);
        cabin.setName(id + " cabin");
        cabin.setType("Standard");
        cabin.setCapacity(capacity);
        cabin.setPricePerNight(100);
        cabin.setDescription("Cabin description");
        cabin.setImage("image.jpg");
        cabin.setAmenities(List.of("WiFi"));
        return cabin;
    }

    // Segedfuggveny, amely teszt-utvonalat allit elo a szuresi es ferohelyszamitasi vizsgalatokhoz.
    private RouteItem createRoute(String id, String destination, String routeName, int seats, int price, String date) {
        RouteItem route = new RouteItem();
        route.setId(id);
        route.setName(id + " name");
        route.setImage("route.jpg");
        route.setDescription("Route description");
        route.setStops(List.of("Barcelona", "Marseille", "Roma"));
        route.setDate(date);
        route.setPrice(price);
        route.setDestination(destination);
        route.setRouteName(routeName);
        route.setAvailableSeats(seats);
        return route;
    }
}

