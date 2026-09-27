package com.sunurecolte.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Gestionnaire centralisé des exceptions.
 * Toutes les erreurs applicatives remontent ici pour produire une réponse JSON cohérente.
 *
 * Journalisation :
 * - erreurs client (4xx) : niveau WARN, sans trace complète (bruit inutile) ;
 * - erreurs serveur (5xx) : niveau ERROR avec la trace complète, pour diagnostic.
 * Les détails internes d'une erreur 500 ne sont jamais exposés dans la réponse HTTP.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // --- 404 Not Found ---
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Ressource introuvable : {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(HttpStatus.NOT_FOUND.value(), ex.getMessage()));
    }

    // --- 400 Bad Request (règle métier) ---
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException ex) {
        log.warn("Règle métier violée : {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    // --- 403 Forbidden ---
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException ex) {
        log.warn("Accès refusé : {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(HttpStatus.FORBIDDEN.value(), ex.getMessage()));
    }

    // --- 400 Corps de requête illisible (JSON malformé, valeur d'enum inconnue, type invalide) ---
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException ex) {
        log.warn("Corps de requête illisible : {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(),
                        "Requête invalide : corps malformé ou valeur non autorisée."));
    }

    // --- 400 Validation @Valid (champs invalides) ---
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        log.warn("Validation échouée : {}", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ValidationErrorResponse(HttpStatus.BAD_REQUEST.value(), "Données invalides", errors));
    }

    // --- 400 Contraintes de validation (path/query params) ---
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        log.warn("Contrainte de validation violée : {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    // --- 500 Erreur interne non gérée ---
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Erreur interne non gérée", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        "Une erreur interne est survenue. Veuillez réessayer."));
    }

    // --- Réponse d'erreur standard ---
    public record ErrorResponse(int statut, String message, LocalDateTime timestamp) {
        public ErrorResponse(int statut, String message) {
            this(statut, message, LocalDateTime.now());
        }
    }

    // --- Réponse d'erreur avec détail des champs invalides ---
    public record ValidationErrorResponse(int statut, String message, Map<String, String> erreurs, LocalDateTime timestamp) {
        public ValidationErrorResponse(int statut, String message, Map<String, String> erreurs) {
            this(statut, message, erreurs, LocalDateTime.now());
        }
    }
}
