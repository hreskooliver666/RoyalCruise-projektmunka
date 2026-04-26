package com.royalcruise.backend.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
// A schema explicit megadasa segit az IntelliJ SQL feloldasnak PostgreSQL alatt.
@Table(name = "routes", schema = "public")
// Az adatbázisban tárolt hajóútvonalat és annak aktuális szabad férőhelyeit modellezi.
public class RouteItem {

    @Id
    @Column(nullable = false, length = 50)
    private String id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 500)
    private String image;

    @Column(nullable = false, length = 500)
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "route_stops", schema = "public", joinColumns = @JoinColumn(name = "route_id"))
    @Column(name = "stop", nullable = false, length = 120)
    @OrderColumn(name = "stop_order")
    private List<String> stops = new ArrayList<>();

    @Column(nullable = false, length = 20)
    private String date;

    @Column(nullable = false)
    private int price;

    @Column(nullable = false, length = 80)
    private String destination;

    @Column(nullable = false, length = 120)
    private String routeName;

    @Column(nullable = false)
    private int availableSeats;

    @Transient
    private Map<String, Integer> cabinAvailableSeats = new LinkedHashMap<>();

    public RouteItem() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getStops() {
        return stops;
    }

    public void setStops(List<String> stops) {
        this.stops = stops;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public int getPrice() {
        return price;
    }

    public void setPrice(int price) {
        this.price = price;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getRouteName() {
        return routeName;
    }

    public void setRouteName(String routeName) {
        this.routeName = routeName;
    }

    public int getAvailableSeats() {
        return availableSeats;
    }

    public void setAvailableSeats(int availableSeats) {
        this.availableSeats = availableSeats;
    }

    public Map<String, Integer> getCabinAvailableSeats() {
        return cabinAvailableSeats;
    }

    public void setCabinAvailableSeats(Map<String, Integer> cabinAvailableSeats) {
        // Másolatot tart meg, hogy a hívó fél későbbi módosításai ne írják át a belső állapotot.
        this.cabinAvailableSeats = cabinAvailableSeats == null ? new LinkedHashMap<>() : new LinkedHashMap<>(cabinAvailableSeats);
    }
}
