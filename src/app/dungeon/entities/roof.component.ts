import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, input } from '@angular/core';
import { extend } from 'angular-three';
import { injectTexture } from 'angular-three-soba/loaders';
import { Mesh, MeshBasicMaterial, NearestFilter, Object3D, PlaneGeometry, RepeatWrapping } from 'three';

@Component({
  selector: 'dungeon-roof',
  template: `
    <ngt-mesh
      [position]="[0, 1, 0]"
      [rotation]="[Math.PI / 2, 0, 0]"
      [scale]="[layout()[0].length, layout().length, 1]"
    >
      <ngt-plane-geometry [args]="[1, 1]" />
      <ngt-mesh-basic-material [map]="roofMap()" />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoofComponent {
  layout = input.required<string[][]>();

  textures = injectTexture(() => ({
    roof: './textures/roof.png',
  }));

  roofMap = computed(() => this.textures()?.roof || null);

  Math = Math;

  constructor() {
    extend({
      Mesh,
      PlaneGeometry,
      MeshBasicMaterial,
      Object3D,
    });

    effect(() => {
      const roof = this.roofMap();
      if (!roof) return;

      roof.magFilter = NearestFilter;
      roof.minFilter = NearestFilter;
      roof.generateMipmaps = false;
      roof.wrapS = RepeatWrapping;
      roof.wrapT = RepeatWrapping;
      roof.repeat.set(this.layout().length, this.layout().length);
      roof.needsUpdate = true;
    });
  }
}
