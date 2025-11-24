package com.t1membership.image.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ToString
public class ImageListDTO {

    public List<ImageDTO> image = new ArrayList<>();

    public void addImage(ImageDTO imageDTO) { image.add(imageDTO); }

}
