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

    // 실제 파일 이름 (t1_image.image_file_name)
    private String fileName;

    // 정렬 순서 (t1_image.image_order)
    private Integer sortOrder;

    // 클라이언트에서 이미지 src 로 쓸 URL (t1_image.image_url)
    private String url;

    public static ExistingImageDTO from(ImageEntity image) {
        if (image == null) {
            return null;
        }

        return ExistingImageDTO.builder()
                .fileName(image.getFileName())      // ✅ 진짜 파일 이름
                .sortOrder(image.getSortOrder())    // ✅ 정렬 순서
                .url(image.getUrl())                // ✅ /files/... 또는 /shop/...
                .build();
    }
}
