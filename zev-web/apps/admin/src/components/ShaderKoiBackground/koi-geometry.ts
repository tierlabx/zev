import * as THREE from "three";
import type { KoiMaterialSet } from "./koi-materials";
import type { KoiSpineFrame } from "./koi-simulation";

export const BODY_LENGTH_SEGMENTS = 56;
export const BODY_RADIAL_SEGMENTS = 24;
export const TAIL_U_SEGMENTS = 18;
export const TAIL_V_SEGMENTS = 8;
export const PECTORAL_U_SEGMENTS = 14;
export const PECTORAL_V_SEGMENTS = 8;
export const PELVIC_U_SEGMENTS = 10;
export const PELVIC_V_SEGMENTS = 6;
export const DORSAL_U_SEGMENTS = 16;
export const DORSAL_V_SEGMENTS = 4;
export const BARBEL_U_SEGMENTS = 8;
export const BARBEL_V_SEGMENTS = 2;
export const SHADOW_U_SEGMENTS = 42;

export interface KoiMeshAssembly {
	group: THREE.Group;
	shadowMesh: THREE.Mesh;
	updateFromSpine: (frame: KoiSpineFrame) => void;
	dispose: () => void;
}

interface SpineSample {
	x: number;
	y: number;
	z: number;
	tx: number;
	ty: number;
	nx: number;
	ny: number;
	roll: number;
}

/** 锦鲤躯干水平半宽轮廓函数 (s ∈ [0, 1])：圆润水滴吻部 + 饱满腮肩 + 毛笔收锋细尾 */
function getBodyHalfWidth(s: number): number {
	if (s < 0.21) {
		const t = s / 0.21;
		return 0.024 + 0.342 * Math.sin(t * Math.PI * 0.5) ** 0.7;
	}
	const t = (s - 0.21) / 0.79;
	return 0.366 * (1.0 - t) ** 1.52 + 0.034 * (1.0 - t * 0.2);
}

/** 锦鲤躯干垂直半高轮廓函数 (s ∈ [0, 1]) */
function getBodyHalfHeight(s: number): number {
	if (s < 0.23) {
		const t = s / 0.23;
		return 0.018 + 0.205 * Math.sin(t * Math.PI * 0.5) ** 0.76;
	}
	const t = (s - 0.23) / 0.77;
	return 0.223 * (1.0 - t) ** 1.38 + 0.046 * (1.0 - t * 0.2);
}

/** 沿归一化弧长 s ∈ [0, 1] 线性插值骨骼点、切线、法线与侧倾角 */
function sampleSpine(frame: KoiSpineFrame, sInput: number, out: SpineSample): void {
	const s = Math.max(0, Math.min(1, sInput));
	const count = frame.points.length;
	const exact = s * (count - 1);
	const i0 = Math.min(count - 2, Math.floor(exact));
	const i1 = i0 + 1;
	const frac = exact - i0;

	const p0 = frame.points[i0];
	const p1 = frame.points[i1];
	const x = p0.x + (p1.x - p0.x) * frac;
	const y = p0.y + (p1.y - p0.y) * frac;
	const z = p0.z + (p1.z - p0.z) * frac;

	const iPrev = Math.max(0, i0 - 1);
	const iNext = Math.min(count - 1, i1 + 1);
	const dx = frame.points[iNext].x - frame.points[iPrev].x;
	const dy = frame.points[iNext].y - frame.points[iPrev].y;
	const len = Math.hypot(dx, dy) || 1;
	const tx = dx / len;
	const ty = dy / len;

	out.x = x;
	out.y = y;
	out.z = z;
	out.tx = tx;
	out.ty = ty;
	out.nx = -ty;
	out.ny = tx;
	out.roll = frame.roll * (1.0 - s * 0.65);
}

/**
 * 构建带索引的 U×V 网格几何体。
 * 绕序 `(a, d, b)` 与 `(b, d, c)` 确保管状躯干法线严格朝外（适配正面受光与 BackSide 外扩描边）。
 */
