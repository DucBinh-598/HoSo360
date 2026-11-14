import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TokenGuard } from './api.controller';
import { FilesService, LocalUpload } from './files.service';

@Controller()
@UseGuards(TokenGuard)
export class FilesController {
  constructor(private files: FilesService) {}

  @Get('folders')
  listFolders(@Req() req: any, @Query('parentId') parentId?: string) {
    return this.files.listFolders(req.user, parentId);
  }

  @Post('folders')
  createFolder(@Req() req: any, @Body() input: { name?: string; parentId?: string }) {
    return this.files.createFolder(req.user, input);
  }

  @Get('files')
  listFiles(@Req() req: any, @Query('folderId') folderId?: string) {
    return this.files.listFiles(req.user, folderId);
  }

  @Post('files')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!FilesService.isAllowedUpload(file.originalname, file.mimetype)) {
        callback(new BadRequestException('Định dạng tệp chưa được hỗ trợ'), false);
        return;
      }
      callback(null, true);
    },
  }))
  upload(@Req() req: any, @UploadedFile() file: LocalUpload) {
    return this.files.upload(req.user, file, req.body);
  }

  @Get('files/:id/versions')
  listVersions(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.files.listVersions(req.user, id);
  }

  @Post('files/:id/versions')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!FilesService.isAllowedUpload(file.originalname, file.mimetype)) {
        callback(new BadRequestException('Định dạng tệp chưa được hỗ trợ'), false);
        return;
      }
      callback(null, true);
    },
  }))
  uploadVersion(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: LocalUpload,
  ) {
    return this.files.uploadVersion(req.user, id, file);
  }

  @Get('files/:id/content')
  async content(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('version') version: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.files.content(req.user, id, version);
    return this.sendFile(res, data, false);
  }

  @Get('files/:id/download')
  async download(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('version') version: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.files.content(req.user, id, version);
    return this.sendFile(res, data, true);
  }

  private sendFile(
    response: Response,
    data: { buffer: Buffer; name: string; mimeType: string; sizeBytes: number },
    download: boolean,
  ) {
    const disposition = download ? 'attachment' : 'inline';
    response.set({
      'Content-Type': data.mimeType,
      'Content-Length': data.sizeBytes,
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(data.name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return response.send(data.buffer);
  }
}
