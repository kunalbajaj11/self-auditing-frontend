import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-summary-card',
  templateUrl: './summary-card.component.html',
  styleUrls: ['./summary-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryCardComponent {
  @Input() icon = 'insights';
  @Input() label!: string;
  @Input() value: string | number | null = 0;
  @Input() hint?: string;
  @Input() accent = 'primary';
}

