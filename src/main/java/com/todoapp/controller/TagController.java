package com.todoapp.controller;

import com.todoapp.model.Tag;
import com.todoapp.model.User;
import com.todoapp.service.TagService;
import com.todoapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TagController {

    private final TagService tagService;
    private final UserService userService;

    private User getCurrentUser(Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<List<Tag>> getAllTags(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(tagService.getAllTagsForUser(user));
    }

    @PostMapping
    public ResponseEntity<Tag> createTag(@Valid @RequestBody Tag tag, Authentication authentication) {
        User user = getCurrentUser(authentication);
        Tag createdTag = tagService.createTag(tag, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdTag);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tag> updateTag(@PathVariable Long id, @Valid @RequestBody Tag tag, Authentication authentication) {
        User user = getCurrentUser(authentication);
        return tagService.updateTag(id, tag, user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id, Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (tagService.deleteTag(id, user)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
