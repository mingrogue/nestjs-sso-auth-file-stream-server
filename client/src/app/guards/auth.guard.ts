import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if we have a token in localStorage
  if (authService.token || authService.refreshToken) {
    // Token exists - allow access, let API calls handle validation
    return true;
  }

  // No tokens at all - redirect to login
  router.navigate(['/login']);
  return false;
};
