package com.t1membership.coreDto;

import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

import java.util.Collections;
import java.util.List;

@Getter
@ToString
public class PageResponseDTO<E> { // <E> E 엔티티용 변수명 (변할 수 있는 값 )
    // 페이징 처리 응답용 객체
    // dto의 목록, 시작페이지/끝페이지 여부 등...

    private int page;       // 현재 페이지
    private int size;       // 페이지당 게시물 수
    private int total;      // 총 게시물 수

    private int start;      // 시작 페이지 번호
    private int end;        // 끝 페이지 번호

    private boolean prev;   // 이전 페이지 존재 여부
    private boolean next;   // 다음 페이지 존재 여부

    private List<E> dtoList; // 게시물의 목록

    /**
     * PageRequestDTO + 목록 + 총 개수로부터
     * 페이징 정보를 한 번에 계산해서 PageResponseDTO 를 만들어주는 생성자.
     *
     * 사용 예:
     * PageResponseDTO<BoardDTO> resp =
     *     PageResponseDTO.<BoardDTO>withAll()
     *         .pageRequestDTO(req)
     *         .dtoList(list)
     *         .total(totalCount)
     *         .build();
     */
    @Builder(builderMethodName = "withAll")
    public PageResponseDTO(PageRequestDTO pageRequestDTO, List<E> dtoList, int total) {

        // total 이 0 이하라면 기본값 세팅 후 종료
        if (total <= 0) {
            this.page = pageRequestDTO.getPage();
            this.size = pageRequestDTO.getSize();
            this.total = 0;
            this.dtoList = Collections.emptyList();
            this.start = 0;
            this.end = 0;
            this.prev = false;
            this.next = false;
            return;
        }

        this.page = pageRequestDTO.getPage(); // 요청 페이지 번호
        this.size = pageRequestDTO.getSize(); // 페이지당 게시물 수
        this.total = total;                   // 총 게시물 수
        this.dtoList = dtoList;              // 실제 목록

        // 화면에서 보이는 마지막 페이지 번호 (10개 단위 블럭)
        this.end = (int) (Math.ceil(this.page / 10.0)) * 10;

        // 시작 페이지 번호
        this.start = this.end - 9;

        // 실제 마지막 페이지 번호 (데이터 개수 기준)
        int last = (int) Math.ceil(total / (double) size);

        // 화면에서 사용할 end 는 실제 마지막 페이지를 넘지 않도록 보정
        this.end = Math.min(this.end, last);

        // 이전/다음 페이지 존재 여부
        this.prev = this.start > 1;
        this.next = total > this.end * this.size;
    }

}
