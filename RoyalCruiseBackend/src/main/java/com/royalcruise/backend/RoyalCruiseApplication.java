/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
// Ez az osztaly az alkalmazas inditopontja; innen indul a Spring Boot kontextus.
public class RoyalCruiseApplication {

    public static void main(String[] args) {
        SpringApplication.run(RoyalCruiseApplication.class, args);
    }
}

