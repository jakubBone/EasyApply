package com.applikon.service;

import com.applikon.entity.*;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CVRepository;
import com.applikon.repository.NoteRepository;
import com.applikon.repository.ScreeningAnswerRepository;
import com.applikon.repository.UserRepository;
import com.applikon.security.TokenHasher;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    @Value("${app.token.hmac-secret}")
    private String tokenHmacSecret;

    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final CVRepository cvRepository;
    private final NoteRepository noteRepository;
    private final ScreeningAnswerRepository screeningAnswerRepository;
    private final MessageSource messageSource;

    public UserService(
            UserRepository userRepository,
            ApplicationRepository applicationRepository,
            CVRepository cvRepository,
            NoteRepository noteRepository,
            ScreeningAnswerRepository screeningAnswerRepository,
            MessageSource messageSource) {
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.cvRepository = cvRepository;
        this.noteRepository = noteRepository;
        this.screeningAnswerRepository = screeningAnswerRepository;
        this.messageSource = messageSource;
    }

    // There is no sign-up step: the first Google login is the registration. Profile fields are
    // refreshed on every login because Google is authoritative for them, not this database.
    @Transactional
    public User findOrCreateUser(String googleId, String email, String name) {
        return userRepository.findByGoogleId(googleId)
                .map(existingUser -> {
                    existingUser.updateProfile(name, email);
                    existingUser.recordLogin();
                    log.debug("User logged in (existing)");
                    return existingUser;
                })
                .orElseGet(() -> {
                    User newUser = new User(email, name, googleId);
                    newUser.recordLogin();
                    User saved = userRepository.save(newUser);
                    log.info("New user registered");
                    createDemoApplication(saved);
                    return saved;
                });
    }

    @Transactional(readOnly = true)
    public User getById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(messageSource.getMessage("error.user.notFound", null, LocaleContextHolder.getLocale())));
    }

    @Transactional
    public void saveRefreshToken(User user, String refreshToken, LocalDateTime expiry) {
        user.setRefreshToken(TokenHasher.hash(refreshToken, tokenHmacSecret), expiry);
        userRepository.save(user);
    }

    @Transactional
    public void clearRefreshToken(User user) {
        user.clearRefreshToken();
        userRepository.save(user);
    }

    @Transactional
    public User findByValidRefreshToken(String refreshToken) {
        String tokenHash = TokenHasher.hash(refreshToken, tokenHmacSecret);
        User user = userRepository.findByRefreshToken(tokenHash)
                .orElseThrow(() -> new EntityNotFoundException(messageSource.getMessage("error.token.invalid", null, LocaleContextHolder.getLocale())));

        if (!user.isRefreshTokenValid(tokenHash)) {
            throw new IllegalStateException(messageSource.getMessage("error.token.expired", null, LocaleContextHolder.getLocale()));
        }

        user.recordLogin();
        userRepository.save(user);
        return user;
    }

    @Transactional
    public void acceptPrivacyPolicy(UUID userId) {
        User user = getById(userId);
        if (user.getPrivacyPolicyAcceptedAt() == null) {
            user.acceptPrivacyPolicy();
            userRepository.save(user);
        }
    }

    @Transactional
    public void deleteAccount(UUID userId) {
        User user = getById(userId);

        // Order is dictated by the foreign keys: children before parents, user last. Files on
        // disk go first because they are the only part no transaction rollback could undo, and
        // a leftover file is worse than a leftover row for a deletion the GDPR requires.
        List<CV> cvs = cvRepository.findByUserId(userId);
        for (CV cv : cvs) {
            if (cv.getType() == CVType.FILE && cv.getFilePath() != null) {
                try {
                    Files.deleteIfExists(Paths.get(cv.getFilePath()));
                    log.debug("Deleted CV file: {}", cv.getFilePath());
                } catch (IOException e) {
                    log.warn("Could not delete CV file: {}", cv.getFilePath(), e);
                }
            }
        }

        List<Application> applications = applicationRepository.findByUserId(userId);
        for (Application app : applications) {
            noteRepository.deleteByApplicationId(app.getId());
        }

        applicationRepository.deleteAll(applications);

        cvRepository.deleteAll(cvs);

        screeningAnswerRepository.deleteByUserId(userId);

        userRepository.delete(user);
        log.info("User account deleted: {}", userId);
    }

    private void createDemoApplication(User user) {
        Application demo = Application.demoFor(user);
        applicationRepository.save(demo);

        noteRepository.save(new Note(
                """
                Recruiter: Sarah Mitchell
                Email: s.mitchell@google.com
                LinkedIn: https://linkedin.com/in/sarah-mitchell-recruiter
                """.strip(),
                demo,
                NoteCategory.OTHER
        ));

        noteRepository.save(new Note(
                "First interview scheduled for next Thursday, 10:00 AM",
                demo,
                NoteCategory.OTHER
        ));

        log.info("Demo application created for user {}", user.getId());
    }
}
