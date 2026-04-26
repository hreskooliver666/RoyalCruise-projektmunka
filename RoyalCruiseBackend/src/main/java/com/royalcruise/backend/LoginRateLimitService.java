package com.royalcruise.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory login rate limiter service a brute-force probalkozasok lassitasara.
 *
 * Kulcsonkent (email + kliens IP) nyilvantartjuk:
 * - az aktualis hibas probalkozasi ablak kezdetet,
 * - a hibak szamat,
 * - es opcionális blokkolasi idot.
 */
@Service
public class LoginRateLimitService {

    private final int maxAttempts;
    private final long windowSeconds;
    private final long blockSeconds;

    // A map kulcsa: normalizalt email + "|" + kliens IP.
    private final Map<String, AttemptState> attemptsByKey = new ConcurrentHashMap<>();

    public LoginRateLimitService(
            @Value("${app.auth.login-rate-limit.max-attempts:5}") int maxAttempts,
            @Value("${app.auth.login-rate-limit.window-seconds:300}") long windowSeconds,
            @Value("${app.auth.login-rate-limit.block-seconds:300}") long blockSeconds
    ) {
        this.maxAttempts = maxAttempts;
        this.windowSeconds = windowSeconds;
        this.blockSeconds = blockSeconds;
    }

    public boolean isBlocked(String key) {
        // A blokk aktiv, ha a blokkolas lejarta nagyobb, mint a jelenlegi epoch masodperc.
        AttemptState state = attemptsByKey.get(key);
        if (state == null) {
            return false;
        }
        long now = Instant.now().getEpochSecond();
        return state.blockedUntilEpochSecond > now;
    }

    public void recordSuccess(String key) {
        // Sikeres login utan toroljuk az adott kulcs hibas probalkozasi allapotat.
        attemptsByKey.remove(key);
    }

    public void recordFailure(String key) {
        // Hibas login eseten frissitjuk az ablakot, noveljuk a szamlalot,
        // es limit tullepeskor ideiglenes blokkot allitunk be.
        long now = Instant.now().getEpochSecond();

        attemptsByKey.compute(key, (ignored, existing) -> {
            if (existing == null || (now - existing.windowStartedEpochSecond) >= windowSeconds) {
                // Uj ablak indul elso hibaval.
                return new AttemptState(now, 1, 0);
            }

            int updatedFailures = existing.failedAttempts + 1;
            if (updatedFailures >= maxAttempts) {
                // Limit utan blokkoljuk az adott kulcsot a konfiguralt ideig.
                return new AttemptState(now, 0, now + blockSeconds);
            }

            return new AttemptState(existing.windowStartedEpochSecond, updatedFailures, existing.blockedUntilEpochSecond);
        });
    }

    // Egyszeru immutable allapotleiro a konkurrens map bejegyzeshez.
    private record AttemptState(
            long windowStartedEpochSecond,
            int failedAttempts,
            long blockedUntilEpochSecond
    ) {
    }
}
