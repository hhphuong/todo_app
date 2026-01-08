package com.todoapp.service;

import com.todoapp.model.Tag;
import com.todoapp.model.User;
import com.todoapp.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class TagService {

    private final TagRepository tagRepository;

    public List<Tag> getAllTagsForUser(User user) {
        return tagRepository.findByUserOrderByNameAsc(user);
    }

    public Optional<Tag> getTagById(Long id, User user) {
        return tagRepository.findByIdAndUser(id, user);
    }

    public Tag createTag(Tag tag, User user) {
        tag.setUser(user);
        return tagRepository.save(tag);
    }

    public Optional<Tag> updateTag(Long id, Tag tagDetails, User user) {
        return tagRepository.findByIdAndUser(id, user)
                .map(existingTag -> {
                    existingTag.setName(tagDetails.getName());
                    existingTag.setColor(tagDetails.getColor());
                    return tagRepository.save(existingTag);
                });
    }

    public boolean deleteTag(Long id, User user) {
        return tagRepository.findByIdAndUser(id, user)
                .map(tag -> {
                    tagRepository.delete(tag);
                    return true;
                })
                .orElse(false);
    }

    public boolean existsByName(String name, User user) {
        return tagRepository.existsByNameAndUser(name, user);
    }
}
