import type { KoiVariant, PointerTarget } from "./koi-types";
import { evaluateWaveSplitY, type RippleManager } from "./pond-water";

const SPINE_NODE_COUNT = 18;
const BODY_LENGTH = 3.55;
const SEGMENT_LENGTH = BODY_LENGTH / (SPINE_NODE_COUNT - 1);

export type BitePhase = "cruise" | "approach" | "strike" | "recoil";

export interface SpineNode {
	x: number;
	y: number;
	z: number;
}

export interface KoiSpineFrame {
	points: SpineNode[];
	roll: number;
	swimPhase: number;
	pecPhase: number;
	tailWhipScale: number;
}

/** 角度归一化到 [-PI, PI] */
function wrapAngle(a: number): number {
	let angle = a;
	while (angle > Math.PI) angle -= Math.PI * 2;
	while (angle < -Math.PI) angle += Math.PI * 2;
	return angle;
}

/**
 * 轻量仿生水动力学仿真器：
 * - 18 节柔性脊椎链距离约束 + 关节弯折角夹逼
 * - 二阶角速度惯性转向与转弯侧倾（Banking Roll）
 * - 单侧分区“咬饵式”追鼠状态机（approach -> strike 抬头啄饵激起水波 -> recoil 悬停蓄势再啄，绝不转圈）
 * - 守域动态海浪防越界 + 鱼头偶尔允许轻探过界半个身位后再优雅滑回
 */
export class KoiAgent {
	public readonly variant: KoiVariant;
	private readonly nodes: SpineNode[];
	private readonly renderedNodes: SpineNode[];

	private heading: number;
	private angularVel = 0;
	private speed: number;
	private roll = 0;
	private swimPhase: number;
	private pecPhase: number;
	private readonly baseZ: number;
	private readonly orbitPhaseOffset: number;
	private lastWakeTime = -10;

	// 咬饵状态机
	private bitePhase: BitePhase = "cruise";
	private phaseTimer = 0;
	private biteEmitted = false;
	private surfaceLift = 0;

	public constructor(variant: KoiVariant) {
		this.variant = variant;
		const isWhite = variant === "white";

		const startX = isWhite ? -2.2 : 0.7;
		const startY = isWhite ? 0.65 : -1.05;
		this.heading = isWhite ? 1.02 : -2.05;
		this.speed = 1.95;
		this.baseZ = isWhite ? 0.08 : -0.14;
		this.swimPhase = isWhite ? 0 : Math.PI * 0.9;
		this.pecPhase = isWhite ? 0.3 : 1.9;
		this.orbitPhaseOffset = isWhite ? 0 : Math.PI;

		this.nodes = Array.from({ length: SPINE_NODE_COUNT }, (_, idx) => ({
			x: startX - Math.cos(this.heading) * SEGMENT_LENGTH * idx,
			y: startY - Math.sin(this.heading) * SEGMENT_LENGTH * idx,
			z: this.baseZ,
		}));
		this.renderedNodes = this.nodes.map((n) => ({ ...n }));
	}

	public getHeadPosition(): { x: number; y: number } {
		return this.nodes[0];
	}

