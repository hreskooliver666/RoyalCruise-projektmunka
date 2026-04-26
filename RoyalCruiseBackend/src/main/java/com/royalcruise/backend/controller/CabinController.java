/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.controller;

import com.royalcruise.backend.model.Cabin;
import com.royalcruise.backend.CruiseDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cabins")
// Ez a controller HTTP vegpontokat ad, bemeneti kerest fogad es a megfelelo service/repository logikara delegal.
public class CabinController {

    private final CruiseDataService cruiseDataService;

    public CabinController(CruiseDataService cruiseDataService) {
        this.cruiseDataService = cruiseDataService;
    }

    @GetMapping
    public List<Cabin> getAllCabins() {
        // 1) Az összes kabin visszaadása a nyitó- és részletező oldalakhoz.
        return cruiseDataService.getAllCabins();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cabin> getCabinById(@PathVariable String id) {
        // 1) Egyetlen kabin visszaadása azonosító alapján, vagy 404 ha hiányzik.
        return cruiseDataService.getCabinById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public List<Cabin> searchCabins(@RequestParam(required = false) Integer guests) {
        // 1) A vendégszám alapján szűrt kabinlista visszaadása.
        return cruiseDataService.searchCabins(guests);
    }
}

