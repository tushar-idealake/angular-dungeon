import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extend, injectBeforeRender, injectStore } from 'angular-three';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { filter, fromEvent } from 'rxjs';
import { BoxGeometry, GridHelper, Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector3 } from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

@Component({
  template: `
    <ngts-perspective-camera [options]="{ makeDefault: true, position: [0, 1.6, 5] }" />

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

    <!-- <ngt-grid-helper #floor /> -->
    <ngt-mesh #floor [rotation]="[-Math.PI / 2, 0, 0]">
      <ngt-plane-geometry [args]="[100, 100]" />
      <ngt-mesh-standard-material [color]="'lightgray'" />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtsPerspectiveCamera],
})
export class Experience {
  controls?: PointerLockControls;
  private keys = new Set<string>();

  // grab camera, renderer, scene out of the NgtCanvas store
  private store = injectStore();
  private floor = viewChild<ElementRef<GridHelper>>('floor');
  private camera = this.store.select('camera');
  private gl = this.store.select('gl');
  private scene = this.store.select('scene');

  private velocity = new Vector3();
  private raycaster = new Raycaster();
  private readonly eyeHeight = 1.6; // camera "eye" height above floor
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

    injectBeforeRender(({ delta }) => {
      const controls = this.controls;
      const floor = this.floor()?.nativeElement;
      if (!controls || !floor) return;

      const obj = controls.object;

      //gravity
      this.velocity.y += -9.81 * delta;

      // raycast down from camera to detect floor
      this.raycaster.set(obj.position, new Vector3(0, -1, 0));
      const hits = this.raycaster.intersectObject(floor as any, false);
      const dist = hits.length ? hits[0].distance : Infinity;
      const onFloor = dist <= this.eyeHeight + 0.001;

      if (onFloor) {
        // if on floor, lock height and kill downward velocity
        this.velocity.y = Math.max(0, this.velocity.y);
        obj.position.y = this.eyeHeight;
      } else {
        // apply falling
        obj.position.addScaledVector(this.velocity, delta);
      }

      // movement
      const speed = 5 * delta;
      if (this.keys.has('w')) controls.moveForward(speed);
      if (this.keys.has('s')) controls.moveForward(-speed);
      if (this.keys.has('a')) controls.moveRight(-speed);
      if (this.keys.has('d')) controls.moveRight(speed);

      controls.update(delta);
    });
  }
}
