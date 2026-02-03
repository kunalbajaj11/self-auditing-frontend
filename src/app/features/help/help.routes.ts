import { Routes } from '@angular/router';

export const helpRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./faq-manuals/faq-manuals.component').then(
        (m) => m.FaqManualsComponent,
      ),
  },
  {
    path: 'manual/:id',
    loadComponent: () =>
      import('./manual-viewer/manual-viewer.component').then(
        (m) => m.ManualViewerComponent,
      ),
  },
];
