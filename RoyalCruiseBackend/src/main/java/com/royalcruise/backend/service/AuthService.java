/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service;

import com.royalcruise.backend.model.RegisterRequest;
import com.royalcruise.backend.model.Role;
import com.royalcruise.backend.model.UserAccount;
import com.royalcruise.backend.repository.UserAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * AuthService - Handle user registration, login, and token management
 * Uses BCrypt for password hashing and JWT for token generation
 */
@Service
// Ez a service osztaly uzleti szabalyokat futtat, validal es az adat-hozzaferesi reteget hivja.
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserAccountRepository userAccountRepository, 
                      PasswordEncoder passwordEncoder, 
                      JwtService jwtService) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Register a new user
     */
    public String register(RegisterRequest request) {
        // 1) A két jelszó egyezését ellenőrizzük a fiók létrehozása előtt.
        if (!request.password().equals(request.passwordAgain())) {
            logger.warn("Registration attempt with mismatched passwords for email: {}", request.email());
            throw new IllegalArgumentException("A két jelszó nem egyezik.");
        }

        // 2) Az emailt egységes formára hozzuk, mert így keresünk és ellenőrzünk duplikációt.
        String normalizedEmail = normalizeEmail(request.email());
        if (userAccountRepository.existsByEmail(normalizedEmail)) {
            logger.warn("Registration attempt with existing email: {}", normalizedEmail);
            throw new IllegalArgumentException("Ez az email cím már regisztrálva van.");
        }

        // 3) A felhasználónév egyediségét is kiszűrjük, hogy ne jöhessen létre ütközés.
        if (userAccountRepository.existsByUsernameIgnoreCase(request.username())) {
            logger.warn("Registration attempt with existing username: {}", request.username());
            throw new IllegalArgumentException("Ez a felhasználónév már foglalt.");
        }

        // 4) A new user account entitást kitöltjük és titkosított jelszóval mentjük.
        UserAccount account = new UserAccount();
        account.setUsername(request.username());
        account.setEmail(normalizedEmail);
        account.setPassword(passwordEncoder.encode(request.password())); // BCrypt hashing
        account.setAddress(request.address());
        account.setCountry(request.country());
        account.setPostalCode(request.postalCode());
        account.setPhone(request.phone());
        account.setGender(request.gender());
        account.setRole(Role.USER);
        userAccountRepository.save(account);

        logger.info("User registered successfully: {}", normalizedEmail);
        // 5) Sikeres regisztráció után JWT tokent adunk vissza a kliensnek.
        return jwtService.generateToken(normalizedEmail);
    }

    /**
     * Login user with email and password
     */
    public String login(String email, String password) {
        // 1) A bejelentkezéshez az emailt egységes formában keressük.
        String normalizedEmail = normalizeEmail(email);
        UserAccount storedUser = userAccountRepository.findByEmail(normalizedEmail).orElse(null);
        
        // 2) Hibás email vagy jelszó esetén nem adunk ki tokent.
        if (storedUser == null || !passwordEncoder.matches(password, storedUser.getPassword())) {
            logger.warn("Login attempt failed for email: {}", normalizedEmail);
            throw new IllegalArgumentException("Hibás email vagy jelszó.");
        }

        logger.info("User logged in successfully: {}", normalizedEmail);
        // 3) Sikeres hitelesítés után JWT tokent generálunk.
        return jwtService.generateToken(normalizedEmail);
    }

    /**
     * Get email from JWT token
     */
    public Optional<String> getEmailByToken(String token) {
        // 1) Üres token esetén azonnal üres eredményt adunk vissza.
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return jwtService.extractEmail(token);
    }

    /**
     * Get user by JWT token
     */
    public Optional<UserAccount> getUserByToken(String token) {
        // 1) A tokenből kinyert email alapján lekérjük a felhasználót.
        return getEmailByToken(token)
                .flatMap(userAccountRepository::findByEmail);
    }

    /**
     * Get user by email
     */
    public Optional<UserAccount> getUserByEmail(String email) {
        // 1) Az email kereséshez ugyanazt a normalizálási szabályt használjuk mindenhol.
        return userAccountRepository.findByEmail(normalizeEmail(email));
    }

    /**
     * Issue a fresh access token for a known user email.
     */
    public String issueTokenForUser(String email) {
        // 1) A token kiadasa elott ugyanarra a normalizalt email formatumra allunk, mint login/regisztracio esetben.
        return jwtService.generateToken(normalizeEmail(email));
    }

    /**
     * Check if token belongs to admin
     */
    public boolean isAdmin(String token) {
        // 1) Érvénytelen tokenből automatikusan nem lehet admin jogot levezetni.
        if (!jwtService.isTokenValid(token)) {
            return false;
        }
        return getUserByToken(token)
                .map(user -> user.getRole() == Role.ADMIN)
                .orElse(false);
    }

    /**
     * Validate token
     */
    public boolean isTokenValid(String token) {
        // 1) A token akkor tekinthető validnak, ha az aláírás jó és email is kinyerhető belőle.
        return jwtService.isTokenValid(token) && jwtService.extractEmail(token).isPresent();
    }

    /**
     * Normalize email (trim and lowercase)
     */
    private String normalizeEmail(String email) {
        // 1) Az email címeket trimeljük és kisbetűsítjük a stabil összehasonlításhoz.
        return email == null ? "" : email.trim().toLowerCase();
    }
}