function createGridGeometry(
	uSegs: number,
	vSegs: number,
): {
	geometry: THREE.BufferGeometry;
	positions: Float32Array;
	uvs: Float32Array;
} {
	const vertCount = (uSegs + 1) * (vSegs + 1);
	const positions = new Float32Array(vertCount * 3);
	const uvs = new Float32Array(vertCount * 2);
	const indices: number[] = [];

	for (let iu = 0; iu <= uSegs; iu++) {
		const u = iu / uSegs;
		for (let iv = 0; iv <= vSegs; iv++) {
			const v = iv / vSegs;
			const idx = iu * (vSegs + 1) + iv;
			uvs[idx * 2] = u;
			uvs[idx * 2 + 1] = v;
		}
	}

	for (let iu = 0; iu < uSegs; iu++) {
		for (let iv = 0; iv < vSegs; iv++) {
			const a = iu * (vSegs + 1) + iv;
			const b = (iu + 1) * (vSegs + 1) + iv;
			const c = (iu + 1) * (vSegs + 1) + (iv + 1);
			const d = iu * (vSegs + 1) + (iv + 1);
			indices.push(a, d, b);
			indices.push(b, d, c);
		}
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
	geometry.setIndex(indices);
	return { geometry, positions, uvs };
}

/**
 * 构建高精细度极简黑白线稿 3D 锦鲤网格装配体：
 * - 高细分无眼水滴头 + 纤细龙须 + BackSide 细腻描边壳
 * - 双柳叶尖锋尾鳍 + 柔韧低背鳍脊带 + 水滴叶片胸腹鳍（带尾缘水阻拖曳）
 */
export function createKoiMeshAssembly(materials: KoiMaterialSet): KoiMeshAssembly {
	const group = new THREE.Group();

	// 1. 高细分躯干网格 + 共享几何体的外扩描边壳
	const bodyGrid = createGridGeometry(BODY_LENGTH_SEGMENTS, BODY_RADIAL_SEGMENTS);
	const bodyVertCount = (BODY_LENGTH_SEGMENTS + 1) * (BODY_RADIAL_SEGMENTS + 1);
	const bodyLocalMeta = new Float32Array(bodyVertCount * 3);
	for (let iu = 0; iu <= BODY_LENGTH_SEGMENTS; iu++) {
		const s = iu / BODY_LENGTH_SEGMENTS;
		for (let iv = 0; iv <= BODY_RADIAL_SEGMENTS; iv++) {
			const theta = (iv / BODY_RADIAL_SEGMENTS) * Math.PI * 2;
			const idx = iu * (BODY_RADIAL_SEGMENTS + 1) + iv;
			bodyGrid.uvs[idx * 2] = iv / BODY_RADIAL_SEGMENTS;
			bodyGrid.uvs[idx * 2 + 1] = s;
			const phi = theta - Math.PI * 0.5;
			bodyLocalMeta[idx * 3] = s;
			bodyLocalMeta[idx * 3 + 1] = Math.cos(phi);
			bodyLocalMeta[idx * 3 + 2] = Math.sin(phi);
		}
	}
	const bodyOutlineMesh = new THREE.Mesh(bodyGrid.geometry, materials.outline);
	bodyOutlineMesh.renderOrder = 9;
	bodyOutlineMesh.frustumCulled = false;

	const bodyMesh = new THREE.Mesh(bodyGrid.geometry, materials.body);
	bodyMesh.renderOrder = 10;
	bodyMesh.frustumCulled = false;
	group.add(bodyOutlineMesh, bodyMesh);

	// 2. 双柳叶分叉尾鳍（左右独立修长尾叶，呈现毛笔双锋感）
	const tailLeftGrid = createGridGeometry(TAIL_U_SEGMENTS, TAIL_V_SEGMENTS);
	const tailRightGrid = createGridGeometry(TAIL_U_SEGMENTS, TAIL_V_SEGMENTS);
	const tailLeftMesh = new THREE.Mesh(tailLeftGrid.geometry, materials.fin);
	const tailRightMesh = new THREE.Mesh(tailRightGrid.geometry, materials.fin);
	tailLeftMesh.renderOrder = 11;
	tailRightMesh.renderOrder = 11;
	tailLeftMesh.frustumCulled = false;
	tailRightMesh.frustumCulled = false;
	group.add(tailLeftMesh, tailRightMesh);

	// 3. 左右水滴叶片胸鳍与腹鳍
	const pecLeftGrid = createGridGeometry(PECTORAL_U_SEGMENTS, PECTORAL_V_SEGMENTS);
	const pecRightGrid = createGridGeometry(PECTORAL_U_SEGMENTS, PECTORAL_V_SEGMENTS);
	const pecLeftMesh = new THREE.Mesh(pecLeftGrid.geometry, materials.fin);
	const pecRightMesh = new THREE.Mesh(pecRightGrid.geometry, materials.fin);
	pecLeftMesh.renderOrder = 11;
	pecRightMesh.renderOrder = 11;
	pecLeftMesh.frustumCulled = false;
	pecRightMesh.frustumCulled = false;
	group.add(pecLeftMesh, pecRightMesh);

	const pelLeftGrid = createGridGeometry(PELVIC_U_SEGMENTS, PELVIC_V_SEGMENTS);
	const pelRightGrid = createGridGeometry(PELVIC_U_SEGMENTS, PELVIC_V_SEGMENTS);
	const pelLeftMesh = new THREE.Mesh(pelLeftGrid.geometry, materials.fin);
	const pelRightMesh = new THREE.Mesh(pelRightGrid.geometry, materials.fin);
	pelLeftMesh.renderOrder = 11;
	pelRightMesh.renderOrder = 11;
	pelLeftMesh.frustumCulled = false;
	pelRightMesh.frustumCulled = false;
	group.add(pelLeftMesh, pelRightMesh);

	// 4. 纤细低背鳍脊带（无缝融入背脊，随泳姿轻轻起伏）
	const dorsalGrid = createGridGeometry(DORSAL_U_SEGMENTS, DORSAL_V_SEGMENTS);
	const dorsalMesh = new THREE.Mesh(dorsalGrid.geometry, materials.fin);
	dorsalMesh.renderOrder = 12;
	dorsalMesh.frustumCulled = false;
	group.add(dorsalMesh);

	// 5. 一对纤细水墨龙须（吻部两侧飘逸随动）
	const barbelLeftGrid = createGridGeometry(BARBEL_U_SEGMENTS, BARBEL_V_SEGMENTS);
	const barbelRightGrid = createGridGeometry(BARBEL_U_SEGMENTS, BARBEL_V_SEGMENTS);
	const barbelLeftMesh = new THREE.Mesh(barbelLeftGrid.geometry, materials.barbel);
	const barbelRightMesh = new THREE.Mesh(barbelRightGrid.geometry, materials.barbel);
	barbelLeftMesh.renderOrder = 12;
	barbelRightMesh.renderOrder = 12;
	barbelLeftMesh.frustumCulled = false;
	barbelRightMesh.frustumCulled = false;
	group.add(barbelLeftMesh, barbelRightMesh);

	// 6. 水底同步柔影
	const shadowGrid = createGridGeometry(SHADOW_U_SEGMENTS, 1);
	const shadowMesh = new THREE.Mesh(shadowGrid.geometry, materials.shadow);
	shadowMesh.renderOrder = 5;
	shadowMesh.frustumCulled = false;

	const sampleTmp: SpineSample = { x: 0, y: 0, z: 0, tx: 1, ty: 0, nx: 0, ny: 1, roll: 0 };
	const tailBaseTmp: SpineSample = { x: 0, y: 0, z: 0, tx: 1, ty: 0, nx: 0, ny: 1, roll: 0 };
	const headTipTmp: SpineSample = { x: 0, y: 0, z: 0, tx: 1, ty: 0, nx: 0, ny: 1, roll: 0 };
	let currentFrameRef: KoiSpineFrame;

	const updateLeafFin = (
		grid: { geometry: THREE.BufferGeometry; positions: Float32Array },
		uSegs: number,
		vSegs: number,
		attachS: number,
		sideSign: number,
		finLength: number,
		finWidth: number,
		sweepBack: number,
		rowAngle: number,
		dragPhase: number,
	) => {
		sampleSpine(currentFrameRef, attachS, sampleTmp);
		const posArr = grid.positions;
		const cRoll = Math.cos(sampleTmp.roll);
		const sRoll = Math.sin(sampleTmp.roll);
		const baseHalfW = getBodyHalfWidth(attachS) * 0.85;

		for (let iu = 0; iu <= uSegs; iu++) {
			const u = iu / uSegs;
			const chordWidth = finWidth * Math.sin(u ** 0.5 * Math.PI);
			const reachOut = Math.sin(u * Math.PI * 0.56) * finLength * (1.0 - 0.08 * rowAngle);
			// 加入细微鳍梢水流滞后柔波
			const waterDrag = Math.sin(dragPhase - u * 2.1) * u * 0.045;
			const backShift = u * (sweepBack + rowAngle * 0.14) + u * u * 0.22 + waterDrag;
			const camberZ = Math.sin(u * Math.PI) * 0.024 - u * 0.03;

			for (let iv = 0; iv <= vSegs; iv++) {
				const v = iv / vSegs - 0.5;
				const idx = iu * (vSegs + 1) + iv;
				const localAxial = backShift + v * chordWidth;
				const localLat = sideSign * (baseHalfW + reachOut);
				const localVert = -0.02 + camberZ + v * 0.015;

				const rotLat = localLat * cRoll - localVert * sRoll;
				const rotVert = localLat * sRoll + localVert * cRoll;

				posArr[idx * 3] = sampleTmp.x + sampleTmp.tx * localAxial + sampleTmp.nx * rotLat;
				posArr[idx * 3 + 1] = sampleTmp.y + sampleTmp.ty * localAxial + sampleTmp.ny * rotLat;
				posArr[idx * 3 + 2] = sampleTmp.z + rotVert;
			}
		}
		(grid.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
		grid.geometry.computeVertexNormals();
	};

	const updateTailLobe = (
		grid: { geometry: THREE.BufferGeometry; positions: Float32Array },
		sideSign: number,
		lobeLength: number,
		spreadAngle: number,
		frame: KoiSpineFrame,
	) => {
		const posArr = grid.positions;
		for (let iu = 0; iu <= TAIL_U_SEGMENTS; iu++) {
			const u = iu / TAIL_U_SEGMENTS;
			const bladeWidth = 0.155 * Math.sin(u ** 0.54 * Math.PI) * (1.0 - u * 0.24);
			const axialLen = u * lobeLength;
			const curveOut = sideSign * (0.018 + spreadAngle * u ** 1.18);
			const whip = Math.sin(frame.swimPhase - 5.3 - u * 2.45) * (0.04 + u * 0.23) * frame.tailWhipScale;
			const centerLat = curveOut + whip;
			const vertFlutter = Math.cos(frame.swimPhase * 0.5 - u * 2.0) * u * 0.026 * sideSign;

			for (let iv = 0; iv <= TAIL_V_SEGMENTS; iv++) {
				const v = iv / TAIL_V_SEGMENTS - 0.5;
				const idx = iu * (TAIL_V_SEGMENTS + 1) + iv;
				const lat = centerLat + v * bladeWidth;
				const vert = vertFlutter + v * 0.02 * frame.roll;

				posArr[idx * 3] = tailBaseTmp.x + tailBaseTmp.tx * axialLen + tailBaseTmp.nx * lat;
				posArr[idx * 3 + 1] = tailBaseTmp.y + tailBaseTmp.ty * axialLen + tailBaseTmp.ny * lat;
				posArr[idx * 3 + 2] = tailBaseTmp.z + vert;
			}
		}
		(grid.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
		grid.geometry.computeVertexNormals();
	};

	const updateBarbel = (
		grid: { geometry: THREE.BufferGeometry; positions: Float32Array },
		sideSign: number,
		frame: KoiSpineFrame,
	) => {
		const posArr = grid.positions;
		const cRoll = Math.cos(headTipTmp.roll);
		const sRoll = Math.sin(headTipTmp.roll);
		const length = 0.26;

		for (let iu = 0; iu <= BARBEL_U_SEGMENTS; iu++) {
			const u = iu / BARBEL_U_SEGMENTS;
			const halfW = 0.015 * (1.0 - u * 0.72);
			const sway = Math.sin(frame.swimPhase * 1.15 - u * 2.4 + sideSign * 0.6) * u * 0.042;
			// 从吻端微前探后向两侧弧形飘散，超越吻部宽度在水中清晰可见
			const localAxial = -0.05 + u * length;
			const localLat = sideSign * (0.095 + Math.sin(u * Math.PI * 0.62) * 0.16) + sway;
			const localVert = -0.01 - u * 0.015;

			const rotLat = localLat * cRoll - localVert * sRoll;
			const rotVert = localLat * sRoll + localVert * cRoll;

			for (let iv = 0; iv <= BARBEL_V_SEGMENTS; iv++) {
				const v = iv / BARBEL_V_SEGMENTS - 0.5;
				const idx = iu * (BARBEL_V_SEGMENTS + 1) + iv;
				posArr[idx * 3] = headTipTmp.x + headTipTmp.tx * localAxial + headTipTmp.nx * (rotLat + v * halfW);
				posArr[idx * 3 + 1] = headTipTmp.y + headTipTmp.ty * localAxial + headTipTmp.ny * (rotLat + v * halfW);
				posArr[idx * 3 + 2] = headTipTmp.z + rotVert;
			}
		}
		(grid.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
	};

	const updateFromSpine = (frame: KoiSpineFrame) => {
		currentFrameRef = frame;

		// 1. 躯干蒙皮
		const bodyPos = bodyGrid.positions;
		for (let iu = 0; iu <= BODY_LENGTH_SEGMENTS; iu++) {
			const s = iu / BODY_LENGTH_SEGMENTS;
			sampleSpine(frame, s, sampleTmp);
			const hw = getBodyHalfWidth(s);
			const hh = getBodyHalfHeight(s);
			const cRoll = Math.cos(sampleTmp.roll);
			const sRoll = Math.sin(sampleTmp.roll);
			const capScale = iu === 0 || iu === BODY_LENGTH_SEGMENTS ? 0.04 : 1.0;

			for (let iv = 0; iv <= BODY_RADIAL_SEGMENTS; iv++) {
				const idx = iu * (BODY_RADIAL_SEGMENTS + 1) + iv;
				const cosPhi = bodyLocalMeta[idx * 3 + 1];
				const sinPhi = bodyLocalMeta[idx * 3 + 2];
				const bellyFlatten = sinPhi < 0 ? 0.8 : 1.04;
				const localLat = cosPhi * hw * capScale;
				const localVert = sinPhi * hh * bellyFlatten * capScale;

				const rotLat = localLat * cRoll - localVert * sRoll;
				const rotVert = localLat * sRoll + localVert * cRoll;

				bodyPos[idx * 3] = sampleTmp.x + sampleTmp.nx * rotLat;
				bodyPos[idx * 3 + 1] = sampleTmp.y + sampleTmp.ny * rotLat;
				bodyPos[idx * 3 + 2] = sampleTmp.z + rotVert;
			}
		}
		(bodyGrid.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
		bodyGrid.geometry.computeVertexNormals();

		// 2. 双柳叶尖尾鳍
		sampleSpine(frame, 0.94, tailBaseTmp);
		updateTailLobe(tailLeftGrid, 1, 1.28, 0.25, frame);
		updateTailLobe(tailRightGrid, -1, 1.06, 0.19, frame);

		// 3. 左右水滴叶片胸鳍与腹鳍
		const pecSwingL = Math.sin(frame.pecPhase);
		const pecSwingR = Math.sin(frame.pecPhase + 0.35);
		updateLeafFin(
			pecLeftGrid,
			PECTORAL_U_SEGMENTS,
			PECTORAL_V_SEGMENTS,
			0.22,
			1,
			0.49,
			0.34,
			0.56,
			pecSwingL,
			frame.swimPhase,
		);
		updateLeafFin(
			pecRightGrid,
			PECTORAL_U_SEGMENTS,
			PECTORAL_V_SEGMENTS,
			0.22,
			-1,
			0.49,
			0.34,
			0.56,
			pecSwingR,
			frame.swimPhase + 0.4,
		);

		updateLeafFin(
			pelLeftGrid,
			PELVIC_U_SEGMENTS,
			PELVIC_V_SEGMENTS,
			0.5,
			1,
			0.28,
			0.21,
			0.36,
			pecSwingL * 0.45,
			frame.swimPhase - 1.1,
		);
		updateLeafFin(
			pelRightGrid,
			PELVIC_U_SEGMENTS,
			PELVIC_V_SEGMENTS,
			0.5,
			-1,
			0.28,
			0.21,
			0.36,
			pecSwingR * 0.45,
			frame.swimPhase - 1.1,
		);

		// 4. 纤细低背鳍脊带（仅微微挑起背脊弧线，加强立体游动韵律）
		const dorsalPos = dorsalGrid.positions;
		for (let iu = 0; iu <= DORSAL_U_SEGMENTS; iu++) {
			const u = iu / DORSAL_U_SEGMENTS;
			const s = 0.28 + u * 0.44;
			sampleSpine(frame, s, sampleTmp);
			const crestHeight = Math.sin(u ** 0.65 * Math.PI) * 0.11;
			const baseZ = getBodyHalfHeight(s) * 0.74;
			const sway = Math.sin(frame.swimPhase - s * 5.0 - 0.7) * 0.042;
			const cRoll = Math.cos(sampleTmp.roll);
			const sRoll = Math.sin(sampleTmp.roll);

			for (let iv = 0; iv <= DORSAL_V_SEGMENTS; iv++) {
				const v = iv / DORSAL_V_SEGMENTS;
				const idx = iu * (DORSAL_V_SEGMENTS + 1) + iv;
				const localLat = v * sway;
				const localVert = baseZ + v * crestHeight;
				const rotLat = localLat * cRoll - localVert * sRoll;
				const rotVert = localLat * sRoll + localVert * cRoll;

				dorsalPos[idx * 3] = sampleTmp.x + sampleTmp.nx * rotLat;
				dorsalPos[idx * 3 + 1] = sampleTmp.y + sampleTmp.ny * rotLat;
				dorsalPos[idx * 3 + 2] = sampleTmp.z + rotVert;
			}
		}
		(dorsalGrid.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
		dorsalGrid.geometry.computeVertexNormals();

		// 5. 纤细龙须
		sampleSpine(frame, 0.032, headTipTmp);
		updateBarbel(barbelLeftGrid, 1, frame);
		updateBarbel(barbelRightGrid, -1, frame);

		// 6. 水底柔和阴影
		const shadowPos = shadowGrid.positions;
		const lightOffsetX = 0.28;
		const lightOffsetY = -0.34;
		const shadowZ = -1.14;
		for (let iu = 0; iu <= SHADOW_U_SEGMENTS; iu++) {
			const u = iu / SHADOW_U_SEGMENTS;
			const idx0 = iu * 2;
			const idx1 = idx0 + 1;
			let sx = 0;
			let sy = 0;
			let snx = 0;
			let sny = 1;
			let hw = 0;

			if (u <= 0.76) {
				const sBody = u / 0.76;
				sampleSpine(frame, sBody, sampleTmp);
				sx = sampleTmp.x;
				sy = sampleTmp.y;
				snx = sampleTmp.nx;
				sny = sampleTmp.ny;
				hw = getBodyHalfWidth(sBody) * 1.12;
				if (sBody > 0.17 && sBody < 0.36) {
					hw += Math.sin(((sBody - 0.17) / 0.19) * Math.PI) * 0.26;
				}
			} else {
				const uTail = (u - 0.76) / 0.24;
				const tailReach = uTail * 1.05;
				const waveOffset = Math.sin(frame.swimPhase - 5.3 - uTail * 2.45) * (0.04 + uTail * 0.23) * frame.tailWhipScale;
				sx = tailBaseTmp.x + tailBaseTmp.tx * tailReach + tailBaseTmp.nx * waveOffset;
				sy = tailBaseTmp.y + tailBaseTmp.ty * tailReach + tailBaseTmp.ny * waveOffset;
				snx = tailBaseTmp.nx;
				sny = tailBaseTmp.ny;
				hw = 0.05 + 0.22 * Math.sin(uTail * Math.PI * 0.85);
			}

			shadowPos[idx0 * 3] = sx + lightOffsetX - snx * hw;
			shadowPos[idx0 * 3 + 1] = sy + lightOffsetY - sny * hw;
			shadowPos[idx0 * 3 + 2] = shadowZ;

			shadowPos[idx1 * 3] = sx + lightOffsetX + snx * hw;
			shadowPos[idx1 * 3 + 1] = sy + lightOffsetY + sny * hw;
			shadowPos[idx1 * 3 + 2] = shadowZ;
		}
		(shadowGrid.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
	};

	return {
		group,
		shadowMesh,
		updateFromSpine,
		dispose: () => {
			bodyGrid.geometry.dispose();
			tailLeftGrid.geometry.dispose();
			tailRightGrid.geometry.dispose();
			pecLeftGrid.geometry.dispose();
			pecRightGrid.geometry.dispose();
			pelLeftGrid.geometry.dispose();
			pelRightGrid.geometry.dispose();
			dorsalGrid.geometry.dispose();
			barbelLeftGrid.geometry.dispose();
			barbelRightGrid.geometry.dispose();
			shadowGrid.geometry.dispose();
		},
	};
}
