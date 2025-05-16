import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component } from '@angular/core';
import { extend, injectBeforeRender } from 'angular-three';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { NgtsOrbitControls } from 'angular-three-soba/controls';
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

    <ngt-grid-helper />

    <ngts-orbit-controls />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtsOrbitControls, NgtsPerspectiveCamera],
})
export class Experience {
  constructor() {
    extend({ Mesh, BoxGeometry, MeshBasicMaterial, GridHelper });
    injectBeforeRender(({ delta }) => {});
  }
}
