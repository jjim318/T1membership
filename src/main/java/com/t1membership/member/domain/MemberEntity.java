package com.t1membership.member.domain;

import com.t1membership.coreDomain.BaseEntity;
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
    @Column(name = "member_image")
    private String memberImage;
    @Column(name = "member_address", nullable = false)
    private String memberAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false)
    private MemberRole memberRole;

    @OneToMany(mappedBy = "t1_member",  cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderEntity> order = new ArrayList<>();

}
