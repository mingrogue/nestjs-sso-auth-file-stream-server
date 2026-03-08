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
  filteredFiles: FileInfo[] = [];
  myFiles: FileInfo[] = [];
  user: User | null = null;
  loading = true;
  loadingMyFiles = true;
  uploading = false;
  error = '';
  uploadProgress = 0;
  showUploadModal = false;
  selectedFile: File | null = null;
  description = '';
  tags = '';
  privacyType: string = 'public';
  sidebarCollapsed = false;
  searchQuery = '';

  constructor(
    private streamingService: StreamingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.user = user);
    this.loadFiles();
    this.loadMyFiles();
  }

  loadFiles(): void {
    this.loading = true;
    this.streamingService.getFiles().subscribe({
      next: (response) => {
        this.files = response.files;
        this.filterFiles();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load files';
        this.loading = false;
      }
    });
  }

  filterFiles(): void {
    if (!this.searchQuery.trim()) {
      this.filteredFiles = this.files;
      return;
    }
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredFiles = this.files.filter(file =>
      file.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }

  onSearchChange(): void {
    this.filterFiles();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterFiles();
  }

  loadMyFiles(): void {
    this.loadingMyFiles = true;
    this.streamingService.getMyFiles().subscribe({
      next: (response) => {
        this.myFiles = response.files;
        this.loadingMyFiles = false;
      },
      error: (err) => {
        this.loadingMyFiles = false;
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
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

    this.streamingService.uploadFile(this.selectedFile, this.description, tagsArray, this.privacyType).subscribe({
      next: (response) => {
        this.uploading = false;
        this.closeUploadModal();
        this.loadFiles();
        this.loadMyFiles();
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
        next: () => {
          this.loadFiles();
          this.loadMyFiles();
        },
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

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  getImageUrl(file: FileInfo): string {
    return this.streamingService.getStreamUrl(file.id);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
