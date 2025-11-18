package com.t1membership.board.service;

import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.board.dto.createComment.CreateCommentReq;
import com.t1membership.board.dto.createComment.CreateCommentRes;
import com.t1membership.board.dto.updateComment.UpdateCommentReq;
import com.t1membership.board.dto.updateComment.UpdateCommentRes;
import com.t1membership.board.dto.deleteComment.DeleteCommentReq;
import com.t1membership.board.dto.deleteComment.DeleteCommentRes;
import com.t1membership.board.dto.readComment.ReadCommentReq;
import com.t1membership.board.dto.readComment.ReadCommentRes;

public interface CommentService {

    CreateCommentRes createComment(CreateCommentReq req);

    UpdateCommentRes updateComment(UpdateCommentReq req);

    DeleteCommentRes deleteComment(DeleteCommentReq req);

    PageResponseDTO<ReadCommentRes> readComments(ReadCommentReq req);
}
