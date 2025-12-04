package com.t1membership.member.service;

import com.t1membership.image.domain.ImageEntity;
import com.t1membership.image.dto.ImageDTO;
import com.t1membership.image.service.FileService;
import com.t1membership.item.constant.MembershipPayType;
import com.t1membership.item.constant.PopPlanType;
import com.t1membership.member.constant.MemberRole;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.dto.deleteMember.DeleteMemberReq;
import com.t1membership.member.dto.deleteMember.DeleteMemberRes;
import com.t1membership.member.dto.joinMember.JoinMemberReq;
import com.t1membership.member.dto.joinMember.JoinMemberRes;
import com.t1membership.member.dto.modifyMember.ChangePasswordReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberRes;
import com.t1membership.member.dto.modifyMember.ModifyProfileReq;
import com.t1membership.member.dto.readAllMember.ReadAllMemberRes;
import com.t1membership.member.dto.readOneMember.ReadOneMemberReq;
import com.t1membership.member.dto.readOneMember.ReadOneMemberRes;
import com.t1membership.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MemberServiceImpl implements MemberService {

    private final FileService fileService;
    private final MemberRepository memberRepository;
    private final ModelMapper modelMapper;
    private final PasswordEncoder passwordEncoder;

    //회원인지 체크
    @Override
    public boolean existsByEmail(String email) {
        return memberRepository.existsByMemberEmail(email);
    }

    @Override
    public JoinMemberRes joinMember(JoinMemberReq joinMemberReq) {

        String memberId = joinMemberReq.getMemberEmail();
        if (memberRepository.existsByMemberEmail(memberId)) {
            throw new MemberIdExistException("이미 존재하는 회원의 이메일입니다.");
        }
        if (memberRepository.existsByMemberNickName(joinMemberReq.getMemberNickName())) {
            throw new DuplicateNicknameException("이미 사용 중인 닉네임입니다.");
        }
        MemberEntity memberEntity = modelMapper.map(joinMemberReq, MemberEntity.class);
        memberEntity.setMemberEmail(memberId);
        memberEntity.setMemberPw((passwordEncoder.encode(joinMemberReq.getMemberPw())));

        memberEntity.setMemberRole(MemberRole.USER);

        memberEntity.setMembershipType(MembershipPayType.NO_MEMBERSHIP);
        memberEntity.setPopType(PopPlanType.NO_POP);
        memberEntity.setContentManager(false);

        // 🔥 가입 시 기본 이미지 URL 설정 (실제 파일 업로드 X)
        memberEntity.setMemberImage("/images/default-profile.png"); // 기본이미지 경로에 맞게 수정할것!!!!!

        MemberEntity savedMemberEntity = memberRepository.save(memberEntity);
        return JoinMemberRes.from(savedMemberEntity);
    }

    //헬퍼메서드
    public static class MemberIdExistException extends RuntimeException {
        public MemberIdExistException(String message) { super(message); }
    }
    public static class DuplicateNicknameException extends RuntimeException { // 🔥 닉네임 중복 예외
        public DuplicateNicknameException(String message) { super(message); }
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<ReadAllMemberRes> readAllMember() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || auth instanceof AnonymousAuthenticationToken) {
            throw  new ResponseStatusException(HttpStatus.UNAUTHORIZED,"인증이 필요합니다");
        }

        List<MemberEntity> member = memberRepository.findAll();

        return ReadAllMemberRes.from(member);
    }
    //페이징처리 고민

    @Override
    @PreAuthorize("isAuthenticated()")   // 로그인은 기본
    @Transactional(readOnly = true)
    public ReadOneMemberRes readOneMember(ReadOneMemberReq readOneMemberReq) {

        // === 1) 인증 정보 ===
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        String loginEmail = auth.getName(); // JWT subject (이메일)
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        // === 2) 요청으로 들어온 targetEmail ===
        String targetEmail = readOneMemberReq.getMemberEmail();

        if (targetEmail == null || targetEmail.isBlank()) {
            // null 이면 무조건 자기 자신
            targetEmail = loginEmail;
        }

        // === 3) 본인 or ADMIN 검증 ===
        boolean isSelf = loginEmail.equalsIgnoreCase(targetEmail);
        if (!(isSelf || isAdmin)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "본인 또는 관리자만 정보를 조회할 수 있습니다."
            );
        }

        // === 4) 실제 조회는 이메일 기준 ===
        MemberEntity memberEntity = memberRepository.findByMemberEmail(targetEmail)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."));

        // === 5) DTO 변환 ===
        return ReadOneMemberRes.from(memberEntity);
    }

    // ==========================================
    //  회원정보 변경 (이름/성별/생년/연락처/주소 등)
    //  /member/modify (JSON) 에서 사용
    // ==========================================
    @Override
    @Transactional
    public ModifyMemberRes modifyMember(ModifyMemberReq req) {

        // 1) 수정 대상 회원 조회 + 권한 검증
        MemberEntity memberEntity = getUpdatableMember(req.getMemberEmail());
        req.setMemberEmail(memberEntity.getMemberEmail());

        // 2) 일반 정보 변경 (이미지/비밀번호는 절대 건드리지 않음)
        memberEntity.setMemberName(req.getMemberName());
        memberEntity.setMemberGender(req.getMemberGender());           // enum이면 enum
        memberEntity.setMemberBirthY(req.getMemberBirthY());     // int/String, 형님 타입에 맞게
        memberEntity.setMemberPhone(req.getMemberPhone());

        memberRepository.save(memberEntity);

        return ModifyMemberRes.from(memberEntity);
    }


    // ==========================================
    //  프로필 수정 (닉네임 + 이미지)
    //  /member/profile (multipart) 에서 사용
    // ==========================================
    @Override
    @Transactional
    public ModifyMemberRes modifyProfile(ModifyProfileReq req,
                                         MultipartFile profileFile,
                                         Boolean removeProfile) {

        // 1) 수정 대상 회원 조회 + 권한 검증
        MemberEntity memberEntity = getUpdatableMember(req.getMemberEmail());

        // 비관리자인 경우 실제 이메일을 DTO에도 세팅 (로그 남길 때 편함)
        req.setMemberEmail(memberEntity.getMemberEmail());

        // 2) 닉네임만 수정
        memberEntity.setMemberNickName(req.getMemberNickName());

        // 3) 프로필 이미지 처리 (삭제/업로드)
        applyProfileImageUpdate(memberEntity, profileFile, removeProfile);

        memberRepository.save(memberEntity);

        return ModifyMemberRes.from(memberEntity);
    }


    /**
     * 🔥 공통: 현재 로그인 사용자 기반으로 "수정 가능한 회원"을 찾아온다.
     *
     * - 비관리자 : 무조건 자기 자신만 수정 가능
     * - 관리자   : 요청 바디에 들어온 memberEmail 기준으로 수정 가능
     * - 공통     : 본인 또는 ADMIN이 아니면 403
     */
    // ==========================================
    //  공통: 수정 가능한 회원 조회
    // ==========================================
    private MemberEntity getUpdatableMember(String requestEmail) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        boolean isAdmin = auth.getAuthorities().stream()
                .map(granted -> granted.getAuthority())
                .anyMatch(role -> "ROLE_ADMIN".equals(role) || "ADMIN".equals(role));

        String loginEmail = auth.getName(); // JWT subject = 이메일

        // ADMIN이면 요청 이메일 우선, 없으면 자기 자신 / USER는 항상 자기 자신
        String targetEmail;
        if (isAdmin && StringUtils.hasText(requestEmail)) {
            targetEmail = requestEmail;
        } else {
            targetEmail = loginEmail;
        }

        if (!StringUtils.hasText(targetEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "대상 이메일이 없습니다.");
        }

        // 본인 또는 ADMIN만 허용
        if (!(isAdmin || loginEmail.equalsIgnoreCase(targetEmail))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 또는 관리자만 수정 가능합니다.");
        }

        return memberRepository.findByMemberEmail(targetEmail)
                .orElseThrow(() -> new UsernameNotFoundException(targetEmail));
    }

    // ==========================================
    //  공통: 프로필 이미지 삭제/업데이트 처리
    // ==========================================
    private void applyProfileImageUpdate(MemberEntity memberEntity,
                                         MultipartFile file,
                                         Boolean removeProfile) {

        // 1) 삭제 플래그가 true면 먼저 전부 삭제
        if (Boolean.TRUE.equals(removeProfile)) {
            clearProfileImages(memberEntity);
        }

        // 2) 새 파일이 올라오면 기존 이미지 제거 후 새로 1장 등록
        if (file != null && !file.isEmpty()) {
            validateImage(file);

            clearProfileImages(memberEntity); // 기존 이미지/파일 정리

            ImageDTO dto = fileService.uploadFile(file, 0); // sortOrder = 0 고정
            ImageEntity image = ImageEntity.fromDtoForMember(dto, memberEntity);
            memberEntity.addImage(image);
            memberEntity.setMemberImage(dto.getUrl());      // 문자열 캐시 동기화
        }
    }

    // 기존 이미지 전부 제거 + 파일 삭제
    private void clearProfileImages(MemberEntity memberEntity) {
        List<ImageEntity> currentImages = new ArrayList<>(memberEntity.getImages());
        for (ImageEntity img : currentImages) {
            String fileName = img.getFileName();
            if (StringUtils.hasText(fileName)) {
                fileService.deleteFile(fileName);   // 스토리지에서 실제 파일 삭제
            }
            memberEntity.removeImage(img);          // 연관관계 제거 (orphanRemoval)
        }
        memberEntity.setMemberImage(null);          // 캐시 필드도 초기화
    }

    // 이미지 유효성 검증 (형님 기존 로직 그대로)
    private void validateImage(MultipartFile file) {
        long max = 5 * 1024 * 1024L; // 5MB
        if (file.getSize() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일이 너무 큽니다(최대 5MB).");
        }
        String ct = file.getContentType();
        if (ct == null || !(ct.equals("image/png") || ct.equals("image/jpeg") || ct.equals("image/webp"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "허용되지 않는 이미지 타입입니다.");
        }
    }

    // ==========================================
    //  비밀번호 변경 전용
    //  /member/password (JSON) 에서 사용
    // ==========================================
    @Override
    @Transactional
    public void changePassword(ChangePasswordReq req) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        String email = auth.getName(); // JWT subject = 이메일

        MemberEntity member = memberRepository.findByMemberEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(email));

        // 1) 현재 비밀번호 검증
        if (!passwordEncoder.matches(req.getCurrentPassword(), member.getMemberPw())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
        }

        // 2) 새 비밀번호 확인
        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호가 서로 일치하지 않습니다.");
        }

        // 3) 비밀번호 변경
        member.setMemberPw(passwordEncoder.encode(req.getNewPassword()));
        memberRepository.save(member);
    }

    @Override
    public DeleteMemberRes deleteMember(DeleteMemberReq deleteMemberReq) {

        //회원의 id(email)과 pw를 받음
        String memberId = deleteMemberReq.getMemberEmail();
        String currentPw = deleteMemberReq.getCurrentPw();

        //로그인한 유저의 인증정보 확인
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        //로그인 하지 않으면 401
        if (auth == null || !auth.isAuthenticated()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);

        //로그인 한 사람이 누군지 확인
        String loginEmail = auth.getName();

        //로그인 한 사람의 권한을 확인
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        //관리자거나 본인이 아니면 안 됨 아니라면 403
        if (!(isAdmin || loginEmail.equalsIgnoreCase(memberId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 또는 관리자만 가능합니다.");
        }

        //회원을 찾음 없으면 404
        MemberEntity memberEntity = memberRepository.findByMemberEmail(memberId).orElseThrow(()
                -> new ResponseStatusException(HttpStatus.NOT_FOUND,"회원을 찾을 수 없습니다"));

        //비밀번호 검증 틀리면 400
        if (currentPw == null || currentPw.isBlank()
                || !passwordEncoder.matches(currentPw, memberEntity.getMemberPw())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호가 일치하지 않습니다.");
        }

        //실제로는 지우지 않고 권한을 블랙리스트로 강등
        memberEntity.setMemberRole(MemberRole.BLACKLIST);
        memberRepository.saveAndFlush(memberEntity);
        return DeleteMemberRes.from(memberEntity);
    }

}
