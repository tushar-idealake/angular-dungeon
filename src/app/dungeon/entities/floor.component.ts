import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, input } from '@angular/core';
import { extend, NgtArgs } from 'angular-three';
import { NgtrCuboidCollider } from 'angular-three-rapier';
import { textureResource } from 'angular-three-soba/loaders';
import { Mesh, MeshBasicMaterial, NearestFilter, Object3D, PlaneGeometry, RepeatWrapping } from 'three';

@Component({
  selector: 'dungeon-floor',
  template: `
    <ngt-mesh [rotation.x]="-Math.PI / 2" [scale]="[layout()[0].length, layout().length, 1]">
      <ngt-plane-geometry *args="[1, 1]" />
      <ngt-mesh-basic-material [map]="floorMap()" />
    </ngt-mesh>
    <ngt-object3D [cuboidCollider]="[layout()[0].length, 0.1, layout().length]" />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider, NgtArgs],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorComponent {
  layout = input.required<string[][]>();

  textures = textureResource(() => ({ floor: './textures/floor.png' }));

  floorMap = computed(() => this.textures.value()?.floor || null);

  Math = Math;

  constructor() {
    extend({
      Mesh,
      PlaneGeometry,
      MeshBasicMaterial,
      Object3D,
    });

    effect(() => {
      const floor = this.floorMap();
      if (!floor) return;
      floor.magFilter = NearestFilter;
      floor.minFilter = NearestFilter;
      floor.generateMipmaps = false;
      floor.wrapS = RepeatWrapping;
      floor.wrapT = RepeatWrapping;
      floor.repeat.set(this.layout().length, this.layout().length);
      floor.needsUpdate = true;
    });
  }
}
