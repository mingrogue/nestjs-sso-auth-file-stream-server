import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { StreamingService, FileInfo } from '../../services/streaming.service';

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit {
  fileId = '';
  fileInfo: FileInfo | null = null;
  streamUrl = '';
  loading = true;
  textContent = '';
  textLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private streamingService: StreamingService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.fileId = params['fileId'] || params['filename'];
      this.loadFileInfo();
    });
  }

  loadFileInfo(): void {
    this.streamingService.getFileInfo(this.fileId).subscribe({
      next: (response) => {
        this.fileInfo = response.file;
        this.streamUrl = this.streamingService.getStreamUrl(this.fileId);
        this.loading = false;
        
        if (this.isTextFile) {
          this.loadTextContent();
        }
      },
      error: () => {
        this.router.navigate(['/files']);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/files']);
  }

  get isTextFile(): boolean {
    return this.fileInfo?.mimeType.startsWith('application/json') 
    || this.fileInfo?.mimeType.startsWith('application/text') 
    || false;
  }

  loadTextContent(): void {
    this.textLoading = true;
    this.http.get(this.streamUrl, { responseType: 'text' }).subscribe({
      next: (content) => {
        this.textContent = content;
        this.textLoading = false;
      },
      error: () => {
        this.textContent = 'Failed to load text content.';
        this.textLoading = false;
      }
    });
  }
}
