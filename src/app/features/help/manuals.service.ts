import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

export type ManualContentType = 'markdown' | 'html' | 'pdf' | 'external';

export interface ManualItem {
  id: string;
  title: string;
  description?: string;
  audience?: Array<'admin' | 'accountant' | 'employee' | 'super-admin' | 'all'>;
  tags?: string[];
  type: ManualContentType;
  /**
   * Path relative to app origin (e.g. "assets/manuals/foo.md" or "assets/USER-MANUAL.pdf")
   * or absolute URL if type === "external"
   */
  path: string;
  updated?: string; // ISO date string
}

export interface ManualSection {
  title: string;
  items: ManualItem[];
}

export interface ManualIndex {
  version: string;
  generatedAt?: string;
  sections: ManualSection[];
}

@Injectable({ providedIn: 'root' })
export class ManualsService {
  private readonly index$: Observable<ManualIndex>;

  constructor(private readonly http: HttpClient) {
    this.index$ = this.http
      .get<ManualIndex>('assets/manuals/index.json')
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  getIndex(): Observable<ManualIndex> {
    return this.index$;
  }

  getAllItems(): Observable<ManualItem[]> {
    return this.index$.pipe(
      map((idx) => idx.sections.flatMap((s) => s.items)),
    );
  }

  getItemById(id: string): Observable<ManualItem | undefined> {
    return this.getAllItems().pipe(map((items) => items.find((i) => i.id === id)));
  }

  loadText(path: string): Observable<string> {
    return this.http.get(path, { responseType: 'text' });
  }
}

