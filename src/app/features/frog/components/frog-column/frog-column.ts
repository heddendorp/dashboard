import { ChangeDetectionStrategy, Component } from '@angular/core';

let frogColumnInstanceCounter = 0;

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
export class FrogColumnComponent {
  private readonly instanceId = ++frogColumnInstanceCounter;
  protected readonly titleId = `frog-title-${this.instanceId}`;
}
