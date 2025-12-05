package com.t1membership.board.service;

import com.t1membership.board.dto.banner.BannerOrderReq;
import com.t1membership.board.dto.banner.ContentBannerRes;

import java.util.List;

public interface ContentBannerService {

    List<ContentBannerRes> readMainBanners();

    List<ContentBannerRes> readAdminBanners();

    void updateBannerSettings(List<BannerOrderReq> reqList);

}
