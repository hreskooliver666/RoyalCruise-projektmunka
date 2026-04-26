/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service;

import com.royalcruise.backend.model.RegisterRequest;
import com.royalcruise.backend.model.Role;
import com.royalcruise.backend.model.UserAccount;
import com.royalcruise.backend.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Az AuthService unit tesztjei: regisztracios validaciok, login agak es token/jogosultsag segedfuggvenyek.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private JwtService jwtService;

    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    // 1) Regisztrációs és bejelentkezési hitelesítési környezet előkészítése.
    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        authService = new AuthService(userAccountRepository, passwordEncoder, jwtService);
    }

    // 2) A sikeres regisztráció esetén tokenkiadást és mentést ellenőrző tesztcsoport.
    @Test
    void testRegisterUserSuccess() {
        // Arrange
        RegisterRequest request = new RegisterRequest(
                "testuser",
                "test@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "MALE"
        );

        when(userAccountRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(userAccountRepository.existsByUsernameIgnoreCase("testuser")).thenReturn(false);
        when(jwtService.generateToken("test@example.com")).thenReturn("test-token");
        when(userAccountRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        String token = authService.register(request);

        // Assert
        assertNotNull(token);
        assertEquals("test-token", token);
        verify(userAccountRepository).save(any(UserAccount.class));
    }

    // 3) A hibás regisztrációs bemeneteket elutasító tesztek csoportja.
    @Test
    void testRegisterUserPasswordMismatch() {
        // Arrange
        RegisterRequest request = new RegisterRequest(
                "testuser",
                "test@example.com",
                "password123",
                "password456",  // Different password
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "MALE"
        );

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(request)
        );
        assertEquals("A két jelszó nem egyezik.", exception.getMessage());
        verify(userAccountRepository, never()).save(any(UserAccount.class));
    }

    // Ellenorzi, hogy mar regisztralt e-mail eseten a regisztracio megfelelo hibauezenettel meghiisul.
    @Test
    void testRegisterUserEmailAlreadyExists() {
        // Arrange
        RegisterRequest request = new RegisterRequest(
                "testuser",
                "test@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "MALE"
        );

        when(userAccountRepository.existsByEmail("test@example.com")).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(request)
        );
        assertEquals("Ez az email cím már regisztrálva van.", exception.getMessage());
        verify(userAccountRepository, never()).save(any(UserAccount.class));
    }

    // Ellenorzi, hogy foglalt felhasznalonev eseten a rendszer elutasitja az uj fiok letrehozasat.
    @Test
    void testRegisterUserUsernameAlreadyExists() {
        // Arrange
        RegisterRequest request = new RegisterRequest(
                "testuser",
                "test@example.com",
                "password123",
                "password123",
                "123 Main St",
                "Hungary",
                "1234",
                "+36301234567",
                "MALE"
        );

        when(userAccountRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(userAccountRepository.existsByUsernameIgnoreCase("testuser")).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(request)
        );
        assertEquals("Ez a felhasználónév már foglalt.", exception.getMessage());
        verify(userAccountRepository, never()).save(any(UserAccount.class));
    }

    // 4) A bejelentkezési ágat és a tokenellenőrző metódusokat fedő tesztek.
    @Test
    void testLoginSuccess() {
        // Arrange
        String email = "test@example.com";
        String password = "password123";
        
        UserAccount user = new UserAccount();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.USER);

        when(userAccountRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(jwtService.generateToken(email)).thenReturn("test-token");

        // Act
        String token = authService.login(email, password);

        // Assert
        assertNotNull(token);
        assertEquals("test-token", token);
    }

    // Ellenorzi, hogy nem letezo e-mail cimre a login folyamat hitelesitesi hibat ad.
    @Test
    void testLoginInvalidEmail() {
        // Arrange
        String email = "nonexistent@example.com";
        String password = "password123";

        when(userAccountRepository.findByEmail(email)).thenReturn(Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authService.login(email, password)
        );
        assertEquals("Hibás email vagy jelszó.", exception.getMessage());
    }

    // Ellenorzi, hogy letezo e-mail, de hibas jelszo eseten a login elutasitasra kerul.
    @Test
    void testLoginInvalidPassword() {
        // Arrange
        String email = "test@example.com";
        String correctPassword = "password123";
        String wrongPassword = "wrongpassword";
        
        UserAccount user = new UserAccount();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(correctPassword));
        user.setRole(Role.USER);

        when(userAccountRepository.findByEmail(email)).thenReturn(Optional.of(user));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authService.login(email, wrongPassword)
        );
        assertEquals("Hibás email vagy jelszó.", exception.getMessage());
    }

    // 5) A tokenből felhasználót és jogosultságot visszaadó segédfüggvények ellenőrzése.
    @Test
    void testGetUserByToken() {
        // Arrange
        String token = "test-token";
        String email = "test@example.com";
        
        UserAccount user = new UserAccount();
        user.setEmail(email);

        when(jwtService.extractEmail(token)).thenReturn(Optional.of(email));
        when(userAccountRepository.findByEmail(email)).thenReturn(Optional.of(user));

        // Act
        Optional<UserAccount> result = authService.getUserByToken(token);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(email, result.get().getEmail());
    }

    // Ellenorzi, hogy ervenyes admin tokennel az isAdmin segedfuggveny true ertekkel ter vissza.
    @Test
    void testIsAdmin() {
        // Arrange
        String token = "admin-token";
        String email = "admin@example.com";
        
        UserAccount admin = new UserAccount();
        admin.setEmail(email);
        admin.setRole(Role.ADMIN);

        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractEmail(token)).thenReturn(Optional.of(email));
        when(userAccountRepository.findByEmail(email)).thenReturn(Optional.of(admin));

        // Act
        boolean isAdmin = authService.isAdmin(token);

        // Assert
        assertTrue(isAdmin);
    }

    // Ellenorzi, hogy ervenytelen tokennel az isAdmin logika automatikusan false eredmenyt ad.
    @Test
    void testIsAdminInvalidToken() {
        // Arrange
        String token = "invalid-token";

        when(jwtService.isTokenValid(token)).thenReturn(false);

        // Act
        boolean isAdmin = authService.isAdmin(token);

        // Assert
        assertFalse(isAdmin);
    }

    // Ellenorzi, hogy ervenyes tokennel es kinyerheto e-maillel az isTokenValid true lesz.
    @Test
    void testIsTokenValid() {
        // Arrange
        String token = "valid-token";

        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractEmail(token)).thenReturn(Optional.of("test@example.com"));

        // Act
        boolean isValid = authService.isTokenValid(token);

        // Assert
        assertTrue(isValid);
    }

    // Ellenorzi, hogy ervenytelen tokennel az isTokenValid false erteket ad vissza.
    @Test
    void testIsTokenInvalid() {
        // Arrange
        String token = "invalid-token";

        when(jwtService.isTokenValid(token)).thenReturn(false);

        // Act
        boolean isValid = authService.isTokenValid(token);

        // Assert
        assertFalse(isValid);
    }
}
