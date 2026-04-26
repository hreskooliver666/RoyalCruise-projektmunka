/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.controller;

import com.royalcruise.backend.model.AuthResponse;
import com.royalcruise.backend.model.ErrorResponse;
import com.royalcruise.backend.model.LoginRequest;
import com.royalcruise.backend.model.RegisterRequest;
import com.royalcruise.backend.service.AuthService;
import com.royalcruise.backend.service.LoginRateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
// Ez a controller HTTP vegpontokat ad, bemeneti kerest fogad es a megfelelo service/repository logikara delegal.
public class AuthController {

    private final AuthService authService;
    private final LoginRateLimitService loginRateLimitService;

    public AuthController(AuthService authService, LoginRateLimitService loginRateLimitService) {
        this.authService = authService;
        this.loginRateLimitService = loginRateLimitService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        // 1) Regisztrációs kérés feldolgozása és válasz DTO összeállítása.
        try {
            String token = authService.register(request);
            return authService.getUserByEmail(request.email())
                    .<ResponseEntity<?>>map(user -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(new AuthResponse(
                            token,
                            user.getEmail(),
                            user.getUsername(),
                            user.getRole().name(),
                            user.getAddress(),
                            user.getCountry(),
                            user.getPostalCode(),
                            user.getPhone(),
                            user.getGender(),
                            user.getCreatedAt() != null ? user.getCreatedAt().toString() : null
                        )))
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(new ErrorResponse("Sikertelen regisztráció.")));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ErrorResponse(ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        // 1) A brute-force vedelem kulcsa email+IP, igy ugyanarra a fiokra/forrasra tudunk korrekt limitet alkalmazni.
        String rateLimitKey = buildRateLimitKey(request.email(), httpRequest.getRemoteAddr());

        // 2) Aktív blokk esetén mar a hitelesítést sem próbáljuk meg.
        if (loginRateLimitService.isBlocked(rateLimitKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Túl sok sikertelen bejelentkezési próbálkozás. Próbáld újra később."));
        }

        // 3) Sikeres login esetén token + user DTO, es toroljuk a korabbi hibaszamlalot.
        try {
            String token = authService.login(request.email(), request.password());
            loginRateLimitService.recordSuccess(rateLimitKey);
            return authService.getUserByEmail(request.email())
                    .<ResponseEntity<?>>map(user -> ResponseEntity.ok(
                        new AuthResponse(
                            token,
                            user.getEmail(),
                            user.getUsername(),
                            user.getRole().name(),
                            user.getAddress(),
                            user.getCountry(),
                            user.getPostalCode(),
                            user.getPhone(),
                            user.getGender(),
                            user.getCreatedAt() != null ? user.getCreatedAt().toString() : null
                        )
                    ))
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(new ErrorResponse("Hibás email vagy jelszó.")));
        } catch (IllegalArgumentException ex) {
            // 4) Sikertelen hitelesitesnel noveljuk a hibaszamlalot, hogy a limiteles tenylegesen ervenyesuljon.
            loginRateLimitService.recordFailure(rateLimitKey);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(ex.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestHeader(value = "Authorization", required = false) String authorization) {
        // 1) A kliens a meglevo Bearer tokennel kerhet uj access tokent session-hosszabbitashoz.
        String token = extractBearerToken(authorization);
        if (token == null || !authService.isTokenValid(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Érvénytelen vagy hiányzó token."));
        }

        // 2) A tokent felhasznalova oldjuk, majd ugyanahhoz a fiokhoz uj tokent allitunk ki.
        return authService.getUserByToken(token)
                .<ResponseEntity<?>>map(user -> {
                    String refreshedToken = authService.issueTokenForUser(user.getEmail());
                    return ResponseEntity.ok(new AuthResponse(
                            refreshedToken,
                            user.getEmail(),
                            user.getUsername(),
                            user.getRole().name(),
                            user.getAddress(),
                            user.getCountry(),
                            user.getPostalCode(),
                            user.getPhone(),
                            user.getGender(),
                            user.getCreatedAt() != null ? user.getCreatedAt().toString() : null
                    ));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("Érvénytelen vagy hiányzó token.")));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        // 1) Bearer token kinyerése, érvényesség-ellenőrzés és felhasználó visszaadása.
        String token = extractBearerToken(authorization);
        if (token == null || !authService.isTokenValid(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Érvénytelen vagy hiányzó token."));
        }
        return authService.getUserByToken(token)
            .<ResponseEntity<?>>map(user -> ResponseEntity.ok(
                new AuthResponse(
                        token,
                        user.getEmail(),
                        user.getUsername(),
                        user.getRole().name(),
                        user.getAddress(),
                        user.getCountry(),
                        user.getPostalCode(),
                        user.getPhone(),
                        user.getGender(),
                        user.getCreatedAt() != null ? user.getCreatedAt().toString() : null
                )
            ))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Érvénytelen vagy hiányzó token.")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        // 1) A stateless JWT miatt itt nincs szerveroldali tokenérvénytelenítés.
        return ResponseEntity.noContent().build();
    }

    private String extractBearerToken(String authorization) {
        // 1) Csak a szabályos Bearer fejlécből vágjuk ki a tényleges JWT tokent.
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7);
    }

    private String buildRateLimitKey(String email, String clientIp) {
        // 1) Az email normalizalasa csokkenti a kikerulesi lehetosegeket (pl. kis/nagybetu, whitespace variansok).
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        String normalizedIp = clientIp == null ? "unknown" : clientIp.trim();
        return normalizedEmail + "|" + normalizedIp;
    }
}

