import { Component } from '@angular/core';
import { NgtCanvas } from 'angular-three';
import { Dungeon } from './dungeon/dungeon.component';

@Component({
  selector: 'app-root',
  template: `
    <ngt-canvas [sceneGraph]="sceneGraph" />
  `,
  host: { class: 'block h-dvh w-full' },
  imports: [NgtCanvas],
})
export class AppComponent {
  sceneGraph = Dungeon;
}
