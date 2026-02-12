import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-frog-column',
  imports: [],
  templateUrl: './frog-column.html',
  styleUrl: './frog-column.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'frog-column'
  }
})
export class FrogColumnComponent {}
