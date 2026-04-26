/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
// A schema explicit megadasa segit az IntelliJ SQL feloldasnak PostgreSQL alatt.
@Table(name = "bookings", schema = "public")
// Ez a modell osztaly/DTO az API adatszerkezetet irja le: keres, valasz vagy perzisztalt entitas mezokkel.
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(nullable = false, length = 80)
    private String routeId;

    @Column(nullable = false, length = 150)
    private String routeName;

    @Column(nullable = false, length = 80)
    private String destination;

    @Column(nullable = true, length = 80)
    private String routeDepartureFrom;

    @Column(nullable = false, length = 20)
    private String routeDate;

    @Column(nullable = false, length = 30)
    private String cabin;

    @Column
    private Integer guests;

    @Column(nullable = false)
    private int basePrice;

    @Column(nullable = false)
    private int cabinPrice;

    @Column(nullable = false)
    private int extrasPrice;

    @Column(nullable = false)
    private int totalPrice;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String extrasJson;

    @Column
    private Integer boardingStopIndex;

    @Column
    private Integer arrivalStopIndex;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }

    public void setUser(UserAccount user) {
        this.user = user;
    }

    public String getRouteId() {
        return routeId;
    }

    public void setRouteId(String routeId) {
        this.routeId = routeId;
    }

    public String getRouteName() {
        return routeName;
    }

    public void setRouteName(String routeName) {
        this.routeName = routeName;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getRouteDepartureFrom() {
        return routeDepartureFrom;
    }

    public void setRouteDepartureFrom(String routeDepartureFrom) {
        this.routeDepartureFrom = routeDepartureFrom;
    }

    public String getRouteDate() {
        return routeDate;
    }

    public void setRouteDate(String routeDate) {
        this.routeDate = routeDate;
    }

    public String getCabin() {
        return cabin;
    }

    public void setCabin(String cabin) {
        this.cabin = cabin;
    }

    public int getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(int basePrice) {
        this.basePrice = basePrice;
    }

    public int getCabinPrice() {
        return cabinPrice;
    }

    public void setCabinPrice(int cabinPrice) {
        this.cabinPrice = cabinPrice;
    }

    public int getExtrasPrice() {
        return extrasPrice;
    }

    public void setExtrasPrice(int extrasPrice) {
        this.extrasPrice = extrasPrice;
    }

    public int getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(int totalPrice) {
        this.totalPrice = totalPrice;
    }

    public String getExtrasJson() {
        return extrasJson;
    }

    public void setExtrasJson(String extrasJson) {
        this.extrasJson = extrasJson;
    }

    public int getGuests() {
        return guests == null || guests < 1 ? 1 : guests;
    }

    public void setGuests(int guests) {
        this.guests = guests;
    }

    public Integer getBoardingStopIndex() {
        return boardingStopIndex;
    }

    public void setBoardingStopIndex(Integer boardingStopIndex) {
        this.boardingStopIndex = boardingStopIndex;
    }

    public Integer getArrivalStopIndex() {
        return arrivalStopIndex;
    }

    public void setArrivalStopIndex(Integer arrivalStopIndex) {
        this.arrivalStopIndex = arrivalStopIndex;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}

