import * as THREE from "three";
import { createKoiMeshAssembly } from "./koi-geometry";
import { createKoiMaterialSet } from "./koi-materials";
import { KoiAgent } from "./koi-simulation";
import type { KoiPondController, KoiSceneOptions, PointerTarget } from "./koi-types";
import { createPondBedMesh, createWaterSurfaceMesh, evaluateWaveSplitY, RippleManager } from "./pond-water";

const CAMERA_Z = 14;
const CAMERA_FOV_DEG = 42;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV_DEG * 0.5));

/**
 * 构建纯程序化 3D 黑白线稿锦鲤水池场景控制器（无任何模块级可变状态）。
 * 实现：
 * - 左下至右上原版太极 S 形海浪分割线（确保右侧登录卡位于纯白区）
 * - 鼠标在哪一侧水域，仅对应一侧的鱼追随，绝不同时追逐
 * - 允许鱼头偶尔轻探过界半个身位后再顺浪滑回
 */
export function createKoiPondScene(canvas: HTMLCanvasElement, options: KoiSceneOptions = {}): KoiPondController {
	const initialWidth = canvas.clientWidth || canvas.width || 1280;
	const initialHeight = canvas.clientHeight || canvas.height || 720;
	const initialAspect = options.aspect ?? initialWidth / Math.max(1, initialHeight);

	const renderer =
		options.renderer ??
		new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
		});
	const dpr = options.pixelRatio ?? (typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1);
	renderer.setPixelRatio(dpr);
	renderer.setSize(initialWidth, initialHeight, false);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.NoToneMapping;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, initialAspect, 0.1, 60);
	camera.position.set(0, 0, CAMERA_Z);
	camera.lookAt(0, 0, 0);

	const viewportHalf = new THREE.Vector2(CAMERA_Z * TAN_HALF_FOV * initialAspect, CAMERA_Z * TAN_HALF_FOV);
	const ripples = new RippleManager();

	const pondBed = createPondBedMesh(ripples.uniformArray, viewportHalf);
	const waterSurface = createWaterSurfaceMesh(ripples.uniformArray, viewportHalf);
	scene.add(pondBed.mesh, waterSurface.mesh);

	const whiteMaterials = createKoiMaterialSet("white");
	const blackMaterials = createKoiMaterialSet("black");
	const whiteMesh = createKoiMeshAssembly(whiteMaterials);
	const blackMesh = createKoiMeshAssembly(blackMaterials);
	scene.add(whiteMesh.shadowMesh, blackMesh.shadowMesh, whiteMesh.group, blackMesh.group);

	const whiteAgent = new KoiAgent("white");
	const blackAgent = new KoiAgent("black");

	let elapsed = options.initialTime ?? 0;
	let camParallaxX = 0;
	let camParallaxY = 0;
	let camVelX = 0;
	let camVelY = 0;
	let camActiveBlend = 0;
	let lastPointerNx = 0.5;
	let lastPointerNy = 0.5;

	const pointer: PointerTarget = {
		x: 0,
		y: 0,
		active: false,
		overCard: false,
		lastMoveTime: -10,
	};

	const raycaster = new THREE.Raycaster();
	const ndcVec = new THREE.Vector2();
	const pondPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
	const hitVec = new THREE.Vector3();

	const projectToPondPlane = (nx: number, ny: number): { x: number; y: number } => {
		ndcVec.set(nx * 2 - 1, 1 - ny * 2);
		raycaster.setFromCamera(ndcVec, camera);
		if (raycaster.ray.intersectPlane(pondPlane, hitVec)) {
			return { x: hitVec.x, y: hitVec.y };
		}
		return {
			x: (nx * 2 - 1) * viewportHalf.x,
			y: (1 - ny * 2) * viewportHalf.y,
		};
	};

	const setPointerNormalized = (nx: number, ny: number, overCard: boolean) => {
		lastPointerNx = nx;
		lastPointerNy = ny;
		const world = projectToPondPlane(nx, ny);
		pointer.x = world.x;
		pointer.y = world.y;
		pointer.active = true;
		pointer.overCard = overCard;
		pointer.lastMoveTime = elapsed;
		if (!overCard) {
			ripples.emitTrail(world.x, world.y, elapsed, 0.2, 0.62, 0.12);
		}
	};

	const clearPointer = () => {
		pointer.active = false;
		pointer.overCard = false;
	};

	const triggerRipple = (nx: number, ny: number, strength = 0.85) => {
		const world = projectToPondPlane(nx, ny);
		ripples.emit(world.x, world.y, elapsed, strength);
	};

	const resize = (width: number, height: number) => {
		const w = Math.max(1, width);
		const h = Math.max(1, height);
		const aspect = w / h;
		camera.aspect = aspect;
		camera.updateProjectionMatrix();
		viewportHalf.set(CAMERA_Z * TAN_HALF_FOV * aspect, CAMERA_Z * TAN_HALF_FOV);
		renderer.setSize(w, h, false);
	};

	const step = (dtInput: number) => {
		const dt = Math.min(Math.max(dtInput, 0.001), 0.05);
		elapsed += dt;

		if (options.scriptedPointer) {
			const scripted = options.scriptedPointer(elapsed);
			if (scripted.active) {
				setPointerNormalized(scripted.nx, scripted.ny, Boolean(scripted.overCard));
			} else {
				clearPointer();
			}
			if (scripted.rippleStrength && scripted.rippleStrength > 0) {
				triggerRipple(scripted.nx, scripted.ny, scripted.rippleStrength);
			}
		}

		// 二阶阻尼弹簧相机视差，保证鼠标突然移入或离开时运镜速度连续无跳变
		const targetBlend = pointer.active ? 1 : 0;
		camActiveBlend += (targetBlend - camActiveBlend) * Math.min(1, dt * 2.2);
		const idleCamX = Math.sin(elapsed * 0.22) * 0.12;
		const idleCamY = Math.cos(elapsed * 0.18) * 0.09;
		const ptrCamX = (lastPointerNx * 2 - 1) * 0.3;
		const ptrCamY = (1 - lastPointerNy * 2) * 0.2;
		const targetCamX = idleCamX + (ptrCamX - idleCamX) * camActiveBlend;
		const targetCamY = idleCamY + (ptrCamY - idleCamY) * camActiveBlend;

		const springStiffness = 14.0;
		const springDamping = 7.5;
		camVelX += ((targetCamX - camParallaxX) * springStiffness - camVelX * springDamping) * dt;
		camVelY += ((targetCamY - camParallaxY) * springStiffness - camVelY * springDamping) * dt;
		camParallaxX += camVelX * dt;
		camParallaxY += camVelY * dt;
		camera.position.set(camParallaxX, camParallaxY, CAMERA_Z);
		camera.lookAt(0, 0, 0);

		// 分区单侧“咬饵”追鼠判定：鼠标在黑区仅白鱼追咬、在白区仅黑鱼追咬，绝不同时追
		const pointerIsRecent = pointer.active && !pointer.overCard && elapsed - pointer.lastMoveTime < 6.0;
		const pointerNormX = pointer.x / Math.max(1, viewportHalf.x);
		const pointerNormY = pointer.y / Math.max(1, viewportHalf.y);
		const splitYAtPointer = evaluateWaveSplitY(pointerNormX, elapsed);

		const whiteShouldChase = pointerIsRecent && pointerNormY > splitYAtPointer;
		const blackShouldChase = pointerIsRecent && pointerNormY <= splitYAtPointer;

		const whiteHead = whiteAgent.getHeadPosition();
		const blackHead = blackAgent.getHeadPosition();

		const whiteFrame = whiteAgent.step(dt, elapsed, whiteShouldChase, pointer, blackHead, viewportHalf, ripples);
		const blackFrame = blackAgent.step(dt, elapsed, blackShouldChase, pointer, whiteHead, viewportHalf, ripples);

		whiteMesh.updateFromSpine(whiteFrame);
		blackMesh.updateFromSpine(blackFrame);

		pondBed.material.uniforms.uTime.value = elapsed;
		waterSurface.material.uniforms.uTime.value = elapsed;
	};

	const render = () => {
		renderer.render(scene, camera);
	};

	const dispose = () => {
		pondBed.mesh.geometry.dispose();
		pondBed.material.dispose();
		waterSurface.mesh.geometry.dispose();
		waterSurface.material.dispose();
		whiteMesh.dispose();
		blackMesh.dispose();
		whiteMaterials.dispose();
		blackMaterials.dispose();
		renderer.dispose();
	};

	step(1 / 60);

	return {
		step,
		render,
		resize,
		setPointerNormalized,
		clearPointer,
		triggerRipple,
		dispose,
	};
}
