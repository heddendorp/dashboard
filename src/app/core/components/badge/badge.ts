import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone =
  | 'gray'
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink';

@Component({
  selector: 'app-badge',
  template: `<span [class]="badgeClass()"><ng-content /></span>`,
  styleUrl: './badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
  tone = input<BadgeTone>('gray');

  protected readonly badgeClass = computed(() => `badge badge-${this.tone()}`);
}
