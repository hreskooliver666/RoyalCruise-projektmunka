
package com.royalcruise.backend.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Ez a modell osztaly/DTO az API adatszerkezetet irja le: keres, valasz vagy perzisztalt entitas mezokkel.
public record RegisterRequest(
        @NotBlank(message = "A felhasználónév kötelező.")
        @Size(min = 3, max = 30, message = "A felhasználónév 3 és 30 karakter között lehet.")
        String username,
        @Email @NotBlank String email,
        @NotBlank(message = "A jelszó kötelező.")
        @Size(min = 8, max = 64, message = "A jelszó 8 és 64 karakter között lehet.")
        String password,
        @NotBlank String passwordAgain,
        @NotBlank(message = "A lakcím kötelező.") String address,
        @NotBlank(message = "Az ország kötelező.") String country,
        @NotBlank(message = "Az irányítószám kötelező.")
        @Pattern(regexp = "^[0-9A-Za-z\\- ]{3,12}$", message = "Az irányítószám formátuma érvénytelen.")
        String postalCode,
        @NotBlank(message = "A telefonszám kötelező.")
        @Pattern(regexp = "^\\+?[0-9 ]{7,15}$", message = "A telefonszám formátuma érvénytelen.")
        String phone,
        @NotBlank @Pattern(regexp = "Férfi|Nő", message = "A nem mező csak 'Férfi' vagy 'Nő' lehet.") String gender
) {
}
