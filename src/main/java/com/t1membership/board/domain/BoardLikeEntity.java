package com.t1membership.board.domain;

import com.t1membership.coreDomain.BaseEntity;
import com.t1membership.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "t1_board_like",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_board_like_board_member", columnNames = {"board_no", "member_email"})
        }
)
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BoardLikeEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "board_like_no")
    private Long boardLikeNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_no", nullable = false)
    private com.t1membership.board.domain.BoardEntity board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_email", nullable = false)
    private MemberEntity member;

    public static BoardLikeEntity create(com.t1membership.board.domain.BoardEntity board, MemberEntity member) {
        return BoardLikeEntity.builder()
                .board(board)
                .member(member)
                .build();
    }
}
