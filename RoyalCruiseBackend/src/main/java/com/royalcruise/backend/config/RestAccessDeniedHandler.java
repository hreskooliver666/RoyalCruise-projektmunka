package com.royalcruise.backend.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Egységes 403-as válasz JSON formátumban minden olyan kéréshez,
 * ahol a felhasználó be van jelentkezve, de nincs megfelelő jogosultsága.
 */
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException, ServletException {
        // Így minden admin tiltás ugyanazt a hibaüzenetet adja, függetlenül attól, hol futott el a jogosultságellenőrzés.
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\": \"Nincs jogosultság az admin adatokhoz.\"}");
    }
}
