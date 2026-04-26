/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.controller;

import com.royalcruise.backend.model.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
// Ez a controller HTTP vegpontokat ad, bemeneti kerest fogad es a megfelelo service/repository logikara delegal.
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        // 1) A validációs hibákból az első konkrét mezőhibát emeljük ki.
        FieldError firstFieldError = exception.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);

    // 2) Ha nincs mezőszintű hiba, akkor általános érvénytelen kérés üzenetet használunk.
        String message = firstFieldError != null
                ? firstFieldError.getDefaultMessage()
                : "Érvénytelen kérés.";

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(message));
    }
}

