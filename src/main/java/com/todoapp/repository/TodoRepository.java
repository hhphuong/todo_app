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
    
    List<Todo> findByUserOrderByDueDateAscCreatedAtDesc(User user);
    
    List<Todo> findByUserAndCompletedOrderByDueDateAscCreatedAtDesc(User user, boolean completed);
    
    Optional<Todo> findByIdAndUser(Long id, User user);
    
    // Find todos by specific date
    List<Todo> findByUserAndDueDateOrderByDueTimeAscCreatedAtDesc(User user, LocalDate dueDate);
    
    // Find todos between dates (for week/month view)
    List<Todo> findByUserAndDueDateBetweenOrderByDueDateAscDueTimeAsc(
            User user, LocalDate startDate, LocalDate endDate);
    
    // Find overdue todos
    @Query("SELECT t FROM Todo t WHERE t.user = :user AND t.completed = false AND t.dueDate < :today")
    List<Todo> findOverdueTodos(@Param("user") User user, @Param("today") LocalDate today);
    
    // Find todos without due date
    List<Todo> findByUserAndDueDateIsNullOrderByCreatedAtDesc(User user);
    
    // Count todos by date for calendar dots
    @Query("SELECT t.dueDate, COUNT(t) FROM Todo t WHERE t.user = :user AND t.dueDate BETWEEN :startDate AND :endDate GROUP BY t.dueDate")
    List<Object[]> countTodosByDateRange(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
