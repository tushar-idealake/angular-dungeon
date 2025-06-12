import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, computed, effect, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { extend, injectBeforeRender, injectStore } from 'angular-three';
import { NgtrCuboidCollider, NgtrPhysics, NgtrRigidBody } from 'angular-three-rapier';
import { injectTexture } from 'angular-three-soba/loaders';
import { filter, fromEvent, merge, scan, withLatestFrom } from 'rxjs';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Euler,
  GridHelper,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  Vector3,
} from 'three';
import { FloorComponent } from './entities/floor.component';
import { RoofComponent } from './entities/roof.component';
import { generateDungeonLayout } from './utils/generate-dungeon';

@Component({
  template: `
    <ngtr-physics [options]="{ gravity: [0, -9.81, 0], debug: true, colliders: false }">
      <ng-template>
        <dungeon-floor [layout]="layout" />
        <dungeon-roof [layout]="layout" />

        <!-- camera/player -->
        <ngt-object3D
          #player
          ngtrRigidBody
          [position]="[-(size / 2 + 3), 0.5, 0]"
          [options]="{
            mass: 1,
            enabledRotations: [false, false, false],
          }"
        >
          <ngt-object3D ngtrCuboidCollider [args]="[0.2, 0.2, 0.2]" />
        </ngt-object3D>

        <!-- walls (static colliders for player collision) -->
        @for (row of layout; track $index; let y = $index) {
          @for (wall of row; track $index; let x = $index) {
            @if (wall === '1') {
              <ngt-mesh
                ngtrRigidBody="fixed"
                [position]="[x - (layout[0].length - 1) / 2, 0.5, y - (layout.length - 1) / 2]"
              >
                <ngt-box-geometry />
                <ngt-mesh-basic-material [map]="wallsMap()" />
                <ngt-object3D ngtrCuboidCollider [args]="[0.5, 0.5, 0.5]" />
              </ngt-mesh>
            }
          }
        }
      </ng-template>
    </ngtr-physics>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtrPhysics, NgtrRigidBody, NgtrCuboidCollider, FloorComponent, RoofComponent],
})
export class Dungeon {
  private player = viewChild<NgtrRigidBody>('player');

  textures = injectTexture(() => ({
    walls: './textures/wall.png',
  }));
  wallsMap = computed(() => this.textures()?.walls || null);

  protected size = 30;
  protected layout = generateDungeonLayout(this.size, this.size);

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
    extend({
      Mesh,
      BoxGeometry,
      PlaneGeometry,
      MeshBasicMaterial,
      GridHelper,
      Object3D,
      LineSegments,
      LineBasicMaterial,
      BufferGeometry,
      BufferAttribute,
    });

    // nearest neighbor + repeat tiling for walls and roof textures
    effect(() => {
      const walls = this.wallsMap();
      if (walls) {
        walls.magFilter = NearestFilter;
        walls.minFilter = NearestFilter;
        walls.generateMipmaps = false;
        walls.wrapS = RepeatWrapping;
        walls.wrapT = RepeatWrapping;
        walls.repeat.set(1, 1);
        walls.needsUpdate = true;
      }
    });

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
