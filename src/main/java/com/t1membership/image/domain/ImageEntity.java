package com.t1membership.image.domain;

import com.t1membership.board.domain.BoardEntity;
import com.t1membership.coreDomain.BaseEntity;
import com.t1membership.image.dto.ImageDTO;
import com.t1membership.item.domain.ItemEntity;
import com.t1membership.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "t1_image")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ImageEntity {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "image_uuid", length = 36, nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "image_ext")
    private String ext;

    @Column(name = "image_originalName", nullable = false)
    private String originalName;

    @Column(name = "image_fileName")
    private String fileName = "a";

    @Column(name = "image_url")
    private String url;

    @Column(name = "image_contentType")
    private String contentType;

    @Column(name = "image_order")
    private Integer sortOrder = 0;


    // 부모들
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "board_No", foreignKey = @ForeignKey(name = "fk_image_board"))
    private BoardEntity board;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "member_email", foreignKey = @ForeignKey(name = "fk_image_member"))
    private MemberEntity member;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "item_no", foreignKey = @ForeignKey(name = "fk_image_item"))
    private ItemEntity item;


    // 부모 연결은 한번에 하나만
    public void attachToBoard(BoardEntity board) {
        this.board = board;
        this.member = null;
        this.item = null;
        if (board != null) board.getImages().add(this);
    }

    public void attachToMember(MemberEntity member) {
        this.board = null;
        this.member = member;
        this.item = null;
        if (member != null) member.getImages().add(this);
    }

    public void attachToItem(ItemEntity item) {
        this.board = null;
        this.member = null;
        this.item = item;
        if (item != null) item.getImages().add(this);
    }


    // ====== JPA 생명주기에서 유효성 체크 (서비스 실수 방지) ======
    @PrePersist
    @PreUpdate
    public void validateExactlyOneParent() {
        int cnt = 0;
        if (board  != null) cnt++;
        if (member != null) cnt++;
        if (item   != null) cnt++;

        // 리뷰 전용 이미지(ReviewEntity가 image FK로 참조)인 경우에는
        // board/member/item 부모가 없어도 정상으로 본다.
        if (cnt == 0) {
            return;
        }

        if (cnt != 1) {
            throw new IllegalStateException("Image must be attached to exactly ONE parent (board|member|item|review).");
        }
    }

    // 정적 팩토리
    public static ImageEntity forBoard(String fileName, String url, BoardEntity board, Integer order) {
        ImageEntity img = new ImageEntity();
        img.setFileName(fileName);
        img.setUrl(url);
        img.setSortOrder(order == null ? 0 : order);
        img.attachToBoard(board);
        return img;
    }
    public static ImageEntity forMember(String fileName, String url, MemberEntity member, Integer order) {
        ImageEntity img = new ImageEntity();
        img.setFileName(fileName);
        img.setUrl(url);
        img.setSortOrder(order == null ? 0 : order);
        img.attachToMember(member);
        return img;
    }
    public static ImageEntity forItem(String fileName, String url, ItemEntity item, Integer order) {
        ImageEntity img = new ImageEntity();
        img.setFileName(fileName);
        img.setUrl(url);
        img.setSortOrder(order == null ? 0 : order);
        img.attachToItem(item);
        return img;
    }
    public static ImageEntity create(String imageUrl, int sortOrder) {
        ImageEntity img = new ImageEntity();
        img.setUrl(imageUrl);
        img.sortOrder = sortOrder;
        return img;
    }

    // DTO -> Entity 변환 (Item용)
    public static ImageEntity fromDtoForItem(ImageDTO dto, ItemEntity item) {
        ImageEntity img = new ImageEntity();
        img.setUuid(dto.getUuid());
        img.setOriginalName(dto.getOriginalName());
        img.setExt(dto.getExt());
        img.setFileName(dto.getFileName());
        img.setUrl(dto.getUrl());
        img.setContentType(dto.getContentType());
        img.setSortOrder(dto.getSortOrder());
        img.attachToItem(item); // 부모 세팅 + 양방향 연결
        return img;
    }

    // DTO -> Entity 변환 (Member용)
    public static ImageEntity fromDtoForMember(ImageDTO dto, MemberEntity member) {
        ImageEntity img = new ImageEntity();
        img.setUuid(dto.getUuid());
        img.setOriginalName(dto.getOriginalName());
        img.setExt(dto.getExt());
        img.setFileName(dto.getFileName());
        img.setUrl(dto.getUrl());
        img.setContentType(dto.getContentType());
        img.setSortOrder(dto.getSortOrder());
        img.attachToMember(member);
        return img;
    }

    // DTO -> Entity 변환 (Board용)
    public static ImageEntity fromDtoForBoard(ImageDTO dto, BoardEntity board) {
        ImageEntity img = new ImageEntity();
        img.setUuid(dto.getUuid());
        img.setOriginalName(dto.getOriginalName());
        img.setExt(dto.getExt());
        img.setFileName(dto.getFileName());
        img.setUrl(dto.getUrl());
        img.setContentType(dto.getContentType());
        img.setSortOrder(dto.getSortOrder());
        img.attachToBoard(board);
        return img;
    }



}
