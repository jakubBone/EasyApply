package com.applikon.service;

import com.applikon.dto.NoteRequest;
import com.applikon.dto.NoteResponse;
import com.applikon.entity.Application;
import com.applikon.entity.ApplicationStatus;
import com.applikon.entity.Note;
import com.applikon.entity.NoteCategory;
import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.NoteRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.MessageSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NoteService tests")
class NoteServiceTest {

    private static final UUID TEST_USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private MessageSource messageSource;

    @InjectMocks
    private NoteService noteService;

    @Captor
    private ArgumentCaptor<Note> noteCaptor;

    private Application testApplication;

    @BeforeEach
    void setUp() {
        lenient().when(messageSource.getMessage(anyString(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(java.util.Locale.class)))
                .thenAnswer(inv -> {
                    String key = inv.getArgument(0);
                    Object[] args = inv.getArgument(1);
                    if (args != null) {
                        String result = key;
                        for (Object arg : args) result += " " + arg;
                        return result;
                    }
                    return key;
                });
        testApplication = new Application();
        setField(testApplication, "id", 1L);
        User testUser = new User("test@example.com", "Test User", "google-test");
        setField(testUser, "id", TEST_USER_ID);
        testApplication.setUser(testUser);
        testApplication.setCompany("Google");
        testApplication.setPosition("Developer");
        testApplication.setStatus(ApplicationStatus.SENT);
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

    private Note note(long id, String content, NoteCategory category) {
        Note note = new Note();
        note.setId(id);
        note.setContent(content);
        note.setCategory(category);
        note.setApplication(testApplication);
        note.setCreatedAt(LocalDateTime.now());
        return note;
    }

    @Nested
    class CreateTests {

        @Test
        void create_withCategory_returnsMappedResponse() {
            when(applicationRepository.findByIdAndUserId(1L, TEST_USER_ID)).thenReturn(Optional.of(testApplication));
            when(noteRepository.save(any(Note.class))).thenReturn(note(11L, "Test content", NoteCategory.QUESTIONS));

            NoteResponse response = noteService.create(1L, new NoteRequest("Test content", NoteCategory.QUESTIONS), TEST_USER_ID);

            verify(noteRepository).save(noteCaptor.capture());
            Note captured = noteCaptor.getValue();
            assertEquals("Test content", captured.getContent());
            assertEquals(NoteCategory.QUESTIONS, captured.getCategory());

            assertEquals("Test content", response.content());
            assertEquals(NoteCategory.QUESTIONS, response.category());
            assertEquals(1L, response.applicationId());
        }

        @Test
        void create_withoutCategory_defaultsToInne() {
            when(applicationRepository.findByIdAndUserId(1L, TEST_USER_ID)).thenReturn(Optional.of(testApplication));
            when(noteRepository.save(any(Note.class))).thenReturn(note(12L, "No category", NoteCategory.OTHER));

            NoteResponse response = noteService.create(1L, new NoteRequest("No category", null), TEST_USER_ID);

            assertEquals(NoteCategory.OTHER, response.category());
        }

        @Test
        void create_whenApplicationMissing_throws() {
            when(applicationRepository.findByIdAndUserId(999L, TEST_USER_ID)).thenReturn(Optional.empty());

            assertThrows(
                    EntityNotFoundException.class,
                    () -> noteService.create(999L, new NoteRequest("test", NoteCategory.OTHER), TEST_USER_ID)
            );
            verify(noteRepository, never()).save(any(Note.class));
        }
    }

    @Nested
    class FindTests {

        @Test
        void findByApplicationId_returnsSortedList() {
            when(applicationRepository.existsByIdAndUserId(1L, TEST_USER_ID)).thenReturn(true);
            when(noteRepository.findByApplicationIdAndApplicationUserIdOrderByCreatedAtDesc(1L, TEST_USER_ID)).thenReturn(List.of(
                    note(2L, "Newest", NoteCategory.FEEDBACK),
                    note(1L, "Older", NoteCategory.OTHER)
            ));

            List<NoteResponse> result = noteService.findByApplicationId(1L, TEST_USER_ID);

            assertEquals(2, result.size());
            assertEquals("Newest", result.get(0).content());
            assertEquals("Older", result.get(1).content());
        }

        @Test
        void findById_returnsMappedNote() {
            when(noteRepository.findByIdAndApplicationUserId(1L, TEST_USER_ID))
                    .thenReturn(Optional.of(note(1L, "Content", NoteCategory.QUESTIONS)));

            NoteResponse response = noteService.findById(1L, TEST_USER_ID);

            assertEquals("Content", response.content());
            assertEquals(NoteCategory.QUESTIONS, response.category());
        }
    }

    @Nested
    class UpdateAndDeleteTests {

        @Test
        void update_withNullCategory_keepsOldCategory() {
            Note existing = note(1L, "Old", NoteCategory.FEEDBACK);
            when(noteRepository.findByIdAndApplicationUserId(1L, TEST_USER_ID)).thenReturn(Optional.of(existing));
            when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));

            NoteResponse response = noteService.update(1L, new NoteRequest("Updated", null), TEST_USER_ID);

            assertEquals("Updated", response.content());
            assertEquals(NoteCategory.FEEDBACK, response.category());
        }

        @Test
        void delete_missingNote_throws() {
            when(noteRepository.existsByIdAndApplicationUserId(10L, TEST_USER_ID)).thenReturn(false);

            assertThrows(EntityNotFoundException.class, () -> noteService.delete(10L, TEST_USER_ID));
        }

        @Test
        void deleteByApplicationId_delegatesToRepository() {
            noteService.deleteByApplicationId(1L, TEST_USER_ID);
            verify(noteRepository).deleteByApplicationIdAndApplicationUserId(1L, TEST_USER_ID);
        }
    }

}
