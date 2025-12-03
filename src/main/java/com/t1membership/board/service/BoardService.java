package com.t1membership.board.service;

import com.t1membership.board.dto.content.ContentSummaryRes;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface BoardService {
    CreateBoardRes createBoard(CreateBoardReq req, List<MultipartFile> images);
    ReadOneBoardRes readOneBoard(ReadOneBoardReq req);
    PageResponseDTO<ReadAllBoardRes> readAllBoard(ReadAllBoardReq req);
    UpdateBoardRes updateBoard(UpdateBoardReq req, List<ExistingImageDTO> existingImages, List<MultipartFile> newImages);
    DeleteBoardRes deleteBoard(DeleteBoardReq req);
    List<ContentSummaryRes> readContentBoards();
}