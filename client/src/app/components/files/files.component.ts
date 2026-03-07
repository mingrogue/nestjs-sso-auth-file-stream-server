import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { StreamingService, FileInfo } from '../../services/streaming.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-files',
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.scss']
})
export class FilesComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  files: FileInfo[] = [];
  user: User | null = null;
  loading = true;
  uploading = false;
  error = '';
  uploadProgress = 0;
  showUploadModal = false;
  selectedFile: File | null = null;
  description = '';
  tags = '';

  constructor(
    private streamingService: StreamingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.user = user);
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading = true;
    this.streamingService.getFiles().subscribe({
      next: (response) => {
        this.files = response.files;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load files';
        this.loading = false;
      }
    });
  }

  openUploadModal(): void {
    this.showUploadModal = true;
    this.selectedFile = null;
    this.description = '';
    this.tags = '';
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.selectedFile = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.uploading = true;
    const tagsArray = this.tags ? this.tags.split(',').map(t => t.trim()).filter(t => t) : [];

    this.streamingService.uploadFile(this.selectedFile, this.description, tagsArray).subscribe({
      next: (response) => {
        this.uploading = false;
        this.closeUploadModal();
        this.loadFiles();
      },
      error: (err) => {
        this.uploading = false;
        this.error = 'Failed to upload file';
      }
    });
  }

  deleteFile(file: FileInfo, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      this.streamingService.deleteFile(file.id).subscribe({
        next: () => this.loadFiles(),
        error: () => this.error = 'Failed to delete file'
      });
    }
  }

  playFile(file: FileInfo): void {
    this.router.navigate(['/player', file.id]);
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    return '📁';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
