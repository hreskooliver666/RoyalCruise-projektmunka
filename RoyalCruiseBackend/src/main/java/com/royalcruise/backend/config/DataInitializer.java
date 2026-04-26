/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.config;

import com.royalcruise.backend.model.Role;
import com.royalcruise.backend.model.UserAccount;
import com.royalcruise.backend.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

@Configuration
// Ez a konfiguracios osztaly indulaskor ellenorzi es szukseg eseten letrehozza az admin felhasznalot.
public class DataInitializer {

    @Value("${app.bootstrap.admin.enabled:false}")
    private boolean adminBootstrapEnabled;

    @Value("${app.bootstrap.admin.email:}")
    private String adminEmail;

    @Value("${app.bootstrap.admin.password:}")
    private String adminRawPassword;

    @Bean
    CommandLineRunner initAdminUser(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder) {
        // 1) Az admin bootstrap csak explicit bekapcsolas mellett fusson.
        return args -> {
            if (!adminBootstrapEnabled) {
                return;
            }

            // 2) Bekapcsolt bootstrapnel kotelezo az email es a jelszo megadasa.
            if (!StringUtils.hasText(adminEmail) || !StringUtils.hasText(adminRawPassword)) {
                throw new IllegalStateException("Az admin bootstrap be van kapcsolva, de az admin email/jelszo hianyzik.");
            }

            String normalizedAdminEmail = adminEmail.trim().toLowerCase();

            // 2) Megnézzük, létezik-e már az admin felhasználó az adatbázisban.
            UserAccount admin = userAccountRepository.findByEmail(normalizedAdminEmail).orElse(null);

            if (admin == null) {
                // 3) Ha még nincs admin, akkor létrehozzuk az alapértelmezett jogosultsággal.
                UserAccount newAdmin = new UserAccount();
                newAdmin.setUsername("admin");
                newAdmin.setEmail(normalizedAdminEmail);
                newAdmin.setPassword(passwordEncoder.encode(adminRawPassword));
                newAdmin.setAddress("Nyíregyháza");
                newAdmin.setCountry("Hungary");
                newAdmin.setPostalCode("4400");
                newAdmin.setPhone("+3610000000");
                newAdmin.setGender("Férfi");
                newAdmin.setRole(Role.ADMIN);
                userAccountRepository.save(newAdmin);
                return;
            }

            // 4) A korábbi seedelt admin rekordok jelszavát is újrakódoljuk, ha még nem BCrypt formátumú.
            if (!passwordEncoder.matches(adminRawPassword, admin.getPassword())) {
                admin.setPassword(passwordEncoder.encode(adminRawPassword));
                admin.setRole(Role.ADMIN);
                userAccountRepository.save(admin);
            }
        };
    }
}
