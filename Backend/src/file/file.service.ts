import * as multer from 'multer';
import { extname } from 'path';
import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly uploadPath = path.join(__dirname, '..', '..', 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath); 
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const fileExtension = extname(file.originalname);
    const filename = `${Date.now()}${fileExtension}`;

    
    const filePath = path.join(this.uploadPath, filename);
    fs.writeFileSync(filePath, file.buffer);

    return filename; 
  }
}

