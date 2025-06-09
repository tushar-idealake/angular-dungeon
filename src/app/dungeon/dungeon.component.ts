import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, effect, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { extend, injectBeforeRender, injectStore } from 'angular-three';
import { NgtrCapsuleCollider, NgtrCuboidCollider, NgtrPhysics, NgtrRigidBody } from 'angular-three-rapier';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { filter, fromEvent, merge, scan, withLatestFrom } from 'rxjs';
import { BoxGeometry, Euler, GridHelper, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';

@Component({
  template: `
    <ngtr-physics [options]="{ gravity: [0, -9.81, 0], colliders: false }">
      <ng-template>
        <!-- floor -->
        <ngt-object3D ngtrRigidBody="fixed" [position]="[0, -1, 0]"></ngt-object3D>
        <ngt-object3D ngtrCuboidCollider [args]="[1000, 0.1, 1000]" />

        <!-- camera/player -->
        <ngt-object3D
          #player
          ngtrRigidBody
          [position]="[0, 0.5, 5]"
          [options]="{
            mass: 1,
            enabledRotations: [false, false, false],
          }"
        >
          <ngts-perspective-camera [options]="{ makeDefault: true }" />
          <ngt-object3D ngtrCapsuleCollider [args]="[0.05, 0.0125]" />
        </ngt-object3D>

        <!-- walls (static colliders for player collision) -->
        @for (row of layout; track $index; let y = $index) {
          @for (wall of row; track $index; let x = $index) {
            @if (wall === '1') {
              <ngt-object3D ngtrRigidBody="fixed" [position]="[x, 0.5, y]">
                <ngt-mesh>
                  <ngt-box-geometry />
                  <ngt-mesh-basic-material [color]="'orange'" />
                </ngt-mesh>
                <!-- <ngt-object3D ngtrCuboidCollider [args]="[0.5, 0.5, 0.5]" /> -->
              </ngt-object3D>
            }
          }
        }
      </ng-template>
    </ngtr-physics>

    <ngt-grid-helper />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtsPerspectiveCamera, NgtrPhysics, NgtrRigidBody, NgtrCuboidCollider, NgtrCapsuleCollider],
})
export class Dungeon {
  private player = viewChild<NgtrRigidBody>('player');

  protected layout = [
    ['1', '1', '1', '1', '1'],
    ['1', '0', '0', '1', '1'],
    ['1', '0', '0', '0', '1'],
    ['1', '0', '1', '0', '1'],
    ['1', '0', '0', '1', '1'],
    ['1', '1', '0', '1', '1'],
  ];

  private store = injectStore();
  private camera = this.store.select('camera');
  private gl = this.store.select('gl');
  private scene = this.store.select('scene');
  private camera$ = toObservable(this.camera);
  private gl$ = toObservable(this.gl);

  protected Math = Math;
  private keydown$ = fromEvent<KeyboardEvent>(document, 'keydown');
  private keyup$ = fromEvent<KeyboardEvent>(document, 'keyup');
  private wasd$ = merge(this.keydown$, this.keyup$).pipe(
    filter((e) => ['w', 'a', 's', 'd'].includes(e.key.toLowerCase())),
    scan((acc, curr) => {
      if (curr.type === 'keyup') acc.delete(curr.key.toLowerCase());
      if (curr.type === 'keydown') acc.add(curr.key.toLowerCase());
      return acc;
    }, new Set<string>()),
  );
  private wasd = toSignal(this.wasd$, { initialValue: new Set<string>() });

  constructor() {
    extend({ Mesh, BoxGeometry, PlaneGeometry, MeshBasicMaterial, GridHelper });

    // pointer lock
    effect(() => {
      const renderer = this.gl();
      if (!renderer) return;

      const onClick = () => {
        renderer.domElement.requestPointerLock();
      };
      renderer.domElement.addEventListener('click', onClick);

      return () => {
        renderer.domElement.removeEventListener('click', onClick);
      };
    });

    // mouse look
    fromEvent<PointerEvent>(document, 'pointermove')
      .pipe(
        withLatestFrom(this.gl$, this.camera$),
        filter(([_, renderer]) => document.pointerLockElement === renderer.domElement),
        takeUntilDestroyed(),
      )
      .subscribe(([event, _, camera]) => {
        const euler = new Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= event.movementX * 0.002;
        euler.x -= event.movementY * 0.002;
        const PI_2 = Math.PI / 2;
        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
        camera.quaternion.setFromEuler(euler);
      });

    injectBeforeRender(({ delta, camera }) => {
      const body = this.player()?.rigidBody();
      if (!body) return;

      // sync camera position with physics body
      const pos = body.translation();
      camera.position.set(pos.x, pos.y, pos.z);

      // movement input relative to camera orientation
      const dir = new Vector3();
      const wasd = this.wasd();
      if (wasd.has('w')) dir.z -= 1;
      if (wasd.has('s')) dir.z += 1;
      if (wasd.has('a')) dir.x -= 1;
      if (wasd.has('d')) dir.x += 1;

      if (dir.lengthSq()) {
        dir
          .normalize()
          .multiplyScalar(100 * delta)
          .applyQuaternion(camera.quaternion);
        body.setLinvel({ x: dir.x, y: 0, z: dir.z }, true);
      } else {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    });
  }
}
