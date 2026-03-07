import {
  Injectable,
  NotFoundException,
  StreamableFile,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, Stats, unlinkSync } from 'fs';
import { stat, readdir, unlink, writeFile } from 'fs/promises';
import { join, resolve, normalize, basename, extname } from 'path';
import { createHash, randomUUID } from 'crypto';
import { Response } from 'express';
import { FileMetadata, FileDocument } from './schemas/file.schema';

export interface FileInfo {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  isStreamable: boolean;
  etag: string;
  description?: string;
  tags: string[];
  uploadedBy: string;
  downloadCount: number;
  createdAt: Date;
  modifiedAt: Date;
}

export interface StreamOptions {
  filename: string;
  range?: string;
  ifNoneMatch?: string;
  ifModifiedSince?: string;
}

@Injectable()
export class StreamingService implements OnModuleInit {
  private readonly logger = new Logger(StreamingService.name);
  private readonly filesDirectory: string;
  private readonly maxChunkSize: number;
  private readonly allowedExtensions: Set<string>;

  private readonly mimeTypes: Record<string, string> = {
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    mkv: 'video/x-matroska',
    m4v: 'video/x-m4v',
    '3gp': 'video/3gpp',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    wma: 'audio/x-ms-wma',
    opus: 'audio/opus',
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
    md: 'text/markdown',
    // Archives
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };

  constructor(
    @InjectModel(FileMetadata.name) private fileModel: Model<FileDocument>,
    private readonly configService: ConfigService,
  ) {
    this.filesDirectory = resolve(
      this.configService.get<string>('FILES_DIRECTORY', './uploads'),
    );
    this.maxChunkSize = this.configService.get<number>(
      'MAX_CHUNK_SIZE',
      10 * 1024 * 1024, // 10MB default
    );
    this.allowedExtensions = new Set(
      this.configService
        .get<string>('ALLOWED_EXTENSIONS', Object.keys(this.mimeTypes).join(','))
        .split(',')
        .map((ext) => ext.trim().toLowerCase()),
    );
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    description?: string,
    tags?: string[],
  ): Promise<FileInfo> {
    const ext = extname(file.originalname).toLowerCase().slice(1);
    
    if (!this.allowedExtensions.has(ext)) {
      throw new BadRequestException(`File type not allowed: ${ext}`);
    }

    const uniqueFilename = `${randomUUID()}${extname(file.originalname)}`;
    const storagePath = join(this.filesDirectory, uniqueFilename);

    await writeFile(storagePath, file.buffer);

    const fileMetadata = new this.fileModel({
      filename: uniqueFilename,
      originalName: file.originalname,
      mimeType: file.mimetype || this.getMimeType(file.originalname),
      size: file.size,
      storagePath,
      uploadedBy: new Types.ObjectId(userId),
      description,
      tags: tags || [],
    });

    await fileMetadata.save();
    this.logger.log(`File uploaded: ${file.originalname} by user ${userId}`);

    return this.toFileInfo(fileMetadata);
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileModel.findById(fileId);
    
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.uploadedBy.toString() !== userId) {
      throw new BadRequestException('You can only delete your own files');
    }

    try {
      await unlink(file.storagePath);
    } catch (err) {
      this.logger.warn(`Could not delete file from disk: ${file.storagePath}`);
    }

