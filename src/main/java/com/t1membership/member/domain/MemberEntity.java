package com.t1membership.member.domain;

import com.t1membership.coreDomain.BaseEntity;
import com.t1membership.image.domain.ImageEntity;
import com.t1membership.member.constant.MemberRole;
import com.t1membership.order.domain.OrderEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "t1_member")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MemberEntity extends BaseEntity {

    @Id
    @Column(name = "member_email", nullable = false)
    private String memberEmail;



    @Column(name = "member_pw", nullable = false)
    private String memberPw;
    @Column(name = "member_name", nullable = false)
    private String memberName;
    @Column(name = "member_nick_name", nullable = false)
    private String memberNickName;
    @Column(name = "member_phone", nullable = false)
    private String memberPhone;
    @Column(name = "member_birthY", nullable = false)
    private String memberBirthY;
    @Column(name = "member_Gender", nullable = false)
    private String memberGender;
    @Column(name = "member_image")
    private String memberImage;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false)
    private MemberRole memberRole;

    @OneToMany(mappedBy = "member",  cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderEntity> order = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, uuid ASC")
    private List<ImageEntity> images = new ArrayList<>();

    public void addImage(ImageEntity image) {
        images.add(image);
        image.setMember(this);
    }
    public void removeImage(ImageEntity image) {
        images.remove(image);
        image.setMember(null);
    }


    // 프로필 이미지 하나만 쓴다는 전제
    public ImageEntity getProfileImageOrNull() {
        return images.isEmpty() ? null : images.get(0);
    }

    public void clearProfileImages() {
        for (ImageEntity img : new ArrayList<>(images)) {
            removeImage(img); // 리스트에서 빼면서 연관도 끊음
        }
    }

    public void changeProfileImage(ImageEntity newImage) {
        clearProfileImages();   // 기존거 싹 비우고
        addImage(newImage);     // 새 이미지 1장만 등록
    }

}
