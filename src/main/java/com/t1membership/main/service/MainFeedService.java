package com.t1membership.main.service;

import com.t1membership.main.dto.MainPageRes;
import org.springframework.data.domain.Page;

public interface MainFeedService {
    public MainPageRes getMainPage();
}
