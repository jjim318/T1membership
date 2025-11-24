package com.t1membership.member.dto.exists;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailExistsRes {
    private boolean exists;
}
