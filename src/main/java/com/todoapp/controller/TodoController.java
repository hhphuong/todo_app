package com.todoapp.controller;

import com.todoapp.model.Todo;
import com.todoapp.model.User;
import com.todoapp.service.TodoService;
import com.todoapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TodoController {

    private final TodoService todoService;
    private final UserService userService;

    private User getCurrentUser(Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<List<Todo>> getAllTodos(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(todoService.getAllTodosForUser(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Todo> getTodoById(@PathVariable Long id, Authentication authentication) {
        User user = getCurrentUser(authentication);
        return todoService.getTodoByIdForUser(id, user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Todo> createTodo(@Valid @RequestBody Todo todo, Authentication authentication) {
        User user = getCurrentUser(authentication);
        Todo createdTodo = todoService.createTodo(todo, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdTodo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Todo> updateTodo(@PathVariable Long id, @Valid @RequestBody Todo todo, Authentication authentication) {
        User user = getCurrentUser(authentication);
        return todoService.updateTodo(id, todo, user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Todo> toggleComplete(@PathVariable Long id, Authentication authentication) {
        User user = getCurrentUser(authentication);
        return todoService.toggleComplete(id, user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(@PathVariable Long id, Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (todoService.deleteTodo(id, user)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/status/{completed}")
    public ResponseEntity<List<Todo>> getTodosByStatus(@PathVariable boolean completed, Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(todoService.getTodosByStatusForUser(completed, user));
    }

    // Calendar endpoints
    @GetMapping("/date/{date}")
    public ResponseEntity<List<Todo>> getTodosByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(todoService.getTodosByDate(user, date));
    }

    @GetMapping("/week")
    public ResponseEntity<List<Todo>> getTodosByWeek(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        LocalDate endDate = start.plusDays(6);
        return ResponseEntity.ok(todoService.getTodosByDateRange(user, start, endDate));
    }

    @GetMapping("/month")
    public ResponseEntity<List<Todo>> getTodosByMonth(
            @RequestParam int year,
            @RequestParam int month,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        return ResponseEntity.ok(todoService.getTodosByDateRange(user, startDate, endDate));
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<Todo>> getOverdueTodos(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(todoService.getOverdueTodos(user));
    }

    @GetMapping("/no-date")
    public ResponseEntity<List<Todo>> getTodosWithoutDueDate(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(todoService.getTodosWithoutDueDate(user));
    }

    @GetMapping("/calendar-counts")
    public ResponseEntity<Map<LocalDate, Long>> getCalendarCounts(
            @RequestParam int year,
            @RequestParam int month,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        return ResponseEntity.ok(todoService.getTodoCountByDateRange(user, startDate, endDate));
    }
}
