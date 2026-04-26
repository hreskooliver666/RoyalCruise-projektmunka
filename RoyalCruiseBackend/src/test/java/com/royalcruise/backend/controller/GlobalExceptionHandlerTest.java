/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.service.controller;

import com.royalcruise.backend.controller.GlobalExceptionHandler;
import com.royalcruise.backend.model.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    // 1) A validációs hibakezelő két fő ágának ellenőrzése.
    @Test
    void handleValidationReturnsFirstFieldErrorMessage() {
        MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("bookingRequest", "routeId", "A routeId kötelező.");

        when(exception.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));

        ResponseEntity<ErrorResponse> response = handler.handleValidation(exception);

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("A routeId kötelező.", response.getBody().message());
    }

    // Ellenorzi, hogy mezo-hibak nelkul az altalanos ervenytelen keres uzenet kerul visszaadasra.
    @Test
    void handleValidationReturnsDefaultMessageWhenNoFieldErrorExists() {
        MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);

        when(exception.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of());

        ResponseEntity<ErrorResponse> response = handler.handleValidation(exception);

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Érvénytelen kérés.", response.getBody().message());
    }
}
