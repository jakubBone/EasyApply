package com.applikon.service;

import com.applikon.entity.Application;
import com.applikon.entity.ApplicationStatus;
import com.applikon.entity.CV;
import com.applikon.entity.CVType;
import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CVRepository;
import com.applikon.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.MessageSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CVService tests")
class CVServiceTest {

    private static final UUID TEST_USER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock
    private CVRepository cvRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MessageSource messageSource;

    @Captor
    private ArgumentCaptor<CV> cvCaptor;

    @TempDir
    Path tempDir;

    private CVService cvService;
    private User testUser;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(messageSource.getMessage(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(java.util.Locale.class)))
            .thenAnswer(inv -> inv.getArgument(0));
        cvService = new CVService(cvRepository, applicationRepository, userRepository, messageSource, tempDir.toString());
        testUser = new User("cv@test.com", "CV User", "google-cv");
        setField(testUser, "id", TEST_USER_ID);
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    private static CV cv(long id, String name, CVType type) {
        CV cv = new CV();
        setField(cv, "id", id);
        cv.setOriginalFileName(name);
        cv.setType(type);
        if (type == CVType.LINK) {
            cv.setExternalUrl("https://example.com/" + name);
        }
        return cv;
    }

    private static Application application(long id) {
        Application app = new Application();
        setField(app, "id", id);
        app.setCompany("Google");
        app.setPosition("Developer");
        app.setStatus(ApplicationStatus.SENT);
        return app;
    }

    @Nested
    class UploadTests {

        @Test
        void uploadCV_validPdf_savesCvAndFile() throws IOException {
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "cv.pdf",
                    "application/pdf",
                    "%PDF-1.4\nbody".getBytes()
            );

            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(testUser));
            when(cvRepository.save(any(CV.class))).thenAnswer(inv -> {
                CV saved = inv.getArgument(0);
                setField(saved, "id", 1L);
                return saved;
            });

            CV result = cvService.uploadCV(file, TEST_USER_ID);

