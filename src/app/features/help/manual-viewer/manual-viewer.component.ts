import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { switchMap } from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { marked } from 'marked';
import DOMPurify from 'dompurify';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ManualItem, ManualsService } from '../manuals.service';

@Component({
  selector: 'app-manual-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './manual-viewer.component.html',
  styleUrl: './manual-viewer.component.scss',
})
export class ManualViewerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly manuals = inject(ManualsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly item = toSignal<ManualItem | undefined>(
    this.route.paramMap.pipe(
      switchMap((params) => this.manuals.getItemById(params.get('id') ?? '')),
    ),
    { initialValue: undefined },
  );

  readonly markdownHtml = signal<string>('');
  readonly iframeUrl = signal<SafeResourceUrl | null>(null);
  readonly externalUrl = signal<string | null>(null);

  readonly backLink: string[] = ['/help'];

  constructor() {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    effect(() => {
      const current = this.item();

      this.markdownHtml.set('');
      this.iframeUrl.set(null);
      this.externalUrl.set(null);

      if (!current) {
        return;
      }

      if (current.type === 'markdown') {
        this.manuals
          .loadText(current.path)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (md) => {
              const raw = marked.parse(md) as string;
              const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
              this.markdownHtml.set(clean);
            },
            error: () => this.markdownHtml.set('<p>Unable to load this manual.</p>'),
          });
        return;
      }

      if (current.type === 'html' || current.type === 'pdf') {
        this.iframeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(current.path));
        return;
      }

      if (current.type === 'external') {
        this.externalUrl.set(current.path);
      }
    });
  }
}

