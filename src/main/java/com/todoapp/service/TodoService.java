package com.todoapp.service;

import com.todoapp.model.Tag;
import com.todoapp.model.Todo;
import com.todoapp.model.User;
import com.todoapp.repository.TagRepository;
import com.todoapp.repository.TodoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TodoService {

    private final TodoRepository todoRepository;
    private final TagRepository tagRepository;

    public List<Todo> getAllTodosForUser(User user) {
        return todoRepository.findByUserAndParentIsNullOrderByDisplayOrderAscCreatedAtDesc(user);
    }

    public Optional<Todo> getTodoByIdForUser(Long id, User user) {
        return todoRepository.findByIdAndUser(id, user);
    }

    public Todo createTodo(Todo todo, User user) {
        todo.setUser(user);
        
        // Handle parent (subtask)
        if (todo.getParentId() != null) {
            todoRepository.findByIdAndUser(todo.getParentId(), user)
                    .ifPresent(todo::setParent);
        }
        
        // Handle tags
        if (todo.getTagIds() != null && !todo.getTagIds().isEmpty()) {
            Set<Tag> tags = todo.getTagIds().stream()
                    .map(tagId -> tagRepository.findByIdAndUser(tagId, user))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toSet());
            todo.setTags(tags);
        }
        
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
                    existingTodo.setDisplayOrder(todoDetails.getDisplayOrder());
                    
                    // Handle tags
                    if (todoDetails.getTagIds() != null) {
                        Set<Tag> tags = todoDetails.getTagIds().stream()
                                .map(tagId -> tagRepository.findByIdAndUser(tagId, user))
                                .filter(Optional::isPresent)
                                .map(Optional::get)
                                .collect(Collectors.toSet());
                        existingTodo.setTags(tags);
                    }
                    
                    // Auto-complete parent if all subtasks are done
                    if (existingTodo.getParent() != null && existingTodo.isCompleted()) {
                        checkAndCompleteParent(existingTodo.getParent());
                    }
                    
                    return todoRepository.save(existingTodo);
                });
    }

    private void checkAndCompleteParent(Todo parent) {
        boolean allSubtasksComplete = parent.getSubtasks().stream()
                .allMatch(Todo::isCompleted);
        if (allSubtasksComplete && !parent.isCompleted()) {
            parent.setCompleted(true);
            todoRepository.save(parent);
        }
    }

    public Optional<Todo> toggleComplete(Long id, User user) {
        return todoRepository.findByIdAndUser(id, user)
                .map(todo -> {
                    todo.setCompleted(!todo.isCompleted());
                    
                    // If completing, check parent
                    if (todo.isCompleted() && todo.getParent() != null) {
                        checkAndCompleteParent(todo.getParent());
                    }
                    
                    // If uncompleting parent, keep subtasks as is
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
        return todoRepository.findByUserAndCompletedAndParentIsNullOrderByDisplayOrderAscCreatedAtDesc(user, completed);
    }

    // Reorder todos (for drag-drop)
    public void reorderTodos(List<Long> todoIds, User user) {
        for (int i = 0; i < todoIds.size(); i++) {
            int order = i;
            todoRepository.findByIdAndUser(todoIds.get(i), user)
                    .ifPresent(todo -> {
                        todo.setDisplayOrder(order);
                        todoRepository.save(todo);
                    });
        }
    }

    // Update due date (for drag to different day)
    public Optional<Todo> updateDueDate(Long id, LocalDate newDueDate, User user) {
        return todoRepository.findByIdAndUser(id, user)
                .map(todo -> {
                    todo.setDueDate(newDueDate);
                    return todoRepository.save(todo);
                });
    }

    // Calendar methods
    public List<Todo> getTodosByDate(User user, LocalDate date) {
        return todoRepository.findByUserAndDueDateAndParentIsNullOrderByDueTimeAscCreatedAtDesc(user, date);
    }

    public List<Todo> getTodosByDateRange(User user, LocalDate startDate, LocalDate endDate) {
        return todoRepository.findByUserAndDueDateBetweenAndParentIsNullOrderByDueDateAscDueTimeAsc(user, startDate, endDate);
    }

    public List<Todo> getOverdueTodos(User user) {
        return todoRepository.findOverdueTodos(user, LocalDate.now());
    }

    public List<Todo> getTodosWithoutDueDate(User user) {
        return todoRepository.findByUserAndDueDateIsNullAndParentIsNullOrderByCreatedAtDesc(user);
    }

    public List<Todo> getTodosByTag(User user, Long tagId) {
        return todoRepository.findByUserAndTagId(user, tagId);
    }

    public Map<LocalDate, Long> getTodoCountByDateRange(User user, LocalDate startDate, LocalDate endDate) {
        List<Object[]> results = todoRepository.countTodosByDateRange(user, startDate, endDate);
        return results.stream()
                .collect(Collectors.toMap(
                        row -> (LocalDate) row[0],
                        row -> (Long) row[1]
                ));
    }

    // Statistics
    public Map<String, Object> getStatistics(User user, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("completedCount", todoRepository.countCompletedSince(user, since));
        
        List<Object[]> dailyStats = todoRepository.getCompletionStats(user, since);
        Map<LocalDate, Long> dailyMap = new LinkedHashMap<>();
        for (Object[] row : dailyStats) {
            dailyMap.put((LocalDate) row[0], (Long) row[1]);
        }
        stats.put("dailyStats", dailyMap);
        
        return stats;
    }
}
