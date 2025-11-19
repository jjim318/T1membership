package com.t1membership.member.service;

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
import groovyjarjarpicocli.CommandLine;
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

import java.io.File;
import java.io.IOException;
import java.util.DuplicateFormatFlagsException;
import java.util.List;
import java.util.UUID;

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
        if (memberRepository.existsByNickname(joinMemberReq.getMemberNickName())) {
            throw new DuplicateNicknameException("이미 사용 중인 닉네임입니다.");
        }
        MemberEntity memberEntity = modelMapper.map(joinMemberReq, MemberEntity.class);
        memberEntity.setMemberEmail(memberId);
        memberEntity.setMemberPw((passwordEncoder.encode(joinMemberReq.getMemberPw())));

        memberEntity.setMemberRole(MemberRole.USER);

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
    //isAuthenticated() : 로그인(인증)이 되어야 진입가능
    //hasRole('ADMIN') : 어드민이면 무조건 통과
    //#p0.memberId == authentication.name : 첫 번째 파라미터(#p.0)인 readOneMemberReq의 memberEmail과 현재 로그인한 사용자의 이름(authentication.name)과 같아야 통과
    @Transactional(readOnly = true)//읽기 전용 트랜잭션
    //조회 성능/안전성(우발적 flush 방지)에 유리
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
        //클라이언트가 다른 이메일로 조작해도 무효
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

        //이미지 처리
        String oldUrl = memberEntity.getMemberImage(); // 현재 문자열 URL

        if (multipartFile != null && !multipartFile.isEmpty()) {
            //새 파일 교체(검증
            validateImage(multipartFile);
            //기존 파일 물리 삭제
            if (StringUtils.hasText(oldUrl)) {
                deletePhysicalIfLocal(oldUrl);
            }
            //새 파일 저장 후 URL 세팅
            String newUrl = storeFileAndGetUrl(multipartFile);
            memberEntity.setMemberImage(newUrl);
        } else if (Boolean.TRUE.equals(removeProfile)) {
            //삭제만 요청
            if (StringUtils.hasText(oldUrl)) {
                deletePhysicalIfLocal(oldUrl);
            }
            memberEntity.setMemberImage(null); // 또는 ""로 비움
        }
        //그게 아니라면 그대로

        memberRepository.save(memberEntity);

        return ModifyMemberRes.from(memberEntity);
    }
    //헬퍼
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

    private void deletePhysicalIfLocal(String urlOrPath) {
        // 로컬이면 Files.deleteIfExists(...), S3면 s3Client.deleteObject(...)
        // 구현체에 맞게 작성
        String basePath = "C:/t1membership/uploads/";

        String fileName = urlOrPath.replace("/uploads/", "");
        File file = new File(basePath + fileName);

        if (file.exists()) {
            file.delete();
        }
    }

    private String storeFileAndGetUrl(MultipartFile file) {
        try {
            // 1) 저장할 실제 경로
            String uploadDir = "C:/t1membership/uploads/";  // 형님이 원하는 경로로 변경 가능

            // 2) 파일 이름 랜덤으로 변경 (덮어쓰기 방지)
            String newFileName = UUID.randomUUID() + "_" + file.getOriginalFilename();

            // 3) 파일 저장
            File saveFile = new File(uploadDir, newFileName);
            file.transferTo(saveFile);

            // 4) 프론트에서 접근할 수 있는 URL 반환
            return "/uploads/" + newFileName;

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 저장 실패", e);
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
        //발급한 토큰 무효화/삭제 + 로그로 남김
//        try {
//            Instant now = Instant.now();
//            tokenRepository.revokeAllActiveByMemberId(memberId, now);
//        } catch (Exception ex) {
//            log.warning("[member-delete] revoke tokens failed ...");
//        }
//        try {
//            tokenRepository.deleteByMemberId(memberId);
//        } catch (Exception ex) {
//            log.warning("[member-delete] delete tokens failed ...");
//        }

        //실제로는 지우지 않고 권한을 블랙리스트로 강등
        memberEntity.setMemberRole(MemberRole.BLACKLIST);
        memberRepository.saveAndFlush(memberEntity);
        return DeleteMemberRes.from(memberEntity);
    }

}
