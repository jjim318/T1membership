package com.t1membership.member.dto.modifyMember;

import com.t1membership.member.domain.MemberEntity;
import com.t1membership.image.domain.ImageEntity;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyMemberRes {

    private String memberEmail;
    private String memberNickName;
    private String memberPhone;
    private String memberAddress;

    // 🔥 프로필 이미지 URL (없으면 기본이미지)
    private String profileImageUrl;

    public static ModifyMemberRes from(MemberEntity memberEntity) {

        // 멤버에 연결된 이미지들 중 첫 번째를 "프로필"로 사용
        List<ImageEntity> images = memberEntity.getImages();
        String profileUrl;

        if (images == null || images.isEmpty()) {
            // 여기서 기본 이미지 URL을 정해주면 됨
            // ex) S3, 정적 리소스, CDN 등
            profileUrl = "/images/default-profile.png"; // TODO: 형님 프로젝트에 맞게 수정
        } else {
            profileUrl = images.get(0).getUrl();
        }

        return ModifyMemberRes.builder()
                .memberEmail(memberEntity.getMemberEmail())
                .memberNickName(memberEntity.getMemberNickName())
                .memberAddress(memberEntity.getMemberAddress())
                .memberPhone(memberEntity.getMemberPhone())
                .profileImageUrl(profileUrl)
                .build();
    }
}
