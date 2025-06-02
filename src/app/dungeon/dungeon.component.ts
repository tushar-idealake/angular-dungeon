import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, effect, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extend, injectBeforeRender, injectStore } from 'angular-three';
import { NgtrCapsuleCollider, NgtrCuboidCollider, NgtrPhysics, NgtrRigidBody } from 'angular-three-rapier';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { filter, fromEvent } from 'rxjs';
import { BoxGeometry, GridHelper, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';

import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

@Component({
  template: `
    <ngtr-physics [options]="{ gravity: [0, -9.81, 0] }">
      <ng-template>
        <!-- floor -->
        <ngt-object3D ngtrRigidBody="fixed" [position]="[0, -1, 0]"></ngt-object3D>
        <ngt-object3D ngtrCuboidCollider [args]="[1000, 0.1, 1000]" />

        <!-- camera/player -->
        <ngt-object3D
          #player
          ngtrRigidBody
          [position]="[0, 2, 5]"
          [options]="{
            mass: 1,
            enabledRotations: [false, false, false],
          }"
        >
          <ngts-perspective-camera [options]="{ makeDefault: true }" />
          <ngt-object3D ngtrCapsuleCollider [args]="[0.5, 1]" />
        </ngt-object3D>

        <!-- walls -->
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
      </ng-template>
    </ngtr-physics>

    <ngt-grid-helper />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtsPerspectiveCamera, NgtrPhysics, NgtrRigidBody, NgtrCuboidCollider, NgtrCapsuleCollider],
})
export class Dungeon {
  private controls!: PointerLockControls;
  private player = viewChild<NgtrRigidBody>('player');

  private keys = new Set<string>();
  private store = injectStore();
  private camera = this.store.select('camera');
  private gl = this.store.select('gl');
  private scene = this.store.select('scene');

  protected Math = Math;

  constructor() {
    extend({ Mesh, BoxGeometry, PlaneGeometry, MeshBasicMaterial, GridHelper });

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

    effect(() => {
      const cam = this.camera();
      const renderer = this.gl();
      const scene = this.scene();

      if (!cam || !renderer || !scene || this.controls) return;

      this.controls = new PointerLockControls(cam, renderer.domElement);
      const obj = this.controls.object;
      scene.add(obj);
    });

    // lock pointer on click
    effect(() => {
      const dom = this.gl()?.domElement;
      if (!dom || !this.controls) return;
      dom.addEventListener('click', () => this.controls!.lock());
    });

    injectBeforeRender(({ delta, scene, camera }) => {
      const body = this.player()?.rigidBody();
      const controls = this.controls;
      if (!body || !controls) return;

      controls.update(delta);

      const dir = new Vector3();
      if (this.keys.has('w')) dir.z -= 1;
      if (this.keys.has('s')) dir.z += 1;
      if (this.keys.has('a')) dir.x -= 1;
      if (this.keys.has('d')) dir.x += 1;

      if (dir.lengthSq()) {
        dir
          .normalize()
          .multiplyScalar(500 * delta)
          .applyQuaternion(camera.quaternion);
        body.setLinvel({ x: dir.x, y: 0, z: dir.z }, true);
      } else {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    });
  }
}
