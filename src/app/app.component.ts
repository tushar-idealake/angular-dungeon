import { Component } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { Dungeon } from './dungeon/dungeon.component';

@Component({
  selector: 'app-root',
  template: `
        <span style="
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
        background: transparent;
        color: black;
        font-size: 1.5rem;
      ">
        Player health : 99.9999%
      </span>
    <ngt-canvas>
      <dungeon-scene *canvasContent />
    </ngt-canvas>
  `,
  host: { class: 'block h-dvh w-full' },
  imports: [NgtCanvas, Dungeon, NgtCanvas],
})
export class AppComponent { }
