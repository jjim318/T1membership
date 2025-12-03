package com.t1membership.board.domain;

import com.t1membership.board.constant.BoardType;
import com.t1membership.coreDomain.BaseEntity;
import com.t1membership.image.domain.ImageEntity;
import com.t1membership.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Table(name = "t1_board")
public class BoardEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "board_no", nullable = false)
    private Long boardNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_email")
    private MemberEntity member; // member

    @Column(name = "board_writer", nullable = false)
    private String boardWriter;

    @Column(name = "board_title", nullable = false)
    private String boardTitle;

    @Lob
    @Column(name = "board_content", nullable = false, length = 2000)
    private String boardContent;

    @Column(name = "board_likeCount", nullable = false)
    private int boardLikeCount = 0;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private BoardType boardType;

    @Column(nullable = false)
    private boolean notice = false;

    @Column(nullable = false)
    private boolean isSecret = false;


    @Builder.Default
    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, uuid ASC") // 08.27 추가
    private List<ImageEntity> images = new ArrayList<>(); // 이미지


    public void addImage(ImageEntity image) {
        images.add(image);
        image.setBoard(this); // ImageEntity에 setBoard(…) 존재해야 함
    }

    public void removeImage(ImageEntity image) {
        images.remove(image);
        image.setBoard(null);
    }

    @Column(name = "category_code")
    private String categoryCode;    // Thind, 온네상이T1, Greeting 등등 

}
