import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface FileUser {
  id: string;
  name: string;
  email: string;
}

export interface FileInfo {
  id: string;
  _id: string;
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
  user?: FileUser;
  downloadCount: number;
  createdAt: Date;
  modifiedAt: Date;
}

export interface FilesResponse {
  user: { id: string; username: string };
  files: FileInfo[];
}

export interface UploadResponse {
  message: string;
  file: FileInfo;
}

@Injectable({
  providedIn: 'root'
})
export class StreamingService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getFiles(): Observable<FilesResponse> {
    return this.http.get<FilesResponse>(`${environment.streamingUrl}/stream/files`);
  }

  getMyFiles(): Observable<FilesResponse> {
    return this.http.get<FilesResponse>(`${environment.streamingUrl}/stream/my-files`);
  }

  getFileInfo(fileId: string): Observable<{ user: any; file: FileInfo }> {
    return this.http.get<{ user: any; file: FileInfo }>(`${environment.streamingUrl}/stream/info/${fileId}`);
  }

  uploadFile(file: File, description?: string, tags?: string[], privacyType?: string): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    if (tags && tags.length > 0) {
      formData.append('tags', tags.join(','));
    }
    if (privacyType) {
      formData.append('isPublic', privacyType === 'public' ? 'true' : 'false');
    }
    return this.http.post<UploadResponse>(`${environment.streamingUrl}/stream/upload`, formData);
  }

  deleteFile(fileId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.streamingUrl}/stream/file/${fileId}`);
  }

  getStreamUrl(fileId: string): string {
    const token = this.authService.token;
    console.log(fileId);
    
    return `${environment.streamingUrl}/stream/download/${fileId}?token=${token}`;
  }

  getStreamUrlByFilename(filename: string): string {
    const token = this.authService.token;
    console.log(filename);
    
    return `${environment.streamingUrl}/stream/${filename}?token=${token}`;
  }
}
