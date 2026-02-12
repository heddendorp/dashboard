import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';

import type {
  DataBeat81EventsPayload,
  DataCalendarEventsPayload,
  DataDashboardPayload
} from '../models/data-dashboard.models';

@Injectable({ providedIn: 'root' })
export class DataDashboardService {
  private readonly beat81ExpandedFetchLimit = 120;

  readonly dashboardResource = httpResource<DataDashboardPayload>(() => '/api/dashboard');
  readonly calendarDetailResource = httpResource<DataCalendarEventsPayload>(() => '/api/calendar/events?limit=30');
  readonly beat81DetailResource = httpResource<DataBeat81EventsPayload>(
    () => `/api/beat81/events?limit=${this.beat81ExpandedFetchLimit}`
  );

  readonly calendarEvents = computed(() => this.dashboardResource.value()?.calendar ?? []);
  readonly beat81DetailEvents = computed(() => this.beat81DetailResource.value()?.items ?? []);
  readonly beat81Events = computed(() => this.beat81DetailEvents());
  readonly health = computed(() => this.dashboardResource.value()?.health ?? []);
  readonly calendarDetailEvents = computed(() => this.calendarDetailResource.value()?.items ?? []);
}
