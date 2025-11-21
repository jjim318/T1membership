package com.t1membership.member.controller;

import com.t1membership.ApiResult;
import com.t1membership.member.dto.deleteMember.DeleteMemberReq;
import com.t1membership.member.dto.deleteMember.DeleteMemberRes;
import com.t1membership.member.dto.joinMember.JoinMemberReq;
import com.t1membership.member.dto.joinMember.JoinMemberRes;
import com.t1membership.member.dto.modifyMember.ModifyMemberReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberRes;
import com.t1membership.member.dto.readAllMember.ReadAllMemberRes;
import com.t1membership.member.dto.readOneMember.ReadOneMemberReq;
import com.t1membership.member.dto.readOneMember.ReadOneMemberRes;
import com.t1membership.member.service.MemberService;
import com.t1membership.member.service.MemberServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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

    @PostMapping(value = "/join",
    consumes = MediaType.APPLICATION_JSON_VALUE, //요청은 application/json 형식만 허용
    produces = MediaType.APPLICATION_JSON_VALUE) //응답도 JSON 으로 반환
    public ApiResult<JoinMemberRes> joinMember(@RequestBody @Valid JoinMemberReq req) {

        //이메일 형식 + 공백 검증
        if (req.getMemberEmail() == null || req.getMemberEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"이메일은 필수 값입니다");
        }

        //이메일 형식 검증
        String email = req.getMemberEmail();
        String emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$"; //이메일 형식 체크
        if (!email.matches(emailRegex)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"올바른 이메일 형식이 아닙니다");
        }

        //비밀번호 필수 + 길이 검증
        if (req.getMemberPw() == null || req.getMemberPw().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"비밀번호는 필수 입력값입니다");
        }
        if (req.getMemberPw().length() < 8 || req.getMemberPw().length() > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"비밀번호는 최소 8자 이상에서 최대 12자 이하여야 합니다");
        }

        //비밀번호에 특수문자 넣었는지 검증
        if (req.getMemberPw().matches(".*[!@#$%^&*(),.?\":{}|<>].*")){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"비밀번호에는 특수문자가 최소 1개 이상 포함되어야 합니다");
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

    @GetMapping({"/readOne","/my_page/{memberEmail}"})
    @PreAuthorize("hasRole('ADMIN') or #memberEmail == null")
    @Transactional(readOnly = true)
    public ApiResult<ReadOneMemberRes> readOne(
            @PathVariable(value = "memberEmail",required = false) String memberEmail,
            @AuthenticationPrincipal(expression = "username") String username,
            Authentication auth) {
        //조회할 대상 결정
        final String targetEmail = (memberEmail == null || memberEmail.isBlank())
                ? username //URL에 email이 없으면 본인 기준
                : memberEmail; //URL에 email이 있으면 그 사람 기준
        //방어 코드
        if (targetEmail == null || targetEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"조회할 회원이 없습니다");
        }
//        //이메일 비교 시 대소문자 무시 (본인 확인)
//        boolean isSelf = targetEmail.equalsIgnoreCase(username);
//        //관리자 권한 여부
//        boolean isAdmin = auth.getAuthorities().stream()
//                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
//
//        //본인과 관리자가 아니면 접근 불가
//        if (!(isSelf || isAdmin)) {
//            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"본인 또는 관리자만 정보를 조회할 수 있습니다");
//        }
        //주석처리 한 이유는 @PreAuthorize("hasRole('ADMIN') or #memberEmail == null") 이걸로 하고 있기 때문에 중복

        //서비스 요청 dto 생성
        ReadOneMemberReq req = new ReadOneMemberReq();
        req.setMemberEmail(targetEmail.trim());//.trim : 앞뒤 공백 제거

        //서비스에서 조회
        ReadOneMemberRes res = memberService.readOneMember(req);

        return new ApiResult<>(res);
    }

    //이미지 없이 수정버전
    // ===== 회원 정보 + 프로필 이미지 수정 =====
    @PostMapping(
            value = "/modify",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ApiResult<ModifyMemberRes> modifyMember(
            @ModelAttribute @Valid ModifyMemberReq req,
            @RequestPart(value = "profileFile", required = false) MultipartFile profile,
            @RequestPart(value = "removeProfile", required = false) Boolean removeProfile
    ) throws MemberServiceImpl.MemberIdExistException {

        // profile == null && removeProfile == null  → 텍스트만 수정
        // profile != null                          → 기존 이미지 삭제 + 새 이미지 등록
        // removeProfile == true                    → 이미지 삭제(기본이미지 상태로)

        ModifyMemberRes res = memberService.modifyMember(req, profile, removeProfile);
        return new ApiResult<>(res);
    }

    @PostMapping(value = "/delete",
    consumes = MediaType.APPLICATION_JSON_VALUE,
    produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResult<DeleteMemberRes> deleteMember(
            @RequestBody @Valid DeleteMemberReq req,
            Authentication auth) {
        if (req.getMemberEmail() == null || !auth.isAuthenticated()){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"인증이 필요합니다");
        }
        req.setMemberEmail(auth.getName());
        DeleteMemberRes res = memberService.deleteMember(req);
        return new ApiResult<>(res);
    }
}
