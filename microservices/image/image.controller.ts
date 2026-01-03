import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ImageService } from './image.service';
import { Response } from 'express';
import { existsSync } from 'fs';

@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Get(':filename')
  getImage(@Param('filename') filename: string, @Res() res: Response) {
    const { path, exists } = this.imageService.getImagePath(filename);
    
    if (!exists) {
      throw new NotFoundException('Image not found');
    }
    
    return res.sendFile(path);
  }
}
