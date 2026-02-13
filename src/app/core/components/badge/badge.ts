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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
  tone = input<BadgeTone>('gray');

  protected readonly badgeClass = computed(() => {
    const baseClass = 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium';
    const toneClass: Record<BadgeTone, string> = {
      gray: 'bg-gray-100 text-gray-600 dark:bg-gray-400/10 dark:text-gray-400',
      red: 'bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-400',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-500',
      green: 'bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400',
      indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-400',
      pink: 'bg-pink-100 text-pink-700 dark:bg-pink-400/10 dark:text-pink-400'
    };

    return `${baseClass} ${toneClass[this.tone()]}`;
  });
}
