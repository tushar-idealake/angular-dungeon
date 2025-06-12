import { Component } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { Dungeon } from './dungeon/dungeon.component';

@Component({
  selector: 'app-root',
  template: `
    <ngt-canvas>
      <dungeon-scene *canvasContent />
    </ngt-canvas>
  `,
  host: { class: 'block h-dvh w-full' },
  imports: [NgtCanvas, Dungeon, NgtCanvas],
})
export class AppComponent {}
