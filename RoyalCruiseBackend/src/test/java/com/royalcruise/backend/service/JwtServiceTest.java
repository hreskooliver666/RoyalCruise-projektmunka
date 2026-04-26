/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service;

import com.royalcruise.backend.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * A JwtService unit tesztjei: token generalas, email kinyeres, ervenyesseg es kulonbozo token esetek.
 */
@SpringBootTest
@ActiveProfiles("test")
class JwtServiceTest {

    @Autowired
    private JwtService jwtService;

    private String testEmail;

    // 1) JWT tokengenerálási és érvényesítési alapállapot előkészítése.
    @BeforeEach
    void setUp() {
        testEmail = "test@example.com";
    }

    // 2) A token létrehozását és alapformátumát ellenőrző tesztek.
    @Test
    void testGenerateToken() {
        // Act
        String token = jwtService.generateToken(testEmail);

        // Assert
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    // 3) A tokenből való email-kinyerést és hibás tokenkezelést ellenőrző tesztek.
    @Test
    void testExtractEmailFromToken() {
        // Arrange
        String token = jwtService.generateToken(testEmail);

        // Act
        Optional<String> extractedEmail = jwtService.extractEmail(token);

        // Assert
        assertTrue(extractedEmail.isPresent());
        assertEquals(testEmail, extractedEmail.get());
    }

    // Ellenorzi, hogy ervenytelen tokenbol az email kinyerese ures Optional eredmenyt ad.
    @Test
    void testExtractEmailFromInvalidToken() {
        // Arrange
        String invalidToken = "invalid-token";

        // Act
        Optional<String> extractedEmail = jwtService.extractEmail(invalidToken);

        // Assert
        assertTrue(extractedEmail.isEmpty());
    }

    // 4) A token validitásának és egyediségének ellenőrzése.
    @Test
    void testIsTokenValid() {
        // Arrange
        String token = jwtService.generateToken(testEmail);

        // Act
        boolean isValid = jwtService.isTokenValid(token);

        // Assert
        assertTrue(isValid);
    }

    // Ellenorzi, hogy hibas vagy manipulalt token eseten a validacios ellenorzes false.
    @Test
    void testIsTokenInvalid() {
        // Arrange
        String invalidToken = "invalid-token";

        // Act
        boolean isValid = jwtService.isTokenValid(invalidToken);

        // Assert
        assertFalse(isValid);
    }

    // 5) A több token és a különböző email-címek viselkedését ellenőrző tesztek.
    @Test
    void testGenerateMultipleTokens() {
        // Act
        String token1 = jwtService.generateToken(testEmail);
        String token2 = jwtService.generateToken(testEmail);

        // Assert
        assertNotNull(token1);
        assertNotNull(token2);
        // Azonos ezredmásodpercben készülő tokenek lehetnek byte-ra azonosak,
        // ezért itt a stabil elvárás az, hogy mindkettő érvényes és ugyanarra a subjectre oldódik.
        assertTrue(jwtService.isTokenValid(token1));
        assertTrue(jwtService.isTokenValid(token2));
        assertEquals(testEmail, jwtService.extractEmail(token1).orElse(""));
        assertEquals(testEmail, jwtService.extractEmail(token2).orElse(""));
    }

    // Ellenorzi, hogy kulonbozo e-mail cimekhez kulonbozo tokenek tartoznak, es az email visszafejtheto.
    @Test
    void testDifferentEmailsProduceDifferentTokens() {
        // Act
        String token1 = jwtService.generateToken("user1@example.com");
        String token2 = jwtService.generateToken("user2@example.com");

        // Assert
        assertNotNull(token1);
        assertNotNull(token2);
        assertEquals("user1@example.com", jwtService.extractEmail(token1).get());
        assertEquals("user2@example.com", jwtService.extractEmail(token2).get());
    }
}
