package com.applikon.service;

import com.applikon.entity.User;
import com.applikon.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AccountRetentionService tests")
class AccountRetentionServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    private AccountRetentionService retentionService;

    @BeforeEach
    void setUp() throws Exception {
        retentionService = new AccountRetentionService(userRepository, userService);
        Field field = AccountRetentionService.class.getDeclaredField("inactiveMonths");
        field.setAccessible(true);
        field.set(retentionService, 12);
    }

    @Test
    @DisplayName("No inactive users — deleteAccount is never called")
    void noInactiveUsers_doesNothing() {
        when(userRepository.findInactiveUsers(any())).thenReturn(Collections.emptyList());

        retentionService.cleanupInactiveAccounts();

        verify(userService, never()).deleteAccount(any());
    }

    @Test
    @DisplayName("User with lastLoginAt older than threshold is deleted")
    void inactiveUser_isDeleted() {
        UUID userId = UUID.randomUUID();
        User inactiveUser = userWithId(userId);
        when(userRepository.findInactiveUsers(any())).thenReturn(List.of(inactiveUser));

        retentionService.cleanupInactiveAccounts();

        verify(userService, times(1)).deleteAccount(userId);
    }

    @Test
    @DisplayName("Multiple inactive users are all deleted")
    void multipleInactiveUsers_allDeleted() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        when(userRepository.findInactiveUsers(any())).thenReturn(List.of(userWithId(id1), userWithId(id2)));

        retentionService.cleanupInactiveAccounts();

        verify(userService, times(1)).deleteAccount(id1);
        verify(userService, times(1)).deleteAccount(id2);
    }

    private User userWithId(UUID id) {
        try {
            User user = new User("test@example.com", "Test", "google-" + id);
            Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);
            return user;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
