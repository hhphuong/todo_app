package com.todoapp.repository;

import com.todoapp.model.Todo;
import com.todoapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TodoRepository extends JpaRepository<Todo, Long> {
    
    // Main queries - only get parent todos (not subtasks)
    List<Todo> findByUserAndParentIsNullOrderByDisplayOrderAscCreatedAtDesc(User user);
    
    List<Todo> findByUserAndCompletedAndParentIsNullOrderByDisplayOrderAscCreatedAtDesc(User user, boolean completed);
    
    Optional<Todo> findByIdAndUser(Long id, User user);
    
    // Find subtasks of a parent
    List<Todo> findByParentOrderByDisplayOrderAsc(Todo parent);
    
    // Find todos by specific date
    List<Todo> findByUserAndDueDateAndParentIsNullOrderByDueTimeAscCreatedAtDesc(User user, LocalDate dueDate);
    
    // Find todos between dates (for week/month view)
    List<Todo> findByUserAndDueDateBetweenAndParentIsNullOrderByDueDateAscDueTimeAsc(
            User user, LocalDate startDate, LocalDate endDate);
    
    // Find overdue todos
    @Query("SELECT t FROM Todo t WHERE t.user = :user AND t.completed = false AND t.dueDate < :today AND t.parent IS NULL")
    List<Todo> findOverdueTodos(@Param("user") User user, @Param("today") LocalDate today);
    
    // Find todos without due date
    List<Todo> findByUserAndDueDateIsNullAndParentIsNullOrderByCreatedAtDesc(User user);
    
    // Find todos by tag
    @Query("SELECT t FROM Todo t JOIN t.tags tag WHERE t.user = :user AND tag.id = :tagId AND t.parent IS NULL ORDER BY t.displayOrder")
    List<Todo> findByUserAndTagId(@Param("user") User user, @Param("tagId") Long tagId);
    
    // Count todos by date for calendar dots
    @Query("SELECT t.dueDate, COUNT(t) FROM Todo t WHERE t.user = :user AND t.dueDate BETWEEN :startDate AND :endDate AND t.parent IS NULL GROUP BY t.dueDate")
    List<Object[]> countTodosByDateRange(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Statistics queries
    @Query("SELECT COUNT(t) FROM Todo t WHERE t.user = :user AND t.completed = true AND t.updatedAt >= :since")
    Long countCompletedSince(@Param("user") User user, @Param("since") java.time.LocalDateTime since);
    
    @Query("SELECT CAST(t.updatedAt AS LocalDate), COUNT(t) FROM Todo t WHERE t.user = :user AND t.completed = true AND t.updatedAt >= :since GROUP BY CAST(t.updatedAt AS LocalDate)")
    List<Object[]> getCompletionStats(@Param("user") User user, @Param("since") java.time.LocalDateTime since);
    
    // Check if user completed all todos for a specific date
    @Query("SELECT COUNT(t) FROM Todo t WHERE t.user = :user AND t.dueDate = :date AND t.completed = false AND t.parent IS NULL")
    Long countIncompleteByDate(@Param("user") User user, @Param("date") LocalDate date);
}
