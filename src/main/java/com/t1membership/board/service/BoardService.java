package com.t1membership.board.service;

import com.t1membership.board.dto.content.ContentSummaryRes;
import com.t1membership.board.dto.my.MyPostRes;
import com.t1membership.board.dto.story.CreateStoryReq;
import com.t1membership.board.dto.story.StoryDetailRes;
import com.t1membership.board.dto.story.StoryFeedRes;
import com.t1membership.coreDto.PageRequestDTO;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.board.dto.createBoard.CreateBoardReq;
import com.t1membership.board.dto.createBoard.CreateBoardRes;
import com.t1membership.board.dto.readOneBoard.ReadOneBoardReq;
import com.t1membership.board.dto.readOneBoard.ReadOneBoardRes;
import com.t1membership.board.dto.readAllBoard.ReadAllBoardReq;
import com.t1membership.board.dto.readAllBoard.ReadAllBoardRes;
import com.t1membership.board.dto.updateBoard.UpdateBoardReq;
import com.t1membership.board.dto.updateBoard.UpdateBoardRes;
import com.t1membership.board.dto.deleteBoard.DeleteBoardReq;
import com.t1membership.board.dto.deleteBoard.DeleteBoardRes;
import com.t1membership.image.dto.ExistingImageDTO;
import com.t1membership.member.constant.MemberRole;
import com.t1membership.member.domain.MemberEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface BoardService {
    CreateBoardRes createBoard(CreateBoardReq req, List<MultipartFile> images);
    ReadOneBoardRes readOneBoard(ReadOneBoardReq req);
    PageResponseDTO<ReadAllBoardRes> readAllBoard(ReadAllBoardReq req);
    UpdateBoardRes updateBoard(UpdateBoardReq req, List<ExistingImageDTO> existingImages, List<MultipartFile> newImages);
    DeleteBoardRes deleteBoard(DeleteBoardReq req);
    List<ContentSummaryRes> readContentBoards();

    //스토리
    StoryDetailRes getStoryDetail(Long boardNo);
    void createStory(String memberEmail, CreateStoryReq req);
    Page<StoryFeedRes> getStoryFeed(String writer, Pageable pageable);
    PageResponseDTO<MyPostRes> readMyBoards(String email, PageRequestDTO pageRequestDTO);
}