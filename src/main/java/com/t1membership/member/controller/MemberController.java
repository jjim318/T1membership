package com.t1membership.member.controller;

import com.t1membership.ApiResult;
import com.t1membership.member.dto.deleteMember.DeleteMemberReq;
import com.t1membership.member.dto.deleteMember.DeleteMemberRes;
import com.t1membership.member.dto.exists.EmailExistsRes;
import com.t1membership.member.dto.joinMember.JoinMemberReq;
import com.t1membership.member.dto.joinMember.JoinMemberRes;
import com.t1membership.member.dto.modifyMember.ChangePasswordReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberRes;
import com.t1membership.member.dto.modifyMember.ModifyProfileReq;
import com.t1membership.member.dto.readAllMember.ReadAllMemberRes;
import com.t1membership.member.dto.readOneMember.ReadOneMemberReq;
import com.t1membership.member.dto.readOneMember.ReadOneMemberRes;
import com.t1membership.member.service.MemberService;
import com.t1membership.member.service.MemberServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/member")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    //이메일 검증
    @GetMapping("/exists")
    public ResponseEntity<EmailExistsRes> exists(@RequestParam("email") String email) {
        boolean exists = memberService.existsByEmail(email);
        return ResponseEntity.ok(new EmailExistsRes(exists));
    }

    @PostMapping(value = "/join", consumes = MediaType.APPLICATION_JSON_VALUE, //요청은 application/json 형식만 허용
            produces = MediaType.APPLICATION_JSON_VALUE) //응답도 JSON 으로 반환
    public ApiResult<JoinMemberRes> joinMember(@RequestBody @Valid JoinMemberReq req) {

        //이메일 형식 + 공백 검증
        if (req.getMemberEmail() == null || req.getMemberEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일은 필수 값입니다");
        }

        //이메일 형식 검증
        String email = req.getMemberEmail();
        String emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$"; //이메일 형식 체크
        if (!email.matches(emailRegex)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바른 이메일 형식이 아닙니다");
        }

        //비밀번호 필수 + 길이 검증
        if (req.getMemberPw() == null || req.getMemberPw().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 필수 입력값입니다");
        }
        if (req.getMemberPw().length() < 8 || req.getMemberPw().length() > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 최소 8자 이상에서 최대 12자 이하여야 합니다");
        }

        //비밀번호에 특수문자 넣었는지 검증
        if (!req.getMemberPw().matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호에는 특수문자가 최소 1개 이상 포함되어야 합니다");
        }

        //서비스로 넘김
        JoinMemberRes res = memberService.joinMember(req);
        return new ApiResult<>(res);
    }

    @GetMapping("/readAll")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ApiResult<List<ReadAllMemberRes>> readAll() {
        List<ReadAllMemberRes> res = memberService.readAllMember();
        return new ApiResult<>(res);
    }

    // 내 정보 조회 (마이페이지, 헤더 프로필, 등등)
    @GetMapping("/readOne")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ApiResult<ReadOneMemberRes> readMyInfo(Authentication auth) {

        String username = auth.getName();  // principal = 이메일

        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        ReadOneMemberReq req = new ReadOneMemberReq();
        req.setMemberEmail(username.trim());

        ReadOneMemberRes res = memberService.readOneMember(req);
        return new ApiResult<>(res);
    }


    // 관리자: 특정 회원 상세 조회
    @GetMapping("/my_page/{memberEmail}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ApiResult<ReadOneMemberRes> readOneByAdmin(@PathVariable("memberEmail") String memberEmail) {
        if (memberEmail == null || memberEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회할 회원이 없습니다.");
        }

        ReadOneMemberReq req = new ReadOneMemberReq();
        req.setMemberEmail(memberEmail.trim());

        ReadOneMemberRes res = memberService.readOneMember(req);
        return new ApiResult<>(res);
    }

    // ==============================
    //   회원 기본정보 변경 (텍스트만)
    //   이름/성별/생년/전화번호/주소 등
    // ==============================
    @PutMapping(value = "/modify", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResult<ModifyMemberRes> modifyMemberInfo(@RequestBody @Valid ModifyMemberReq req) {
        ModifyMemberRes res = memberService.modifyMember(req);
        return new ApiResult<>(res);
    }


    // ==============================
    //   프로필 수정 (닉네임 + 이미지)
    // ==============================
    @PostMapping(value = "/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResult<ModifyMemberRes> modifyProfile(@ModelAttribute @Valid ModifyProfileReq req, @RequestPart(value = "profileFile", required = false) MultipartFile profileFile, @RequestParam(value = "removeProfile", required = false) Boolean removeProfile) {

        ModifyMemberRes res = memberService.modifyProfile(req, profileFile, removeProfile);
        return new ApiResult<>(res);
    }


    // ==============================
    //   비밀번호 변경 전용
    // ==============================
    @PutMapping(value = "/password", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResult<String> changePassword(@Valid @RequestBody ChangePasswordReq req) {
        memberService.changePassword(req);
        return new ApiResult<>("비밀번호가 변경되었습니다.");
    }

    @PostMapping(value = "/delete", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResult<DeleteMemberRes> deleteMember(Authentication auth) {

        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다");
        }

        String loginEmail = auth.getName();

        DeleteMemberReq req = new DeleteMemberReq();
        req.setMemberEmail(loginEmail);

        DeleteMemberRes res = memberService.deleteMember(req);
        return new ApiResult<>(res);
    }
}
