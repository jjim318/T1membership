package com.t1membership.member.service;

import com.t1membership.image.domain.ImageEntity;
import com.t1membership.image.dto.ImageDTO;
import com.t1membership.image.service.FileService;
import com.t1membership.member.constant.MemberRole;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.dto.deleteMember.DeleteMemberReq;
import com.t1membership.member.dto.deleteMember.DeleteMemberRes;
import com.t1membership.member.dto.joinMember.JoinMemberReq;
import com.t1membership.member.dto.joinMember.JoinMemberRes;
import com.t1membership.member.dto.modifyMember.ModifyMemberReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberRes;
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
    @PreAuthorize("isAuthenticated() and (hasRole('ADMIN') or #p0.memberEmail == authentication.name)")
    @Transactional(readOnly = true)
    public ReadOneMemberRes readOneMember(ReadOneMemberReq readOneMemberReq) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String memberId = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        if (!isAdmin && !memberRepository.existsById(memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"본인 정보만 조회할 수 있습니다");
        }

        MemberEntity memberEntity = memberRepository.findById(memberId)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"회원을 찾을 수 없습니다"));
        return ReadOneMemberRes.from(memberEntity);
    }

    @Override
    @Transactional
    public ModifyMemberRes modifyMember(ModifyMemberReq modifyMemberReq,
                                        MultipartFile multipartFile,
                                        Boolean removeProfile) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        //권한 문자열 확인
        boolean isAdmin = auth.getAuthorities().stream()
                .map(granted -> granted.getAuthority())
                .anyMatch(role -> "ROLE_ADMIN".equals(role) || "ADMIN".equals(role));

        String loginEmail = auth.getName(); // JWT의 subject/username이 이메일이라고 가정

        //본인 요청의 경우 요청 바디에 이메일을 로그인 이메일로 강제 고정
        if (!isAdmin) {
            modifyMemberReq.setMemberEmail(loginEmail);
        }

        String memberId = modifyMemberReq.getMemberEmail();

        //대상 이메일 누락 방어
        if (!StringUtils.hasText(memberId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "대상 이메일이 없습니다.");
        }

        //본인 또는 관리자만 허용
        if (!(isAdmin || loginEmail.equalsIgnoreCase(memberId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 또는 관리자만 수정 가능합니다.");
        }

        //조회
        MemberEntity memberEntity = memberRepository.findById(memberId)
                .orElseThrow(() -> new UsernameNotFoundException(memberId));

        //비밀번호 변경
        String memberPw = modifyMemberReq.getMemberPw();
        if (StringUtils.hasText(memberPw)){
            memberEntity.setMemberPw(passwordEncoder.encode(memberPw));
        }
        //일반 정보 변경
        memberEntity.setMemberAddress(modifyMemberReq.getMemberAddress());
        memberEntity.setMemberNickName(modifyMemberReq.getMemberNickName());
        memberEntity.setMemberPhone(modifyMemberReq.getMemberPhone());

        // =========================
        //   프로필 이미지 처리
        // =========================
        // 1) 삭제 요청이 먼저라면 -> 기존 이미지 전부 제거
        if (Boolean.TRUE.equals(removeProfile)) {
            List<ImageEntity> currentImages = new ArrayList<>(memberEntity.getImages());
            for (ImageEntity img : currentImages) {
                String fileName = img.getFileName();
                if (StringUtils.hasText(fileName)) {
                    fileService.deleteFile(fileName);   // 실제 파일 삭제 (비동기 가능)
                }
                memberEntity.removeImage(img);          // 연관관계 제거 (orphanRemoval로 DB row 삭제)
            }
            memberEntity.setMemberImage(null);          // 문자열 URL 캐시도 비움
        }

        // 2) 새 프로필 이미지 업로드 요청이 있으면 → 기존 것들 지우고 새로 1장 등록
        if (multipartFile != null && !multipartFile.isEmpty()) {
            validateImage(multipartFile);

            // 기존 이미지 정리 (파일 + DB)
            List<ImageEntity> currentImages = new ArrayList<>(memberEntity.getImages());
            for (ImageEntity img : currentImages) {
                String fileName = img.getFileName();
                if (StringUtils.hasText(fileName)) {
                    fileService.deleteFile(fileName);
                }
                memberEntity.removeImage(img);
            }

            // 새 파일 저장 (프로필은 1장이므로 sortOrder=0 고정)
            ImageDTO dto = fileService.uploadFile(multipartFile, 0);

            // DTO -> 엔티티 변환 + 멤버 연결
            ImageEntity image = ImageEntity.fromDtoForMember(dto, memberEntity);
            memberEntity.addImage(image);

            // 문자열 캐시 필드도 동기화 (있으면)
            memberEntity.setMemberImage(dto.getUrl());
        }

        // 영속 엔티티라 save() 호출 안 해도 되지만, 명시적으로 한 번 호출해도 무방
        memberRepository.save(memberEntity);

        return ModifyMemberRes.from(memberEntity);
    }

    // 이미지 유효성 검증 (기존 로직 그대로 사용)
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

    @Override
    public DeleteMemberRes deleteMember(DeleteMemberReq deleteMemberReq) {

        //회원의 id(email)과 pw를 받음
        String memberId = deleteMemberReq.getMemberEmail();
        String currentPw = deleteMemberReq.getCurrenPw();

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
        MemberEntity memberEntity = memberRepository.findById(memberId).orElseThrow(()
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
