import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, input } from '@angular/core';
import { extend, NgtArgs } from 'angular-three';
import { textureResource } from 'angular-three-soba/loaders';
import { Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, RepeatWrapping } from 'three';

@Component({
  selector: 'dungeon-roof',
  template: `
    <ngt-mesh [position.y]="1" [rotation.x]="Math.PI / 2" [scale]="[layout()[0].length, layout().length, 1]">
      <ngt-plane-geometry *args="[1, 1]" />
      <ngt-mesh-basic-material [map]="roofMap()" />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
})
export class RoofComponent {
  layout = input.required<string[][]>();

  textures = textureResource(() => ({ roof: './textures/roof.png' }));
  roofMap = computed(() => this.textures.value()?.roof || null);

  Math = Math;

  constructor() {
    extend({ Mesh, PlaneGeometry, MeshBasicMaterial });

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
