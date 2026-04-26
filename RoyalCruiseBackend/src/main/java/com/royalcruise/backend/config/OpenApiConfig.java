package com.royalcruise.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger Configuration
 * Provides API documentation at /swagger-ui.html
 */
@Configuration
// Az API dokumentációját és a Bearer tokenes védelmi sémát írja le az OpenAPI konfigurációban.
public class OpenApiConfig {

    @Bean
    // Összeállítja az OpenAPI leírást, amelyet a Swagger UI jelenít meg.
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("RoyalCruise API")
                        .version("1.0.0")
                        .description("REST API for RoyalCruise - Luxury Cruise Booking System")
                        .contact(new Contact()
                                .name("RoyalCruise Support")
                                .email("info@royalcruise.hu"))
                        .license(new License()
                                .name("MIT")
                                .url("https://opensource.org/licenses/MIT")))
                .addSecurityItem(new SecurityRequirement().addList("Bearer Token"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("Bearer Token",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT token for authentication")));
    }
}
