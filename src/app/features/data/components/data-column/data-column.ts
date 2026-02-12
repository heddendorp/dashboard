import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';

import type { WidgetShell } from '../../../../core/dashboard.models';
import type {
  DataBeat81Event,
  DataCalendarEvent,
  DataWidgetHealth,
  DataWidgetStatus
} from '../../models/data-dashboard.models';
import { DataDashboardService } from '../../services/data-dashboard.service';

interface DataStatusRow {
  label: string;
  value: string;
  toneClass: string;
}

interface Beat81SessionRow {
  id: string;
  title: string;
  startsAtLabel: string;
  trainerName: string;
  trainerImageUrl: string | null;
  trainerInitials: string;
  openSpotsLabel: string;
  openSpotsClass: string;
}

interface CalendarEventRow {
  id: string;
  title: string;
  startsAtLabel: string;
}

let dataColumnInstanceCounter = 0;

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
  private readonly dataDashboardService = inject(DataDashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly autoRefreshIntervalMs = 5 * 60 * 1000;
  private readonly collapsedCalendarLimit = 6;
  private readonly collapsedWorkoutLimit = 4;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private workoutsCollapseTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly instanceId = ++dataColumnInstanceCounter;
  private readonly calendarDateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  private readonly calendarAllDayFormatter = new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
  private readonly timeFormatter = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  protected readonly dashboardResource = this.dataDashboardService.dashboardResource;
  protected readonly calendarEvents = this.dataDashboardService.calendarEvents;
  protected readonly beat81Events = this.dataDashboardService.beat81Events;
  protected readonly workoutsExpanded = signal(false);
  protected readonly statusTitleId = `status-title-${this.instanceId}`;

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

  protected readonly beat81Sessions = computed<Beat81SessionRow[]>(() =>
    this.beat81Events()
      .map((event) => this.toSessionRow(event))
  );
  protected readonly calendarRows = computed<CalendarEventRow[]>(() =>
    this.calendarEvents()
      .map((event) => this.toCalendarRow(event))
  );
  protected readonly visibleCalendarRows = computed<CalendarEventRow[]>(() =>
    this.calendarRows().slice(0, this.collapsedCalendarLimit)
  );
  protected readonly visibleBeat81Sessions = computed<Beat81SessionRow[]>(() =>
    this.workoutsExpanded()
      ? this.beat81Sessions()
      : this.beat81Sessions().slice(0, this.collapsedWorkoutLimit)
  );
  protected readonly hasMoreBeat81Items = computed(
    () => this.beat81Sessions().length > this.collapsedWorkoutLimit
  );

  protected readonly dashboardErrorMessage = computed(() => {
    const error = this.dashboardResource.error();

    if (!error) {
      return null;
    }

    if (error instanceof HttpErrorResponse) {
      const errorBody = error.error;
      if (this.hasMessage(errorBody)) {
        return errorBody.message;
      }

      return error.message;
    }

    return error instanceof Error ? error.message : 'Failed to load dashboard data.';
  });

  protected readonly statusRows = computed<DataStatusRow[]>(() => {
    const health = this.dataDashboardService.health();

    if (health.length === 0) {
      return [
        { label: 'Frontend shell', value: 'Ready', toneClass: 'status-ready' },
        { label: 'Backend contract', value: 'Pending', toneClass: 'status-pending' },
        { label: 'Frog zone', value: 'Ready', toneClass: 'status-ready' }
      ];
    }

    return health.map((entry) => ({
      label: this.widgetLabel(entry),
      value: this.statusLabel(entry.status),
      toneClass: `status-${entry.status}`
    }));
  });

  constructor() {
    this.startAutoRefresh();
    this.destroyRef.onDestroy(() => {
      this.clearWorkoutsCollapseTimer();
      this.clearAutoRefreshTimer();
    });
  }

  protected expandWorkoutsTemporarily(): void {
    if (!this.hasMoreBeat81Items()) {
      return;
    }

    this.workoutsExpanded.set(true);
    this.clearWorkoutsCollapseTimer();
    this.workoutsCollapseTimer = setTimeout(() => {
      this.workoutsExpanded.set(false);
      this.workoutsCollapseTimer = null;
    }, 15_000);
  }

  private widgetLabel(health: DataWidgetHealth): string {
    if (health.widget === 'beat81') {
      return 'Beat81';
    }

    if (health.widget === 'frog') {
      return 'Frog Zone';
    }

    return health.widget[0].toUpperCase() + health.widget.slice(1);
  }

  private statusLabel(status: DataWidgetStatus): string {
    return status[0].toUpperCase() + status.slice(1);
  }

  private toSessionRow(event: DataBeat81Event): Beat81SessionRow {
    const trainerName = event.trainerName || 'Trainer TBD';
    const spots = this.toOpenSpotsIndicator(event.openSpots);
    return {
      id: event.id,
      title: event.title,
      startsAtLabel: this.formatStartsAt(event.startsAt),
      trainerName,
      trainerImageUrl: event.trainerImageUrl,
      trainerInitials: this.toInitials(trainerName),
      openSpotsLabel: spots.label,
      openSpotsClass: spots.className
    };
  }

  private toCalendarRow(event: DataCalendarEvent): CalendarEventRow {
    return {
      id: event.id,
      title: event.title,
      startsAtLabel: this.formatCalendarStartsAt(event)
    };
  }

  private toOpenSpotsIndicator(openSpots: number | null): { label: string; className: string } {
    if (openSpots === null) {
      return { label: 'Spots ?', className: 'spot-chip spots-unknown' };
    }

    if (openSpots <= 0) {
      return { label: 'Full', className: 'spot-chip spots-full' };
    }

    if (openSpots === 1) {
      return { label: '1 left', className: 'spot-chip spots-low' };
    }

    return { label: `${openSpots} left`, className: 'spot-chip spots-open' };
  }

  private clearWorkoutsCollapseTimer(): void {
    if (this.workoutsCollapseTimer === null) {
      return;
    }

    clearTimeout(this.workoutsCollapseTimer);
    this.workoutsCollapseTimer = null;
  }

  private startAutoRefresh(): void {
    this.clearAutoRefreshTimer();
    this.autoRefreshTimer = setInterval(() => {
      this.dashboardResource.reload();
    }, this.autoRefreshIntervalMs);
  }

  private clearAutoRefreshTimer(): void {
    if (this.autoRefreshTimer === null) {
      return;
    }

    clearInterval(this.autoRefreshTimer);
    this.autoRefreshTimer = null;
  }

  private formatStartsAt(startsAt: string): string {
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) {
      return startsAt || 'Unknown time';
    }

    return this.timeFormatter.format(date);
  }

  private formatCalendarStartsAt(event: DataCalendarEvent): string {
    if (event.allDay) {
      return this.formatAllDayRange(event.startsAt, event.endsAt);
    }

    const date = new Date(event.startsAt);
    if (Number.isNaN(date.getTime())) {
      return event.startsAt || 'Unknown time';
    }

    return this.calendarDateTimeFormatter.format(date);
  }

  private formatAllDayRange(startsAt: string, endsAt: string): string {
    const startDate = this.parseLocalDate(startsAt);
    const endExclusiveDate = this.parseLocalDate(endsAt);
    if (!startDate) {
      return 'Ganztägig';
    }

    const endDate = endExclusiveDate ? new Date(endExclusiveDate) : new Date(startDate);
    endDate.setDate(endDate.getDate() - 1);
    if (endDate.getTime() < startDate.getTime()) {
      endDate.setTime(startDate.getTime());
    }

    const startLabel = this.calendarAllDayFormatter.format(startDate);
    const endLabel = this.calendarAllDayFormatter.format(endDate);

    if (startLabel === endLabel) {
      return `${startLabel} · Ganztägig`;
    }

    return `${startLabel} - ${endLabel} · Ganztägig`;
  }

  private parseLocalDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      return null;
    }

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toInitials(name: string): string {
    const parts = name
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return 'T';
    }

    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'T';
  }

  private hasMessage(value: unknown): value is { message: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string'
    );
  }
}