    await this.fileModel.findByIdAndDelete(fileId);
    this.logger.log(`File deleted: ${file.originalName} by user ${userId}`);
  }

  async getFileById(fileId: string): Promise<FileDocument | null> {
    return this.fileModel.findById(fileId);
  }

  async listFilesByUser(userId: string): Promise<FileInfo[]> {
    const files = await this.fileModel
      .find({ uploadedBy: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    return files.map((file) => this.toFileInfo(file));
  }

  async listAllFiles(): Promise<FileInfo[]> {
    const files = await this.fileModel
      .find()
      .sort({ createdAt: -1 })
      .exec();

    return files.map((file) => this.toFileInfo(file));
  }

  async incrementDownloadCount(fileId: string): Promise<void> {
    await this.fileModel.findByIdAndUpdate(fileId, {
      $inc: { downloadCount: 1 },
      lastAccessedAt: new Date(),
    });
  }

  private toFileInfo(file: FileDocument): FileInfo {
    return {
      id: file._id.toString(),
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      sizeFormatted: this.formatBytes(file.size),
      mimeType: file.mimeType,
      isStreamable: this.isStreamable(file.mimeType),
      etag: this.generateETagFromFile(file),
      description: file.description,
      tags: file.tags,
      uploadedBy: file.uploadedBy.toString(),
      downloadCount: file.downloadCount,
      createdAt: (file as any).createdAt,
      modifiedAt: (file as any).updatedAt,
    };
  }

  private generateETagFromFile(file: FileDocument): string {
    const hash = createHash('md5')
      .update(`${file._id}:${file.size}:${(file as any).updatedAt?.getTime() || Date.now()}`)
      .digest('hex');
    return `"${hash}"`;
  }

  onModuleInit() {
    this.ensureDirectoryExists();
    this.logger.log(`Streaming service initialized`);
    this.logger.log(`Files directory: ${this.filesDirectory}`);
    this.logger.log(`Max chunk size: ${this.formatBytes(this.maxChunkSize)}`);
  }

  private ensureDirectoryExists(): void {
    if (!existsSync(this.filesDirectory)) {
      mkdirSync(this.filesDirectory, { recursive: true });
      this.logger.log(`Created files directory: ${this.filesDirectory}`);
    }
  }

  async streamFile(
    options: StreamOptions,
    res: Response,
  ): Promise<StreamableFile | null> {
    const { filename, range, ifNoneMatch, ifModifiedSince } = options;
    const startTime = Date.now();

    const filePath = this.validateAndResolvePath(filename);
    const stats = await this.getFileStats(filePath);
    const mimeType = this.getMimeType(filename);
    const etag = this.generateETag(filePath, stats);

    // Handle conditional requests (304 Not Modified)
    if (this.handleConditionalRequest(res, etag, stats, ifNoneMatch, ifModifiedSince)) {
      this.logger.debug(`Cache hit for ${filename} (304)`);
      return null;
    }

    const fileSize = stats.size;

    // Set common headers
    this.setCommonHeaders(res, mimeType, etag, stats, filename);

    if (range) {
      return this.handleRangeRequest(filePath, fileSize, range, mimeType, res, filename, startTime);
    }

    return this.handleFullRequest(filePath, fileSize, res, filename, startTime);
  }

  private handleConditionalRequest(
    res: Response,
    etag: string,
    stats: Stats,
    ifNoneMatch?: string,
    ifModifiedSince?: string,
  ): boolean {
    // ETag match
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return true;
    }

    // Last-Modified match
    if (ifModifiedSince) {
      const modifiedSince = new Date(ifModifiedSince);
      if (stats.mtime <= modifiedSince) {
        res.status(304).end();
        return true;
      }
    }

    return false;
  }

  private setCommonHeaders(
    res: Response,
    mimeType: string,
    etag: string,
    stats: Stats,
    filename: string,
  ): void {
    const isInline = this.isInlineViewable(mimeType);
    const disposition = isInline ? 'inline' : 'attachment';

    res.set({
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'ETag': etag,
      'Last-Modified': stats.mtime.toUTCString(),
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `${disposition}; filename="${this.sanitizeFilename(filename)}"`,
      'X-Content-Type-Options': 'nosniff',
    });
  }

  private handleRangeRequest(
    filePath: string,
    fileSize: number,
    range: string,
    mimeType: string,
    res: Response,
    filename: string,
    startTime: number,
  ): StreamableFile {
    const { start, end } = this.parseRange(range, fileSize);
    const chunkSize = end - start + 1;

    res.set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
    });
    res.status(206);

    const stream = createReadStream(filePath, { start, end });
    
    stream.on('error', (err) => {
      this.logger.error(`Stream error for ${filename}: ${err.message}`);
    });

    stream.on('end', () => {
      const duration = Date.now() - startTime;
      this.logger.debug(
        `Streamed ${this.formatBytes(chunkSize)} of ${filename} in ${duration}ms (range: ${start}-${end})`,
      );
    });

    return new StreamableFile(stream);
  }

  private handleFullRequest(
    filePath: string,
    fileSize: number,
    res: Response,
    filename: string,
    startTime: number,
  ): StreamableFile {
    res.set({ 'Content-Length': fileSize });

    const stream = createReadStream(filePath);

    stream.on('error', (err) => {
      this.logger.error(`Stream error for ${filename}: ${err.message}`);
    });

    stream.on('end', () => {
      const duration = Date.now() - startTime;
      this.logger.debug(
        `Streamed full file ${filename} (${this.formatBytes(fileSize)}) in ${duration}ms`,
      );
    });

    return new StreamableFile(stream);
  }

  private parseRange(range: string, fileSize: number): { start: number; end: number } {
    const rangeMatch = range.match(/bytes=(\d*)-(\d*)/);
    if (!rangeMatch) {
      throw new BadRequestException('Invalid range header format');
    }

    let start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0;
    let end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;

    // Handle suffix range (e.g., bytes=-500)
    if (!rangeMatch[1] && rangeMatch[2]) {
      start = Math.max(0, fileSize - parseInt(rangeMatch[2], 10));
      end = fileSize - 1;
    }

    // Validate range
    if (start < 0 || end >= fileSize || start > end) {
      throw new BadRequestException(
        `Invalid range: ${start}-${end}, file size: ${fileSize}`,
      );
    }

    // Limit chunk size
    if (end - start + 1 > this.maxChunkSize) {
      end = start + this.maxChunkSize - 1;
    }

    return { start, end };
  }

  async getFileInfoByFilename(filename: string): Promise<FileInfo | null> {
    const file = await this.fileModel.findOne({ filename }).exec();
    if (!file) {
      return null;
    }
    return this.toFileInfo(file);
  }

  async getFileInfoById(fileId: string): Promise<FileInfo | null> {
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      return null;
    }
    return this.toFileInfo(file);
  }

  async listFiles(): Promise<FileInfo[]> {
    return this.listAllFiles();
  }

  async streamFileById(
    fileId: string,
    options: Omit<StreamOptions, 'filename'>,
    res: Response,
  ): Promise<StreamableFile | null> {
    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.incrementDownloadCount(fileId);

    return this.streamFile(
      { filename: file.filename, ...options },
      res,
    );
  }

  private validateAndResolvePath(filename: string): string {
    // Sanitize filename - prevent path traversal
    const sanitized = basename(normalize(filename));
    
    if (sanitized !== filename || filename.includes('..') || filename.includes('/')) {
      this.logger.warn(`Blocked path traversal attempt: ${filename}`);
      throw new BadRequestException('Invalid filename');
    }

    // Validate extension
    const ext = sanitized.split('.').pop()?.toLowerCase();
    if (!ext || !this.allowedExtensions.has(ext)) {
      throw new BadRequestException(`File type not allowed: ${ext}`);
    }

    const filePath = join(this.filesDirectory, sanitized);
    const resolvedPath = resolve(filePath);

    // Ensure resolved path is within files directory
    if (!resolvedPath.startsWith(this.filesDirectory)) {
      this.logger.warn(`Blocked directory escape attempt: ${filename}`);
      throw new BadRequestException('Invalid filename');
    }

    return resolvedPath;
  }

  private async getFileStats(filePath: string) {
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        throw new BadRequestException('Not a file');
      }
      return stats;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw err;
    }
  }

  private generateETag(filePath: string, stats: Stats): string {
    const hash = createHash('md5')
      .update(`${filePath}:${stats.size}:${stats.mtime.getTime()}`)
      .digest('hex');
    return `"${hash}"`;
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return this.mimeTypes[ext] || 'application/octet-stream';
  }

  private isStreamable(mimeType: string): boolean {
    return mimeType.startsWith('video/') || mimeType.startsWith('audio/');
  }

  private isInlineViewable(mimeType: string): boolean {
    return (
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf' ||
      mimeType.startsWith('text/')
    );
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/["\\]/g, '_');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
