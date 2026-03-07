import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { FilesComponent } from './components/files/files.component';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/files', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'files', component: FilesComponent, canActivate: [authGuard] },
  { path: 'player/:fileId', component: VideoPlayerComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/files' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
