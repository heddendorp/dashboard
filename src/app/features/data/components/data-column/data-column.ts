import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import type {
  DataBeat81Event,
  DataCalendarEvent,
  DataWidgetHealth,
  DataWidgetStatus
} from '../../models/data-dashboard.models';
import { DataDashboardService } from '../../services/data-dashboard.service';
import { isBerlinAtOrAfter, isBerlinWorkday } from '../../utils/berlin-workout-filter';
import { getWorkoutCalendarConflict } from '../../utils/workout-calendar-conflict';

interface DataStatusRow {
  label: string;
  value: string;
  toneClass: string;
}

interface Beat81SessionRow {
  id: string;
  title: string;
  startsAt: string;
  isBooked: boolean;
  trainerName: string;
  trainerImageUrl: string | null;
  trainerInitials: string;
  openSpotsLabel: string;
  openSpotsClass: string;
  calendarConflictLabel: string | null;
  calendarConflictClass: string | null;
  calendarConflictHint: string | null;
}

interface CalendarEventRow {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
}

let dataColumnInstanceCounter = 0;

@Component({
  selector: 'app-data-column',
  imports: [DatePipe],
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
  private readonly router = inject(Router);
  private readonly autoRefreshIntervalMs = 5 * 60 * 1000;
  private readonly workoutEveningCutoffMinutes = 18 * 60 + 30;
  private readonly weekendWorkoutCutoffMinutes = 11 * 60;
  private readonly collapsedCalendarLimit = 6;
  private readonly collapsedWorkoutLimit = 4;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly datePipe = new DatePipe('de-DE');
  private readonly instanceId = ++dataColumnInstanceCounter;

  protected readonly dashboardResource = this.dataDashboardService.dashboardResource;
  protected readonly calendarEvents = this.dataDashboardService.calendarEvents;
  protected readonly beat81Events = this.dataDashboardService.beat81Events;
  protected readonly statusTitleId = `status-title-${this.instanceId}`;
  protected readonly workoutConflictCalendarEvents = computed(() => {
    const detailEvents = this.dataDashboardService.calendarDetailEvents();
    return detailEvents.length > 0 ? detailEvents : this.calendarEvents();
  });

  protected readonly beat81Sessions = computed<Beat81SessionRow[]>(() =>
    this.beat81Events()
      .filter((event) => this.isVisibleDashboardWorkout(event))
      .filter((event) => !this.hasCalendarConflict(event))
      .slice()
      .sort((left, right) => this.compareWorkouts(left, right))
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
    this.beat81Sessions().slice(0, this.collapsedWorkoutLimit)
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
      this.clearAutoRefreshTimer();
    });
  }

  protected onCalendarCardClick(event: MouseEvent): void {
    if (this.isNestedInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }

    this.navigateToRoute('/calendar');
  }

  protected onCalendarCardKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    if (this.isNestedInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }

    event.preventDefault();
    this.navigateToRoute('/calendar');
  }

  protected onWorkoutsCardClick(event: MouseEvent): void {
    if (this.isNestedInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }

    this.navigateToRoute('/workouts');
  }

  protected onWorkoutsCardKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    if (this.isNestedInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }

    event.preventDefault();
    this.navigateToRoute('/workouts');
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
    const calendarConflict = event.isBooked
      ? null
      : getWorkoutCalendarConflict(event.startsAt, this.workoutConflictCalendarEvents());

    const calendarConflictLabel = calendarConflict
      ? calendarConflict.kind === 'during'
        ? 'Calendar conflict'
        : 'Near calendar event'
      : null;

    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      isBooked: event.isBooked,
      trainerName,
      trainerImageUrl: event.trainerImageUrl,
      trainerInitials: this.toInitials(trainerName),
      openSpotsLabel: spots.label,
      openSpotsClass: spots.className,
      calendarConflictLabel,
      calendarConflictClass: calendarConflict
        ? calendarConflict.kind === 'during'
          ? 'calendar-conflict-chip calendar-conflict-chip-during'
          : 'calendar-conflict-chip calendar-conflict-chip-near'
        : null,
      calendarConflictHint: calendarConflict
        ? `${calendarConflictLabel}: ${calendarConflict.eventTitle}`
        : null
    };
  }

  private toCalendarRow(event: DataCalendarEvent): CalendarEventRow {
    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay
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

  protected formatAllDayRange(startsAt: string, endsAt: string): string {
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

    const startLabel = this.datePipe.transform(startDate, 'EEE dd.MM', 'Europe/Berlin', 'de-DE');
    const endLabel = this.datePipe.transform(endDate, 'EEE dd.MM', 'Europe/Berlin', 'de-DE');

    if (!startLabel || !endLabel) {
      return 'Ganztägig';
    }

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

  private isVisibleDashboardWorkout(event: DataBeat81Event): boolean {
    if (event.isBooked) {
      return true;
    }

    if (event.openSpots === null || event.openSpots < 2) {
      return false;
    }

    if (!isBerlinWorkday(event.startsAt)) {
      return isBerlinAtOrAfter(event.startsAt, this.weekendWorkoutCutoffMinutes);
    }

    return isBerlinAtOrAfter(event.startsAt, this.workoutEveningCutoffMinutes);
  }

  private hasCalendarConflict(workout: DataBeat81Event): boolean {
    if (workout.isBooked) {
      return false;
    }

    return getWorkoutCalendarConflict(workout.startsAt, this.workoutConflictCalendarEvents()) !== null;
  }

  private compareWorkouts(left: DataBeat81Event, right: DataBeat81Event): number {
    if (left.isBooked !== right.isBooked) {
      return left.isBooked ? -1 : 1;
    }

    const leftEpoch = Date.parse(left.startsAt);
    const rightEpoch = Date.parse(right.startsAt);

    if (!Number.isFinite(leftEpoch) && !Number.isFinite(rightEpoch)) {
      return left.id.localeCompare(right.id);
    }

    if (!Number.isFinite(leftEpoch)) {
      return 1;
    }

    if (!Number.isFinite(rightEpoch)) {
      return -1;
    }

    return leftEpoch - rightEpoch;
  }

  private navigateToRoute(route: '/calendar' | '/workouts'): void {
    void this.router.navigateByUrl(route);
  }

  private isNestedInteractiveTarget(target: EventTarget | null, currentTarget: EventTarget | null): boolean {
    if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
      return false;
    }

    const interactiveAncestor = target.closest('a, button, input, select, textarea, [role="button"]');
    return Boolean(interactiveAncestor && interactiveAncestor !== currentTarget);
  }
}
