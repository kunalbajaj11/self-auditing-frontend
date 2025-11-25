import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private timeoutMs = 60 * 60 * 1000; // 1 hour
  private timerId: any = null;
  private started = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly ngZone: NgZone,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;

    // Bind events that count as activity
    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, this.resetTimer, { passive: true }),
    );

    this.resetTimer();
  }

  stop(): void {
    this.started = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private resetTimer = (): void => {
    if (!this.started) return;
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    // Run timer outside Angular to avoid change detection churn
    this.ngZone.runOutsideAngular(() => {
      this.timerId = setTimeout(() => this.handleTimeout(), this.timeoutMs);
    });
  };

  private handleTimeout(): void {
    // Only log out if we actually have a session
    if (!this.authService.getCurrentUserSnapshot()) {
      this.resetTimer();
      return;
    }

    this.ngZone.run(() => {
      this.authService.logout().subscribe({
        next: () => {
          this.snackBar.open(
            'You were signed out due to inactivity (1 hour).',
            'Close',
            { duration: 5000, panelClass: ['snack-info'] },
          );
          this.router.navigateByUrl('/auth/login');
        },
        error: () => {
          // Even if logout call fails, clear local session
          this.router.navigateByUrl('/auth/login');
        },
      });
    });
  }
}


