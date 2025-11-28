package com.t1membership.main.service;

import com.t1membership.main.dto.MainFeedCardRes;
import org.springframework.data.domain.Page;

public interface MainFeedService {
    Page<MainFeedCardRes> readMainFeed(int page, int size);
}
