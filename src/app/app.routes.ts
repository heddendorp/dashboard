import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/data/components/data-column/data-column').then(
        (module) => module.DataColumnComponent
      )
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/data/components/calendar-detail/calendar-detail').then(
        (module) => module.CalendarDetailComponent
      )
  },
  {
    path: 'workouts',
    loadComponent: () =>
      import('./features/data/components/workouts-detail/workouts-detail').then(
        (module) => module.WorkoutsDetailComponent
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
