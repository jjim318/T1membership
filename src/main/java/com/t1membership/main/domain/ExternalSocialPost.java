package com.t1membership.main.domain;

import com.t1membership.coreDomain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "external_social_post")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ExternalSocialPost extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "external_post_id")
    private Long id;

    // INSTAGRAM, YOUTUBE 등
    @Column(name = "platform", length = 20, nullable = false)
    private String platform;

    // @t1lol, @choi_doran 등
    @Column(name = "account", length = 50, nullable = false)
    private String account;

    @Column(name = "title", length = 255, nullable = false)
    private String title;

    @Column(name = "subtitle", length = 500)
    private String subtitle;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    // 실제 인스타/유튜브 URL
    @Column(name = "post_url", length = 500, nullable = false)
    private String postUrl;

}
