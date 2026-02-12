import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import type { StatusRow, WidgetShell } from '../../../../core/dashboard.models';

@Component({
  selector: 'app-data-column',
  imports: [],
  templateUrl: './data-column.html',
  styleUrl: './data-column.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'data-column'
  }
})
export class DataColumnComponent {
  protected readonly widgets = signal<WidgetShell[]>([
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'Upcoming events for the household.',
      nextStep: 'Stage 3 will connect Google Calendar service account data.'
    },
    {
      id: 'shopping',
      title: 'Shopping List',
      description: 'Shared list for hallway visibility and quick edits.',
      nextStep: 'Stage 3 will persist items using Vercel-managed KV.'
    },
    {
      id: 'workouts',
      title: 'Beat81 Workouts',
      description: 'Available and planned workout cards.',
      nextStep: 'Stage 3 will connect the private Beat81 adapter.'
    }
  ]);

  protected readonly statusRows = computed<StatusRow[]>(() => [
    { label: 'Frontend shell', value: 'Ready' },
    { label: 'Backend contract', value: 'Ready' },
    { label: 'Frog zone', value: 'Reserved' }
  ]);
}