            verify(cvRepository).save(cvCaptor.capture());
            CV captured = cvCaptor.getValue();
            assertEquals(CVType.FILE, captured.getType());
            assertEquals("cv.pdf", captured.getOriginalFileName());
            assertNotNull(result.getFilePath());
            assertTrue(Files.exists(Path.of(result.getFilePath())));
        }

        @Test
        void uploadCV_nonPdf_throws() {
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "notes.txt",
                    "text/plain",
                    "bad".getBytes()
            );

            assertThrows(IllegalArgumentException.class, () -> cvService.uploadCV(file, TEST_USER_ID));
            verify(cvRepository, never()).save(any(CV.class));
        }

        @Test
        void uploadCV_userMissing_throws() {
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "cv.pdf",
                    "application/pdf",
                    "%PDF-1.4\nbody".getBytes()
            );
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.empty());

            assertThrows(EntityNotFoundException.class, () -> cvService.uploadCV(file, TEST_USER_ID));
        }

        @Test
        void uploadCV_fakePdfContentType_throws() {
            // CR-B3: attacker sends an EXE with Content-Type: application/pdf
            // Magic bytes check must reject it regardless of the declared content type
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "malicious.pdf",
                    "application/pdf",
                    "MZ\u0090\u0000this is an exe".getBytes()
            );

            assertThrows(IllegalArgumentException.class, () -> cvService.uploadCV(file, TEST_USER_ID));
            verify(cvRepository, never()).save(any(CV.class));
        }

        @Test
        void uploadCV_pathTraversalFilename_doesNotEscape() throws IOException {
            // CR-1: original filename contains "../", so the stored path must stay inside uploadDir
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "../../etc/cron.d/backdoor.pdf",
                    "application/pdf",
                    "%PDF-1.4\nbody".getBytes()
            );

            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(testUser));
            when(cvRepository.save(any(CV.class))).thenAnswer(inv -> {
                CV saved = inv.getArgument(0);
                setField(saved, "id", 99L);
                return saved;
            });

            CV result = cvService.uploadCV(file, TEST_USER_ID);

            // The file must land inside tempDir, not escape via the traversal path
            Path storedPath = Path.of(result.getFilePath());
            assertTrue(storedPath.startsWith(tempDir),
                    "Stored file must be inside uploadDir, got: " + storedPath);
        }
    }

    @Nested
    class CreateAndFindTests {

        @Test
        void createCV_link_setsUrl() {
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(testUser));
            when(cvRepository.save(any(CV.class))).thenAnswer(inv -> {
                CV saved = inv.getArgument(0);
                setField(saved, "id", 2L);
                return saved;
            });

            CV result = cvService.createCV("Linked CV", CVType.LINK, "https://drive.google.com/file", TEST_USER_ID);

            assertEquals(CVType.LINK, result.getType());
            assertEquals("Linked CV", result.getOriginalFileName());
            assertEquals("https://drive.google.com/file", result.getExternalUrl());
        }

        @Test
        void createCV_typeFile_throws() {
            assertThrows(
                    IllegalArgumentException.class,
                    () -> cvService.createCV("file", CVType.FILE, null, TEST_USER_ID)
            );
        }

        @Test
        void createCV_javascriptUrl_throws() {
            // CR-B1: javascript: scheme must be rejected here too, even though the frontend validates
            // User mock required because URL validation happens after the user lookup in createCV()
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(testUser));

            assertThrows(
                    IllegalArgumentException.class,
                    () -> cvService.createCV("Evil CV", CVType.LINK, "javascript:alert(document.cookie)", TEST_USER_ID)
            );
            verify(cvRepository, never()).save(any(CV.class));
        }

        @Test
        void createCV_dataUrl_throws() {
            // CR-B1: data: scheme is another XSS vector and must also be rejected
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(testUser));

            assertThrows(
                    IllegalArgumentException.class,
                    () -> cvService.createCV("Evil CV", CVType.LINK, "data:text/html,<script>alert(1)</script>", TEST_USER_ID)
            );
            verify(cvRepository, never()).save(any(CV.class));
        }

        @Test
        void findAllByUserId_usesUserScope() {
            when(cvRepository.findByUserId(TEST_USER_ID)).thenReturn(List.of(
                    cv(1L, "One", CVType.NOTE),
                    cv(2L, "Two", CVType.LINK)
            ));

            List<CV> result = cvService.findAllByUserId(TEST_USER_ID);

            assertEquals(2, result.size());
            assertEquals("One", result.get(0).getOriginalFileName());
        }
    }

    @Nested
    class AssignmentTests {

        @Test
        void assignCVToApplication_assignsCv() {
            Application app = application(10L);
            app.setUser(testUser);
            CV cv = cv(7L, "Assigned", CVType.NOTE);

            when(applicationRepository.findByIdAndUserId(10L, TEST_USER_ID)).thenReturn(Optional.of(app));
            when(cvRepository.findByIdAndUserId(7L, TEST_USER_ID)).thenReturn(Optional.of(cv));
            when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

            Application result = cvService.assignCVToApplication(10L, 7L, TEST_USER_ID);

            assertNotNull(result.getCv());
            assertEquals(7L, result.getCv().getId());
        }

        @Test
        void removeCVFromApplication_clearsReference() {
            Application app = application(10L);
            app.setUser(testUser);
            app.setCv(cv(7L, "Assigned", CVType.NOTE));

            when(applicationRepository.findByIdAndUserId(10L, TEST_USER_ID)).thenReturn(Optional.of(app));
            when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

            Application result = cvService.removeCVFromApplication(10L, TEST_USER_ID);

            assertNull(result.getCv());
        }
    }

    @Nested
    class UpdateAndDeleteTests {

        @Test
        void updateCV_updatesNameAndUrlForLink() {
            CV existing = cv(3L, "Old", CVType.LINK);
            existing.setExternalUrl("https://old.url");

            when(cvRepository.findByIdAndUserId(3L, TEST_USER_ID)).thenReturn(Optional.of(existing));
            when(cvRepository.save(any(CV.class))).thenAnswer(inv -> inv.getArgument(0));

            CV result = cvService.updateCV(3L, "New Name", "https://new.url", TEST_USER_ID);

            assertEquals("New Name", result.getOriginalFileName());
            assertEquals("https://new.url", result.getExternalUrl());
        }

        @Test
        void deleteCV_fileType_removesFileAndEntity() throws IOException {
            Path filePath = tempDir.resolve("to-delete.pdf");
            Files.write(filePath, "pdf".getBytes());

            CV fileCv = cv(11L, "File CV", CVType.FILE);
            fileCv.setFilePath(filePath.toString());

            when(cvRepository.findByIdAndUserId(11L, TEST_USER_ID)).thenReturn(Optional.of(fileCv));

            cvService.deleteCV(11L, TEST_USER_ID);

            verify(applicationRepository).clearCVReferences(11L);
            verify(cvRepository).delete(fileCv);
            assertFalse(Files.exists(filePath));
        }

        @Test
        void deleteCV_missingCv_throws() {
            when(cvRepository.findByIdAndUserId(999L, TEST_USER_ID)).thenReturn(Optional.empty());

            assertThrows(EntityNotFoundException.class, () -> cvService.deleteCV(999L, TEST_USER_ID));
            verify(cvRepository, never()).delete(any(CV.class));
        }
    }
}
