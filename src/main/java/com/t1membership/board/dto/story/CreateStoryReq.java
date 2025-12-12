package com.t1membership.board.dto.story;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Getter
@Service
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateStoryReq {
    @NotBlank
    private String title;

    @NotBlank
    private String content;

    // true = 멤버십 전용 (잠금)
    private boolean locked;

    List<String> imageUrls;
}
