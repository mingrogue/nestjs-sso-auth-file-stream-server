import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Headers,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Multer } from 'multer';
import { StreamingService } from './streaming.service';
import { JwtAuthGuard, CurrentUser } from '@app/common';
import type { IUser } from '@app/common';
import { IsOptional, IsString } from 'class-validator';

class UploadFileDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}

@Controller('stream')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'streaming',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('files')
  async listFiles(@CurrentUser() user: IUser) {
    return {
      user: { id: user.id, username: user.username },
      files: await this.streamingService.listFiles(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-files')
  async listMyFiles(@CurrentUser() user: IUser) {
    return {
      user: { id: user.id, username: user.username },
      files: await this.streamingService.listFilesByUser(user.id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  }))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadFileDto,
    @CurrentUser() user: IUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const tags = body.tags ? body.tags.split(',').map(t => t.trim()) : [];
    
    const uploadedFile = await this.streamingService.uploadFile(
      file,
      user.id,
      body.description,
      tags,
    );

    return {
      message: 'File uploaded successfully',
      file: uploadedFile,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('file/:fileId')
  async deleteFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: IUser,
  ) {
    await this.streamingService.deleteFile(fileId, user.id);
    return {
      message: 'File deleted successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('info/:fileId')
  async getFileInfo(
    @Param('fileId') fileId: string,
    @CurrentUser() user: IUser,
  ) {
    const file = await this.streamingService.getFileInfoById(fileId);
    if (!file) {
      throw new BadRequestException('File not found');
    }
    return {
      user: { id: user.id, username: user.username },
      file,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('download/:fileId')
  @HttpCode(HttpStatus.OK)
  async streamFileById(
    @Param('fileId') fileId: string,
    @Headers('range') range: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Headers('if-modified-since') ifModifiedSince: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | void> {
    const result = await this.streamingService.streamFileById(
      fileId,
      { range, ifNoneMatch, ifModifiedSince },
      res,
    );

    if (result === null) {
      return;
    }

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':filename')
  @HttpCode(HttpStatus.OK)
  async streamFile(
    @Param('filename') filename: string,
    @Headers('range') range: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Headers('if-modified-since') ifModifiedSince: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | void> {
    const result = await this.streamingService.streamFile(
      { filename, range, ifNoneMatch, ifModifiedSince },
      res,
    );

    if (result === null) {
      return;
    }

    return result;
  }
}
