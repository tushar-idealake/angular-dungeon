import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extend, injectBeforeRender, injectStore } from 'angular-three';
import { NgtrCapsuleCollider, NgtrCuboidCollider, NgtrPhysics, NgtrRigidBody } from 'angular-three-rapier';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { filter, fromEvent } from 'rxjs';
import { BoxGeometry, GridHelper, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';

@Component({
  template: `
    <ngtr-physics [options]="{ debug: true, gravity: [0, -9.81, 0] }">
      <ng-template>
        <!-- Static floor -->
        <ngt-object3D ngtrRigidBody="fixed" [options]="{ colliders: false }">
          <ngt-grid-helper />
          <!-- large, thin box collider under the plane -->
          <ngt-object3D ngtrCuboidCollider [args]="[50, 0.1, 50]" />
        </ngt-object3D>

        <!-- Dynamic player body with camera & controls -->
        <ngt-object3D
          ngtrRigidBody
          [position]="[0, 21, 5]"
          [options]="{
            mass: 1,
            enabledRotations: [false, false, false],
          }"
        >
          <!-- your camera & pointer lock controls -->
          <!-- <ngts-perspective-camera [options]="{ makeDefault: true, position: [0, 1.6, 5] }" /> -->
          <ngts-perspective-camera [options]="{ makeDefault: true }" />

          <!-- capsule collider around the camera -->
          <ngt-object3D ngtrCapsuleCollider [args]="[0.5, 1]" />
        </ngt-object3D>

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
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtsPerspectiveCamera, NgtrPhysics, NgtrRigidBody, NgtrCuboidCollider, NgtrCapsuleCollider],
})
export class Experience {
  // controls?: PointerLockControls;
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

    // effect(() => {
    //   const cam = this.camera();
    //   const renderer = this.gl();
    //   const scene = this.scene();
    //   if (!cam || !renderer || !scene || this.controls) return;
    //
    //   this.controls = new PointerLockControls(cam, renderer.domElement);
    //   const obj = this.controls.object;
    //   scene.add(obj);
    // });

    // lock pointer on click
    // effect(() => {
    //   const dom = this.gl()?.domElement;
    //   if (!dom || !this.controls) return;
    //   dom.addEventListener('click', () => this.controls!.lock());
    // });

    injectBeforeRender(({ delta }) => {
      // // movement
      // const speed = 5 * delta;
      // if (this.keys.has('w')) controls.moveForward(speed);
      // if (this.keys.has('s')) controls.moveForward(-speed);
      // if (this.keys.has('a')) controls.moveRight(-speed);
      // if (this.keys.has('d')) controls.moveRight(speed);
      //
      // controls.update(delta);
    });
  }
}
