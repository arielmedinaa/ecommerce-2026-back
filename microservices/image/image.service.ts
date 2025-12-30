import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class ImageService {
  private readonly basePath = join(__dirname, '..', '..', '..', 'uploads');

  getImagePath(filename: string): { path: string; exists: boolean } {
    const filePath = join(this.basePath, filename);
    return {
      path: filePath,
      exists: existsSync(filePath)
    };
  }

  getImageUrl(filename: string): string {
    return `/images/${filename}`;
  }
}
