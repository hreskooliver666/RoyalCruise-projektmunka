/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Optional;

/**
 * JWT Service - Handle JWT token generation and validation
 */
@Service
// Ez a service osztaly uzleti szabalyokat futtat, validal es az adat-hozzaferesi reteget hivja.
public class JwtService {

    // A JWT alairo kulcsot csak explicit konfiguraciobol fogadjuk el.
    // Fallback szandekosan nincs: ha hianyzik a kulcs, az alkalmazas indulaskor hibazik.
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpiration; // Default 24 hours

    private SecretKey getSigningKey() {
        // 1) A titkos kulcsból aláíró kulcsot készítünk a JWT műveletekhez.
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    /**
     * Generate JWT token for user
     */
    public String generateToken(String email) {
        // 1) Az emailből aláírt, lejárati idővel rendelkező JWT-t építünk.
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Extract email from JWT token
     */
    public Optional<String> extractEmail(String token) {
        // 1) A tokenből csak akkor adunk vissza emailt, ha az aláírás és a szerkezet is érvényes.
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.ofNullable(claims.getSubject());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Validate JWT token
     */
    public boolean isTokenValid(String token) {
        // 1) A token érvényességét a szignó és a parse sikeressége alapján döntjük el.
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}

