import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, input } from '@angular/core';
import { extend } from 'angular-three';
import { NgtrCuboidCollider } from 'angular-three-rapier';
import { injectTexture } from 'angular-three-soba/loaders';
import { BoxGeometry, Mesh, MeshBasicMaterial, NearestFilter, Object3D, RepeatWrapping, Vector3 } from 'three';

@Component({
  selector: 'dungeon-wall',
  template: `
    <ngt-mesh ngtrRigidBody="fixed" [position]="positionVector()">
      <ngt-box-geometry />
      <ngt-mesh-basic-material [map]="wallMap()" />
      <ngt-object3D ngtrCuboidCollider [args]="[0.5, 0.5, 0.5]" />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WallComponent {
  position = input.required<[number, number, number]>();
  positionVector = computed(() => new Vector3(this.position()[0], this.position()[1], this.position()[2]));

  textures = injectTexture(() => ({
    wall: './textures/wall.png',
  }));

  wallMap = computed(() => this.textures()?.wall || null);

  Math = Math;

  constructor() {
    extend({
      Mesh,
      BoxGeometry,
      MeshBasicMaterial,
      Object3D,
    });

    effect(() => {
      const wall = this.wallMap();
      if (!wall) return;
      wall.magFilter = NearestFilter;
      wall.minFilter = NearestFilter;
      wall.generateMipmaps = false;
      wall.wrapS = RepeatWrapping;
      wall.wrapT = RepeatWrapping;
      wall.repeat.set(1, 1);
      wall.needsUpdate = true;
    });
  }
}
