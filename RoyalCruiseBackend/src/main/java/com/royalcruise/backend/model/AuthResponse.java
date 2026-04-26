/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.model;

// Ez a modell osztaly/DTO az API adatszerkezetet irja le: keres, valasz vagy perzisztalt entitas mezokkel.
public record AuthResponse(
        String token,
        String email,
        String username,
        String role,
        String address,
        String country,
        String postalCode,
        String phone,
        String gender,
        String createdAt
) {
}
