/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.royalcruise.backend.model.LoginRequest;
import com.royalcruise.backend.model.RegisterRequest;
import com.royalcruise.backend.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Az AuthController vegpontjainak integracios tesztjei: regisztracio, belepes, profil-lekerdezes es kijelentkezes.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

        // 1) Minden auth végpont számára tiszta adatbázisállapotot készítünk elő.
    @BeforeEach
    void setUp() {
        userAccountRepository.deleteAll();
    }

        // 2) A regisztrációs végpont sikeres és hibás ágainak ellenőrzése.
    @Test
    void testRegisterSuccess() throws Exception {
        // Arrange
        RegisterRequest request = new RegisterRequest(
                "newuser",
                "newuser@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "Férfi"
        );

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.email", is("newuser@example.com")))
                .andExpect(jsonPath("$.username", is("newuser")))
                .andExpect(jsonPath("$.role", is("USER")));
    }

    // Ellenorzi, hogy eltero jelszo es jelszo-megerosites eseten a regisztracio 400 hibaval megall.
    @Test
    void testRegisterWithMismatchedPasswords() throws Exception {
        // Arrange
        RegisterRequest request = new RegisterRequest(
                "newuser",
                "newuser@example.com",
                "password123",
                "password456",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "Férfi"
        );

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("jelszó")));
    }

    // Ellenorzi, hogy mar letezo e-maillel uj regisztracio nem engedelyezett.
    @Test
    void testRegisterWithExistingEmail() throws Exception {
        // Arrange
        RegisterRequest firstRequest = new RegisterRequest(
                "user1",
                "test@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "Férfi"
        );

        RegisterRequest secondRequest = new RegisterRequest(
                "user2",
                "test@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "Férfi"
        );

        // Register first user
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(firstRequest)))
                .andExpect(status().isCreated());

        // Try to register second user with same email
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(secondRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("email")));
    }

        // 3) A bejelentkezési végpont sikeres és hibás ágainak ellenőrzése.
    @Test
    void testLoginSuccess() throws Exception {
        // Arrange
        RegisterRequest registerRequest = new RegisterRequest(
                "testuser",
                "testuser@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "Férfi"
        );

        // Register first
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        // Login
        LoginRequest loginRequest = new LoginRequest("testuser@example.com", "password123");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.email", is("testuser@example.com")))
                .andExpect(jsonPath("$.username", is("testuser")));
    }

    // Ellenorzi, hogy hibas jelszoval a login vegpont 401 Unauthorized valaszt ad.
    @Test
    void testLoginWithWrongPassword() throws Exception {
        // Arrange
        RegisterRequest registerRequest = new RegisterRequest(
                "testuser",
                "testuser@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "Férfi"
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        // Try to login with wrong password
        LoginRequest loginRequest = new LoginRequest("testuser@example.com", "wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

        // 4) A saját profil, a token nélküli lekérés és a kijelentkezés végpontjainak ellenőrzése.
    @Test
    void testGetMeWithValidToken() throws Exception {
        // Arrange
        RegisterRequest registerRequest = new RegisterRequest(
                "testuser",
                "testuser@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "Férfi"
        );

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("token").asText();

        // Act & Assert
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("testuser@example.com")))
                .andExpect(jsonPath("$.username", is("testuser")));
    }

    // Ellenorzi, hogy token nelkul a /me vegpont nem erheto el.
    @Test
    void testGetMeWithoutToken() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    // Ellenorzi, hogy ervenyes tokennel a logout vegpont sikeresen kijelentkezteti a felhasznalot.
    @Test
    void testLogout() throws Exception {
        // Arrange
        RegisterRequest registerRequest = new RegisterRequest(
                "testuser",
                "testuser@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "Férfi"
        );

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("token").asText();

        // Act & Assert
        mockMvc.perform(post("/api/auth/logout")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }
}
