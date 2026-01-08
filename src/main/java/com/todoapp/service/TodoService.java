package com.todoapp.service;

import com.todoapp.model.Todo;
import com.todoapp.model.User;
import com.todoapp.repository.TodoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TodoService {

    private final TodoRepository todoRepository;

    public List<Todo> getAllTodosForUser(User user) {
        return todoRepository.findByUserOrderByDueDateAscCreatedAtDesc(user);
    }

    public Optional<Todo> getTodoByIdForUser(Long id, User user) {
        return todoRepository.findByIdAndUser(id, user);
    }

    public Todo createTodo(Todo todo, User user) {
        todo.setUser(user);
        return todoRepository.save(todo);
    }

    public Optional<Todo> updateTodo(Long id, Todo todoDetails, User user) {
        return todoRepository.findByIdAndUser(id, user)
                .map(existingTodo -> {
                    existingTodo.setTitle(todoDetails.getTitle());
                    existingTodo.setDescription(todoDetails.getDescription());
                    existingTodo.setCompleted(todoDetails.isCompleted());
                    existingTodo.setDueDate(todoDetails.getDueDate());
                    existingTodo.setDueTime(todoDetails.getDueTime());
                    existingTodo.setPriority(todoDetails.getPriority());
                    return todoRepository.save(existingTodo);
                });
    }

    public Optional<Todo> toggleComplete(Long id, User user) {
        return todoRepository.findByIdAndUser(id, user)
                .map(todo -> {
                    todo.setCompleted(!todo.isCompleted());
                    return todoRepository.save(todo);
                });
    }

    public boolean deleteTodo(Long id, User user) {
        return todoRepository.findByIdAndUser(id, user)
                .map(todo -> {
                    todoRepository.delete(todo);
                    return true;
                })
                .orElse(false);
    }

    public List<Todo> getTodosByStatusForUser(boolean completed, User user) {
        return todoRepository.findByUserAndCompletedOrderByDueDateAscCreatedAtDesc(user, completed);
    }

    // Calendar methods
    public List<Todo> getTodosByDate(User user, LocalDate date) {
        return todoRepository.findByUserAndDueDateOrderByDueTimeAscCreatedAtDesc(user, date);
    }

    public List<Todo> getTodosByDateRange(User user, LocalDate startDate, LocalDate endDate) {
        return todoRepository.findByUserAndDueDateBetweenOrderByDueDateAscDueTimeAsc(user, startDate, endDate);
    }

    public List<Todo> getOverdueTodos(User user) {
        return todoRepository.findOverdueTodos(user, LocalDate.now());
    }

    public List<Todo> getTodosWithoutDueDate(User user) {
        return todoRepository.findByUserAndDueDateIsNullOrderByCreatedAtDesc(user);
    }

    public Map<LocalDate, Long> getTodoCountByDateRange(User user, LocalDate startDate, LocalDate endDate) {
        List<Object[]> results = todoRepository.countTodosByDateRange(user, startDate, endDate);
        return results.stream()
                .collect(Collectors.toMap(
                        row -> (LocalDate) row[0],
                        row -> (Long) row[1]
                ));
    }
}
