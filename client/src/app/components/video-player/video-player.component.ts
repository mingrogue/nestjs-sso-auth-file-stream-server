import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StreamingService, FileInfo } from '../../services/streaming.service';
import { AuthService } from '../../services/auth.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private streamingService: StreamingService,
    private authService: AuthService
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
      },
      error: () => {
        this.router.navigate(['/files']);
      }
    });
  }

  get token(): string {
    return this.authService.token || '';
  }

  goBack(): void {
    this.router.navigate(['/files']);
  }
}