	/** 推进一帧游动物理、咬饵式追鼠、海浪防越界探头与脊椎波动 */
	public step(
		dt: number,
		time: number,
		shouldChase: boolean,
		pointer: PointerTarget,
		otherFishHead: { x: number; y: number },
		boundsHalf: { x: number; y: number },
		ripples: RippleManager,
	): KoiSpineFrame {
		const head = this.nodes[0];
		const isWhite = this.variant === "white";

		// --- 1. 更新咬饵追逐状态机 ---
		const dxBait = pointer.x - head.x;
		const dyBait = pointer.y - head.y;
		const distToBait = Math.hypot(dxBait, dyBait);
		const angleToBait = Math.atan2(dyBait, dxBait);
		const headingErrToBait = Math.abs(wrapAngle(angleToBait - this.heading));

		if (!shouldChase) {
			this.bitePhase = "cruise";
			this.phaseTimer = 0;
			this.biteEmitted = false;
		} else {
			if (this.bitePhase === "cruise") {
				this.bitePhase = "approach";
				this.phaseTimer = 0;
				this.biteEmitted = false;
			}
			this.phaseTimer += dt;

			if (this.bitePhase === "approach") {
				if (distToBait <= 0.88 && headingErrToBait < 0.78) {
					this.bitePhase = "strike";
					this.phaseTimer = 0;
					this.biteEmitted = false;
				}
			} else if (this.bitePhase === "strike") {
				if (!this.biteEmitted && (this.phaseTimer >= 0.13 || distToBait <= 0.24)) {
					this.biteEmitted = true;
					// 啄中瞬间在光标处激起清脆的咬饵同心波纹
					ripples.emit(pointer.x, pointer.y, time, 0.72);
				}
				if (this.phaseTimer >= 0.3) {
					this.bitePhase = "recoil";
					this.phaseTimer = 0;
				}
			} else if (this.bitePhase === "recoil") {
				// 鼠标移开较远时立即重新追上
				if (distToBait > 1.55) {
					this.bitePhase = "approach";
					this.phaseTimer = 0;
				} else if (this.phaseTimer >= 0.68) {
					// 鼠标仍停留原地：短促蓄势后再次轻啄（或微调对准）
					this.bitePhase = distToBait <= 1.05 && headingErrToBait < 0.72 ? "strike" : "approach";
					this.phaseTimer = 0;
					this.biteEmitted = false;
				}
			}
		}

		// --- 2. 计算当前阶段的目标点、期望航速与转向能力 ---
		let targetX: number;
		let targetY: number;
		let desiredSpeed: number;
		let maxTurnRate: number;
		let targetLift = 0;
		let speedBoostFreq = 0;

		if (this.bitePhase === "approach") {
			// 鱼头直指饵点（光标），不再绕圈！
			targetX = pointer.x;
			targetY = pointer.y;
			desiredSpeed = distToBait > 2.8 ? 4.35 : distToBait > 1.2 ? 2.85 : 1.75;
			maxTurnRate = distToBait > 1.6 ? 3.5 : 2.9;
		} else if (this.bitePhase === "strike") {
			// 急促前冲啄饵，同时鱼头优雅上浮至水面咬饵
			targetX = pointer.x;
			targetY = pointer.y;
			const lungeCurve = Math.sin(Math.min(1, this.phaseTimer / 0.3) * Math.PI);
			desiredSpeed = distToBait > 0.22 ? 2.95 * (0.45 + 0.55 * lungeCurve) : 0.35;
			maxTurnRate = 3.4;
			targetLift = 0.34 * lungeCurve;
			speedBoostFreq = 3.6 * lungeCurve;
		} else if (this.bitePhase === "recoil") {
			// 咬完后轻退悬停面向饵点，靠胸鳍微划维持姿态，不转圈
			targetX = pointer.x;
			targetY = pointer.y;
			desiredSpeed = distToBait > 0.85 ? 0.55 : 0.14;
			maxTurnRate = 2.1;
			targetLift = 0.06;
		} else {
			// 自在巡游：各自守护反色水域
			const t = time * (isWhite ? 0.36 : 0.33) + this.orbitPhaseOffset * 0.5;
			if (isWhite) {
				targetX = -2.4 + Math.cos(t) * Math.min(3.8, boundsHalf.x * 0.42);
				const nxTarget = targetX / Math.max(1, boundsHalf.x);
				const waveY = evaluateWaveSplitY(nxTarget, time) * boundsHalf.y;
				const peekDip = Math.max(0, Math.sin(time * 0.52) - 0.62) / 0.38;
				const offsetAboveWave = 1.65 + Math.sin(t * 1.4) * 1.15 - peekDip * 1.95;
				targetY = Math.min(boundsHalf.y * 0.74, waveY + offsetAboveWave);
			} else {
				targetX = 0.25 + Math.cos(t) * Math.min(2.6, boundsHalf.x * 0.34);
				const nxTarget = targetX / Math.max(1, boundsHalf.x);
				const waveY = evaluateWaveSplitY(nxTarget, time) * boundsHalf.y;
				const peekLift = Math.max(0, Math.sin(time * 0.46 + 1.9) - 0.62) / 0.38;
				const offsetBelowWave = 1.75 + Math.sin(t * 1.3 + 0.8) * 1.1 - peekLift * 1.95;
				targetY = Math.max(-boundsHalf.y * 0.74, waveY - offsetBelowWave);
			}
			desiredSpeed = 2.05 + 0.24 * Math.sin(time * 0.65 + this.orbitPhaseOffset);
			maxTurnRate = 1.95;
		}

		// --- 3. 海浪守域约束与偶尔轻探半个身位 ---
		const headNx = head.x / Math.max(1, boundsHalf.x);
		const waveWorldY = evaluateWaveSplitY(headNx, time) * boundsHalf.y;
		const waveNextY = evaluateWaveSplitY(headNx + 0.04, time) * boundsHalf.y;
		const slopeAngle = Math.atan2(waveNextY - waveWorldY, 0.04 * boundsHalf.x);
		const homeNormalX = isWhite ? -Math.sin(slopeAngle) : Math.sin(slopeAngle);
		const homeNormalY = isWhite ? Math.cos(slopeAngle) : -Math.cos(slopeAngle);
		const homeDepth = isWhite ? head.y - waveWorldY : waveWorldY - head.y;

		const periodicPeek = Math.max(0, Math.sin(time * 0.5 + (isWhite ? 0.3 : 2.4)) - 0.58) / 0.42;
		const peekAllowance = shouldChase ? 1.15 : 0.35 + periodicPeek * 1.15;

		if (homeDepth < -peekAllowance) {
			const overshoot = -peekAllowance - homeDepth;
			const pushBack = Math.min(4.8, 1.8 + overshoot * 2.6);
			targetX = head.x + homeNormalX * pushBack + Math.cos(slopeAngle) * 1.1;
			targetY = head.y + homeNormalY * pushBack + Math.sin(slopeAngle) * 1.1;
			maxTurnRate = Math.max(maxTurnRate, 2.85);
		}

		// 池壁回拉边界
		const minX = isWhite ? -boundsHalf.x * 0.84 : -boundsHalf.x * 0.78;
		const maxX = isWhite ? boundsHalf.x * 0.32 : boundsHalf.x * 0.42;
		const minY = -boundsHalf.y * 0.8;
		const maxY = boundsHalf.y * 0.8;
		if (head.x < minX) targetX += (minX - head.x) * 2.4;
		if (head.x > maxX) targetX -= (head.x - maxX) * 2.4;
		if (head.y < minY) targetY += (minY - head.y) * 2.4;
		if (head.y > maxY) targetY -= (head.y - maxY) * 2.4;

		// 双鱼轻微避让
		const sepX = head.x - otherFishHead.x;
		const sepY = head.y - otherFishHead.y;
		const sepDist = Math.hypot(sepX, sepY);
		if (sepDist > 0.001 && sepDist < 2.1) {
			const push = ((2.1 - sepDist) / 2.1) * 2.2;
			targetX += (sepX / sepDist) * push;
			targetY += (sepY / sepDist) * push;
		}

		// --- 4. 二阶角速度惯性转向与推进 ---
		const desiredHeading = Math.atan2(targetY - head.y, targetX - head.x);
		const wanderAngle = this.bitePhase === "cruise" ? Math.sin(this.swimPhase * 0.78) * 0.04 : 0;
		const angleDiff = wrapAngle(desiredHeading + wanderAngle - this.heading);
		const desiredAngVel = Math.max(-maxTurnRate, Math.min(maxTurnRate, angleDiff * 3.4));
		this.angularVel += (desiredAngVel - this.angularVel) * Math.min(1, dt * 8.0);
		this.heading = wrapAngle(this.heading + this.angularVel * dt);

		const turnRatio = Math.min(1, Math.abs(angleDiff) / 1.4);
		const effectiveTargetSpeed = this.bitePhase === "recoil" ? desiredSpeed : desiredSpeed * (1.0 - turnRatio * 0.18);
		this.speed += (effectiveTargetSpeed - this.speed) * Math.min(1, dt * 5.2);

		const targetRoll = Math.max(-0.26, Math.min(0.26, -this.angularVel * 0.14));
		this.roll += (targetRoll - this.roll) * Math.min(1, dt * 5.2);

		this.surfaceLift += (targetLift - this.surfaceLift) * Math.min(1, dt * 9.0);

		// 轻退悬停时整体柔和微后滑，保持 18 节脊椎自然舒展不折皱
		if (this.bitePhase === "recoil" && distToBait < 0.78) {
			const backDrift = (0.78 - distToBait) * 0.95 * dt;
			const bx = -Math.cos(this.heading) * backDrift;
			const by = -Math.sin(this.heading) * backDrift;
			for (let i = 0; i < SPINE_NODE_COUNT; i++) {
				this.nodes[i].x += bx;
				this.nodes[i].y += by;
			}
		}

		head.x += Math.cos(this.heading) * this.speed * dt;
		head.y += Math.sin(this.heading) * this.speed * dt;
		head.z = this.baseZ + Math.sin(time * 0.95 + this.orbitPhaseOffset) * 0.07 + this.surfaceLift;

		const swimFreq = 3.8 + this.speed * 1.38 + turnRatio * 1.9 + speedBoostFreq;
		this.swimPhase += swimFreq * dt;
		// 悬停时胸鳍依然积极轻划维持平衡
		const pecFreq = this.bitePhase === "recoil" ? 4.4 : 2.4 + this.speed * 0.8;
		this.pecPhase += pecFreq * dt;

		// --- 5. 18 节脊椎距离约束 + 行波 ---
		let prevAngle = this.heading + Math.PI;
		for (let i = 1; i < SPINE_NODE_COUNT; i++) {
			const prev = this.nodes[i - 1];
			const curr = this.nodes[i];
			const dx = curr.x - prev.x;
			const dy = curr.y - prev.y;
			let segAngle = Math.atan2(dy, dx);
			const bend = wrapAngle(segAngle - prevAngle);
			const maxJointBend = 0.21;
			if (Math.abs(bend) > maxJointBend) {
				segAngle = wrapAngle(prevAngle + Math.sign(bend) * maxJointBend);
			}
			curr.x = prev.x + Math.cos(segAngle) * SEGMENT_LENGTH;
			curr.y = prev.y + Math.sin(segAngle) * SEGMENT_LENGTH;
			curr.z = prev.z + (this.baseZ - prev.z) * 0.12;
			prevAngle = segAngle;
		}

		const waveIntensity =
			this.bitePhase === "recoil"
				? 0.56
				: 0.72 + Math.min(0.65, Math.max(0, this.speed - 1.8) * 0.24 + turnRatio * 0.28 + speedBoostFreq * 0.08);
		for (let i = 0; i < SPINE_NODE_COUNT; i++) {
			const s = i / (SPINE_NODE_COUNT - 1);
			const baseNode = this.nodes[i];
			const iPrev = Math.max(0, i - 1);
			const iNext = Math.min(SPINE_NODE_COUNT - 1, i + 1);
			const tx = this.nodes[iNext].x - this.nodes[iPrev].x;
			const ty = this.nodes[iNext].y - this.nodes[iPrev].y;
			const len = Math.hypot(tx, ty) || 1;
			const nx = -ty / len;
			const ny = tx / len;

			const amp = (0.011 + 0.152 * s ** 1.85) * waveIntensity;
			const wave = Math.sin(this.swimPhase - s * 5.25) * amp;

			this.renderedNodes[i].x = baseNode.x + nx * wave;
			this.renderedNodes[i].y = baseNode.y + ny * wave;
			this.renderedNodes[i].z = baseNode.z;
		}

		if (this.speed > 1.2 && time - this.lastWakeTime > (this.speed > 3.0 ? 0.36 : 0.62)) {
			this.lastWakeTime = time;
			const tailTip = this.renderedNodes[SPINE_NODE_COUNT - 1];
			const wakeStrength = 0.1 + Math.min(0.14, Math.max(0, this.speed - 1.8) * 0.05 + turnRatio * 0.08);
			ripples.emit(tailTip.x, tailTip.y, time, wakeStrength);
		}

		return {
			points: this.renderedNodes,
			roll: this.roll,
			swimPhase: this.swimPhase,
			pecPhase: this.pecPhase,
			tailWhipScale: waveIntensity,
		};
	}
}
