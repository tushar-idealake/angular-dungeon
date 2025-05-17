import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extend, injectBeforeRender } from 'angular-three';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { NgtsCameraControls } from 'angular-three-soba/controls';
import { filter, fromEvent } from 'rxjs';
import { BoxGeometry, GridHelper, Mesh, MeshBasicMaterial } from 'three';

@Component({
  template: `
    <ngts-perspective-camera [options]="{ makeDefault: true, position: [-3, 5, 5] }" />

    <ngt-mesh [position]="[0, 0.5, 0]">
      <ngt-box-geometry />
      <ngt-mesh-basic-material [color]="'orange'" />
    </ngt-mesh>

    <ngt-mesh [position]="[1, 0.5, 0]">
      <ngt-box-geometry />
      <ngt-mesh-basic-material [color]="'hotpink'" />
    </ngt-mesh>

    <ngt-mesh [position]="[0, 0.5, 2]">
      <ngt-box-geometry />
      <ngt-mesh-basic-material [color]="'orange'" />
    </ngt-mesh>

    <ngt-mesh [position]="[1, 0.5, 2]">
      <ngt-box-geometry />
      <ngt-mesh-basic-material [color]="'hotpink'" />
    </ngt-mesh>

    <ngt-grid-helper />

    <ngts-camera-controls #cameraControls />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtsCameraControls, NgtsPerspectiveCamera],
})
export class Experience {
  private cameraControls = viewChild<NgtsCameraControls>('cameraControls');
  private keys = new Set<string>();
  private lookDX = 0;
  private lookDY = 0;

  constructor() {
    extend({ Mesh, BoxGeometry, MeshBasicMaterial, GridHelper });

    fromEvent<PointerEvent>(document, 'pointermove')
      .pipe(takeUntilDestroyed())
      .subscribe((e) => {
        this.lookDX += e.movementX;
        this.lookDY += e.movementY;
      });

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter((e) => ['w', 'a', 's', 'd'].includes(e.key.toLowerCase())),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.keys.add(e.key.toLowerCase()));

    fromEvent<KeyboardEvent>(document, 'keyup')
      .pipe(
        filter((e) => ['w', 'a', 's', 'd'].includes(e.key.toLowerCase())),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.keys.delete(e.key.toLowerCase()));

    injectBeforeRender(({ delta }) => {
      const controls = this.cameraControls()?.controls();
      if (!controls) return;

      // movement
      const speed = 5 * delta;
      if (this.keys.has('w')) controls.dolly(speed);
      if (this.keys.has('s')) controls.dolly(-speed);
      if (this.keys.has('a')) controls.truck(-speed, 0);
      if (this.keys.has('d')) controls.truck(speed, 0);

      // look
      const sensitivity = 0.002; // rad per pixel
      if (this.lookDX || this.lookDY) {
        controls.rotate(-this.lookDX * sensitivity, -this.lookDY * sensitivity, false);
        this.lookDX = this.lookDY = 0;
      }

      controls.update(delta);
    });
  }
}
