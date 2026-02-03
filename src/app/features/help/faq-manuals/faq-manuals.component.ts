import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ManualIndex, ManualsService } from '../manuals.service';

@Component({
  selector: 'app-faq-manuals',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './faq-manuals.component.html',
  styleUrl: './faq-manuals.component.scss',
})
export class FaqManualsComponent {
  private readonly manuals = inject(ManualsService);

  readonly search = new FormControl<string>('', { nonNullable: true });

  readonly index = toSignal(this.manuals.getIndex(), {
    initialValue: { version: '0', sections: [] } as ManualIndex,
  });

  readonly searchValue = toSignal(
    this.search.valueChanges.pipe(
      startWith(this.search.value),
      debounceTime(150),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  readonly filteredSections = computed(() => {
    const query = (this.searchValue() || '').trim().toLowerCase();
    const idx = this.index();
    const sections = idx?.sections ?? [];
    if (!query) {
      return sections;
    }
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const hay = [
            item.title,
            item.description ?? '',
            ...(item.tags ?? []),
            ...(item.audience ?? []),
          ]
            .join(' ')
            .toLowerCase();
          return hay.includes(query);
        }),
      }))
      .filter((s) => s.items.length > 0);
  });

  getSectionIcon(title: string): string {
    const map: Record<string, string> = {
      'Getting Started': 'rocket_launch',
      'Roles & Access': 'admin_panel_settings',
      'Expenses & Payments': 'receipt_long',
      'Banking & Reconciliation': 'account_balance',
      'Reports & Invoicing': 'assessment',
      'Tax, Settings & Data': 'tune',
      'Notifications & Security': 'notifications_active',
      'Admin & Support': 'support_agent',
    };
    return map[title] ?? 'folder';
  }
}

