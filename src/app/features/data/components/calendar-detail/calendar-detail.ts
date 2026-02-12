import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject
} from '@angular/core';
import { Router } from '@angular/router';

import type { DataCalendarEvent } from '../../models/data-dashboard.models';
import { DataDashboardService } from '../../services/data-dashboard.service';

const AUTO_RETURN_MS = 15_000;

interface CalendarItemRow {
  id: string;
  title: string;
  startsAtLabel: string;
  sortKey: number;
}

interface CalendarDayGroup {
  id: string;
  label: string;
  items: CalendarItemRow[];
  sortKey: number;
}

@Component({
  selector: 'app-calendar-detail',
  templateUrl: './calendar-detail.html',
  styleUrl: './calendar-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'data-detail calendar-detail',
    'style.view-transition-name': "'calendar-tile'",
    '(pointerdown)': 'resetAutoReturnTimer()',
    '(keydown)': 'resetAutoReturnTimer()',
    '(touchstart)': 'resetAutoReturnTimer()',
    '(wheel)': 'resetAutoReturnTimer()',
    '(focusin)': 'resetAutoReturnTimer()'
  }
})
export class CalendarDetailComponent {
  private readonly dataDashboardService = inject(DataDashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly groupLabelFormatter = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit'
  });
  private readonly groupKeyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  private readonly calendarDateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit'
  });
  private readonly calendarAllDayFormatter = new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
  private autoReturnTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly calendarResource = this.dataDashboardService.calendarDetailResource;

  protected readonly groupedRows = computed<CalendarDayGroup[]>(() => {
    const groups = new Map<string, CalendarDayGroup>();
    for (const event of this.dataDashboardService.calendarDetailEvents()) {
      const mapping = this.toCalendarMapping(event);
      if (!mapping) {
        continue;
      }

      const existing = groups.get(mapping.groupId);
      if (existing) {
        existing.items.push(mapping.row);
        existing.sortKey = Math.min(existing.sortKey, mapping.row.sortKey);
      } else {
        groups.set(mapping.groupId, {
          id: mapping.groupId,
          label: mapping.groupLabel,
          items: [mapping.row],
          sortKey: mapping.row.sortKey
        });
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((left, right) => left.sortKey - right.sortKey)
      }))
      .sort((left, right) => left.sortKey - right.sortKey);
  });

  protected readonly errorMessage = computed(() => {
    const error = this.calendarResource.error();
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

    return error instanceof Error ? error.message : 'Failed to load calendar details.';
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

  private toCalendarMapping(event: DataCalendarEvent): {
    groupId: string;
    groupLabel: string;
    row: CalendarItemRow;
  } | null {
    if (event.allDay) {
      const startDate = this.parseLocalDate(event.startsAt);
      if (!startDate) {
        return null;
      }

      const groupId = this.toLocalDateKey(startDate);
      return {
        groupId,
        groupLabel: this.groupLabelFormatter.format(startDate),
        row: {
          id: event.id,
          title: event.title,
          startsAtLabel: this.formatAllDayRange(event.startsAt, event.endsAt),
          sortKey: startDate.getTime()
        }
      };
    }

    const date = new Date(event.startsAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return {
      groupId: this.groupKeyFormatter.format(date),
      groupLabel: this.groupLabelFormatter.format(date),
      row: {
        id: event.id,
        title: event.title,
        startsAtLabel: this.calendarDateTimeFormatter.format(date),
        sortKey: date.getTime()
      }
    };
  }

  private toLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
