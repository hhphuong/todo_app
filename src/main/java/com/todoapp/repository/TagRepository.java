package com.todoapp.repository;

import com.todoapp.model.Tag;
import com.todoapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {
    
    List<Tag> findByUserOrderByNameAsc(User user);
    
    Optional<Tag> findByIdAndUser(Long id, User user);
    
    boolean existsByNameAndUser(String name, User user);
}
