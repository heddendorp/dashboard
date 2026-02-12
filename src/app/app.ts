import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DataColumnComponent } from './features/data/components/data-column/data-column';
import { FrogColumnComponent } from './features/frog/components/frog-column/frog-column';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataColumnComponent, FrogColumnComponent],
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
}
