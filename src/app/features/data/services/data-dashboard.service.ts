import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';

import type {
  DataBeat81EventsPayload,
  DataCalendarEventsPayload,
  DataDashboardPayload
} from '../models/data-dashboard.models';

@Injectable({ providedIn: 'root' })
export class DataDashboardService {
  readonly dashboardResource = httpResource<DataDashboardPayload>(() => '/api/dashboard');
  readonly calendarDetailResource = httpResource<DataCalendarEventsPayload>(() => '/api/calendar/events?limit=30');
  readonly beat81DetailResource = httpResource<DataBeat81EventsPayload>(() => '/api/beat81/events?limit=50');

  readonly calendarEvents = computed(() => this.dashboardResource.value()?.calendar ?? []);
  readonly beat81Events = computed(() => this.dashboardResource.value()?.beat81Events ?? []);
  readonly health = computed(() => this.dashboardResource.value()?.health ?? []);
  readonly calendarDetailEvents = computed(() => this.calendarDetailResource.value()?.items ?? []);
  readonly beat81DetailEvents = computed(() => this.beat81DetailResource.value()?.items ?? []);
}
