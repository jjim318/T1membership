package com.t1membership.board.domain;

import com.t1membership.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Table(name = "t1_comment")
public class CommentEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_no")
    private BoardEntity board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_email")
    private MemberEntity member; // member

    @Column(name = "comment_writer", nullable = false)
    private String commentWriter;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_no", nullable = false)
    private Long commentNo;

    @Column(name = "comment_content", nullable = false)
    private String commentContent;

    @Column(name = "comment_likeCount", nullable = false)
    private int commentLikeCount = 0;
}
