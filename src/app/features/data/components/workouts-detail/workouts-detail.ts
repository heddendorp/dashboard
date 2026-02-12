import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

import type { DataBeat81Event } from '../../models/data-dashboard.models';
import { DataDashboardService } from '../../services/data-dashboard.service';
import { isBerlinAtOrAfter, isBerlinWorkday } from '../../utils/berlin-workout-filter';

const AUTO_RETURN_MS = 15_000;
const EVENING_CUTOFF_MINUTES = 18 * 60 + 30;

interface WorkoutRow {
  id: string;
  title: string;
  startsAtLabel: string;
  location: string;
  trainerName: string;
  trainerImageUrl: string | null;
  trainerInitials: string;
  openSpotsLabel: string;
  openSpotsClass: string;
  capacityLabel: string;
}

@Component({
  selector: 'app-workouts-detail',
  templateUrl: './workouts-detail.html',
  styleUrl: './workouts-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'data-detail workouts-detail',
    'style.view-transition-name': "'workouts-tile'",
    '(pointerdown)': 'resetAutoReturnTimer()',
    '(keydown)': 'resetAutoReturnTimer()',
    '(touchstart)': 'resetAutoReturnTimer()',
    '(wheel)': 'resetAutoReturnTimer()',
    '(focusin)': 'resetAutoReturnTimer()'
  }
})
export class WorkoutsDetailComponent {
  private readonly dataDashboardService = inject(DataDashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly timeFormatter = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  private autoReturnTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly workoutsResource = this.dataDashboardService.beat81DetailResource;
  protected readonly workdaysOnly = signal(true);
  protected readonly eveningOnly = signal(true);
  protected readonly minTwoSpotsOnly = signal(true);

  protected readonly filteredWorkouts = computed<WorkoutRow[]>(() =>
    this.dataDashboardService.beat81DetailEvents()
      .filter((event) => this.matchesFilters(event))
      .map((event) => this.toWorkoutRow(event))
  );

  protected readonly errorMessage = computed(() => {
    const error = this.workoutsResource.error();
    if (!error) {
      return null;
    }

    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (this.hasMessage(body)) {
        return body.message;
      }

      return error.message;
    }

    return error instanceof Error ? error.message : 'Failed to load workout details.';
  });

  constructor() {
    if (this.isBrowser) {
      this.resetAutoReturnTimer();
    }

    this.destroyRef.onDestroy(() => {
      this.clearAutoReturnTimer();
    });
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/');
  }

  protected toggleWorkdaysOnly(): void {
    this.workdaysOnly.update((value) => !value);
  }

  protected toggleEveningOnly(): void {
    this.eveningOnly.update((value) => !value);
  }

  protected toggleMinTwoSpotsOnly(): void {
    this.minTwoSpotsOnly.update((value) => !value);
  }

  protected resetAutoReturnTimer(): void {
    if (!this.isBrowser) {
      return;
    }

    this.clearAutoReturnTimer();
    this.autoReturnTimeout = setTimeout(() => {
      this.autoReturnTimeout = null;
      void this.router.navigateByUrl('/');
    }, AUTO_RETURN_MS);
  }

  private matchesFilters(event: DataBeat81Event): boolean {
    if (this.workdaysOnly() && !isBerlinWorkday(event.startsAt)) {
      return false;
    }

    if (this.eveningOnly() && !isBerlinAtOrAfter(event.startsAt, EVENING_CUTOFF_MINUTES)) {
      return false;
    }

    if (this.minTwoSpotsOnly() && (event.openSpots === null || event.openSpots < 2)) {
      return false;
    }

    return true;
  }

  private toWorkoutRow(event: DataBeat81Event): WorkoutRow {
    const trainerName = event.trainerName || 'Trainer TBD';
    const spots = this.toOpenSpotsIndicator(event.openSpots);

    return {
      id: event.id,
      title: event.title,
      startsAtLabel: this.formatStartsAt(event.startsAt),
      location: event.location,
      trainerName,
      trainerImageUrl: event.trainerImageUrl,
      trainerInitials: this.toInitials(trainerName),
      openSpotsLabel: spots.label,
      openSpotsClass: spots.className,
      capacityLabel: this.toCapacityLabel(event)
    };
  }

  private toCapacityLabel(event: DataBeat81Event): string {
    if (event.currentParticipants === null || event.maxParticipants === null) {
      return 'Capacity unknown';
    }

    return `${event.currentParticipants}/${event.maxParticipants} booked`;
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

  private formatStartsAt(startsAt: string): string {
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) {
      return startsAt || 'Unknown time';
    }

    return this.timeFormatter.format(date);
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

  private clearAutoReturnTimer(): void {
    if (this.autoReturnTimeout === null) {
      return;
    }

    clearTimeout(this.autoReturnTimeout);
    this.autoReturnTimeout = null;
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
