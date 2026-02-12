import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

interface WidgetShell {
  id: 'calendar' | 'shopping' | 'workouts';
  title: string;
  description: string;
  nextStep: string;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    class: 'dashboard-shell'
  }
})
export class App {
  protected readonly pageTitle = 'Hallway Dashboard';
  protected readonly subtitle =
    'Stage 1 baseline: shell layout, server contract, and branch-ready structure.';

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

  protected readonly statusRows = computed(() => [
    { label: 'Frontend shell', value: 'Ready' },
    { label: 'Backend contract', value: 'Ready' },
    { label: 'Frog zone', value: 'Reserved' }
  ]);
}
