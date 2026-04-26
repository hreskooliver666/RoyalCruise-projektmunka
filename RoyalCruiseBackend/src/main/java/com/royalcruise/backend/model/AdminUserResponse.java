/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.model;

import java.time.LocalDateTime;

// Ez a modell osztaly/DTO az API adatszerkezetet irja le: keres, valasz vagy perzisztalt entitas mezokkel.
public record AdminUserResponse(
        Long id,
        String username,
        String email,
        String address,
        String country,
        String postalCode,
        String phone,
        String gender,
        String role,
        LocalDateTime createdAt
) {
}
