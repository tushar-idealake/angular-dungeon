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

@Component({
  template: `
    <ngtr-physics [options]="{ gravity: [0, -9.81, 0], colliders: false }">
      <ng-template>
        <!-- floor -->
        <ngt-mesh
          [position]="[0, 0, 0]"
          [rotation]="[-Math.PI / 2, 0, 0]"
          [scale]="[layout[0].length, layout.length, 1]"
        >
          <ngt-plane-geometry [args]="[1, 1]" />
          <ngt-mesh-basic-material [map]="floorMap()" />
        </ngt-mesh>
        <ngt-object3D ngtrCuboidCollider [args]="[layout[0].length, 0.1, layout.length]" />

        <!-- roof -->
        <ngt-mesh
          [position]="[0, 1, 0]"
          [rotation]="[Math.PI / 2, 0, 0]"
          [scale]="[layout[0].length, layout.length, 1]"
        >
          <ngt-plane-geometry [args]="[1, 1]" />
          <ngt-mesh-basic-material [map]="roofMap()" />
        </ngt-mesh>

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
  imports: [NgtrPhysics, NgtrRigidBody, NgtrCuboidCollider],
})
export class Dungeon {
  private player = viewChild<NgtrRigidBody>('player');

  textures = injectTexture(() => ({
    walls: './textures/wall.png',
    roof: './textures/roof.png',
    floor: './textures/floor.png',
  }));
  wallsMap = computed(() => this.textures()?.walls || null);
  roofMap = computed(() => this.textures()?.roof || null);
  floorMap = computed(() => this.textures()?.floor || null);

  protected size = 30;
  protected layout = generateDungeonLayout(this.size, this.size);

  // protected layout = [
  //   ['1', '1', '1', '1', '1'],
  //   ['1', '0', '0', '1', '1'],
  //   ['1', '0', '0', '0', '1'],
  //   ['1', '0', '1', '0', '1'],
  //   ['1', '0', '0', '1', '1'],
  //   ['1', '1', '0', '1', '1'],
  // ];

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
      const roof = this.roofMap();
      const floor = this.floorMap();
      if (walls) {
        walls.magFilter = NearestFilter;
        walls.minFilter = NearestFilter;
        walls.generateMipmaps = false;
        walls.wrapS = RepeatWrapping;
        walls.wrapT = RepeatWrapping;
        walls.repeat.set(1, 1);
        walls.needsUpdate = true;
      }
      if (roof) {
        roof.magFilter = NearestFilter;
        roof.minFilter = NearestFilter;
        roof.generateMipmaps = false;
        roof.wrapS = RepeatWrapping;
        roof.wrapT = RepeatWrapping;
        roof.repeat.set(10, 10);
        roof.needsUpdate = true;
      }
      if (floor) {
        floor.magFilter = NearestFilter;
        floor.minFilter = NearestFilter;
        floor.generateMipmaps = false;
        floor.wrapS = RepeatWrapping;
        floor.wrapT = RepeatWrapping;
        floor.repeat.set(10, 10);
        floor.needsUpdate = true;
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

function generateDungeonLayout(w: number, h: number): string[][] {
  // initialize all walls
  const grid = Array.from({ length: h }, () => Array(w).fill('1'));

  // pick entrance on west wall, carve it open
  const entranceY = Math.floor(h / 2);
  grid[entranceY][0] = '0';

  // carve winding corridors by a simple randomized DFS on a coarse 2-cell grid
  const visited = new Set<string>();
  function carve(cx: number, cy: number) {
    // make sure this cell is open
    grid[cy][cx] = '0';
    visited.add(`${cx},${cy}`);

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].sort(() => Math.random() - 0.5);
    for (let [dx, dy] of dirs) {
      const nx = cx + dx * 2,
        ny = cy + dy * 2;
      if (ny > 0 && ny < h - 1 && nx > 0 && nx < w - 1 && !visited.has(`${nx},${ny}`)) {
        // knock down wall between
        grid[cy + dy][cx + dx] = '0';
        grid[ny][nx] = '0';
        carve(nx, ny);
      }
    }
  }
  // start DFS just inside the entrance
  carve(1, entranceY);

  // carve a few random rooms
  for (let i = 0; i < 5; i++) {
    const rw = 4 + Math.floor(Math.random() * 4);
    const rh = 4 + Math.floor(Math.random() * 4);
    const rx = 2 + Math.floor(Math.random() * (w - rw - 4));
    const ry = 2 + Math.floor(Math.random() * (h - rh - 4));
    // carve room
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        grid[y][x] = '0';
      }
    }
    // maybe add pillars
    if (Math.random() < 0.5) {
      const px = rx + 1 + Math.floor(Math.random() * (rw - 2));
      const py = ry + 1 + Math.floor(Math.random() * (rh - 2));
      grid[py][px] = '1';
    }
  }

  return grid;
}
