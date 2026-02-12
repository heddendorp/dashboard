export type DataWidgetName = 'calendar' | 'shopping' | 'beat81' | 'frog';
export type DataWidgetStatus = 'ready' | 'pending' | 'degraded';

export interface DataWidgetHealth {
  widget: DataWidgetName;
  status: DataWidgetStatus;
  message: string;
}

export interface DataBeat81EventType {
  id: string;
  name: string;
}

export interface DataCalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
}

export interface DataBeat81Event {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  trainerName: string | null;
  trainerImageUrl: string | null;
  maxParticipants: number | null;
  currentParticipants: number | null;
  openSpots: number | null;
}

export interface DataDashboardPayload {
  generatedAt: string;
  timezone: string;
  calendar: DataCalendarEvent[];
  beat81EventTypes: DataBeat81EventType[];
  beat81Events: DataBeat81Event[];
  health: DataWidgetHealth[];
}

export interface DataCalendarEventsPayload {
  items: DataCalendarEvent[];
  count: number;
  fetchedAt: string;
}

export interface DataBeat81EventsPayload {
  items: DataBeat81Event[];
  count: number;
  sourceTotal: number | null;
  fetchedAt: string;
}
