/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// Ez a modell osztaly/DTO az API adatszerkezetet irja le: keres, valasz vagy perzisztalt entitas mezokkel.
public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password
) {
}
