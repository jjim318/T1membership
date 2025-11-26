package com.t1membership.image.dto;

import com.t1membership.image.domain.ImageEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExistingImageDTO {

    private String fileName;
    private Integer sortOrder;


    public static ExistingImageDTO from(ImageEntity image) {
        if (image == null) {
            return null;
        }

        return ExistingImageDTO.builder()
                // ★ 이 부분은 ImageEntity 필드명에 맞게 조정해야 함
                .fileName(image.getUrl())  // or getImageOriginalName(), getImageUrl()
                .sortOrder(image.getSortOrder())    // image_order 칼럼
                .build();
    }


}
