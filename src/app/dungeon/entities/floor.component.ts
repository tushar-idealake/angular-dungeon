import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, input } from '@angular/core';
import { extend } from 'angular-three';
import { NgtrCuboidCollider } from 'angular-three-rapier';
import { injectTexture } from 'angular-three-soba/loaders';
import { Mesh, MeshBasicMaterial, NearestFilter, Object3D, PlaneGeometry, RepeatWrapping } from 'three';

@Component({
  selector: 'dungeon-floor',
  template: `
    <ngt-mesh
      [position]="[0, 0, 0]"
      [rotation]="[-Math.PI / 2, 0, 0]"
      [scale]="[layout()[0].length, layout().length, 1]"
    >
      <ngt-plane-geometry [args]="[1, 1]" />
      <ngt-mesh-basic-material [map]="floorMap()" />
    </ngt-mesh>
    <ngt-object3D ngtrCuboidCollider [args]="[layout()[0].length, 0.1, layout().length]" />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorComponent {
  layout = input.required<string[][]>();

  textures = injectTexture(() => ({
    floor: './textures/floor.png',
  }));

  floorMap = computed(() => this.textures()?.floor || null);

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
      floor.repeat.set(10, 10);
      floor.needsUpdate = true;
    });
  }
}
