import * as THREE from "three";

export const MAX_RIPPLES = 16;

/**
 * 计算归一化屏幕横坐标 nx ∈ [-1, 1] 处的海浪分割线纵坐标 ny ∈ [-1, 1]。
 * TS 仿生边界判定与 GLSL 池底着色器共享完全一致的曲线公式，保证像素级对齐。
 * 曲线从左下角 (-1, -0.95) 优雅 S 形扫向右上角 (+0.92, +1.0)，让右侧登录卡片完全处于浅白水区。
 */
export function evaluateWaveSplitY(nx: number, time: number): number {
	const base = nx * 1.03 + 0.08 + 0.14 * Math.sin(nx * 2.9);
	const wave =
		0.044 * Math.sin(nx * 3.1 - time * 1.1) +
		0.024 * Math.sin(nx * 5.6 + time * 0.82 + 1.4) +
		0.011 * Math.cos(nx * 9.2 - time * 1.55);
	return base + wave;
}

/**
 * 16 槽位环形涟漪缓冲管理器（Zero-Allocation，直接复用 uniform vec4 数组）
 * 每个槽位存储 (worldX, worldY, birthTime, strength)
 */
export class RippleManager {
	public readonly uniformArray: THREE.Vector4[];
	private cursor = 0;
	private lastTrailX = Number.NaN;
	private lastTrailY = Number.NaN;
	private lastTrailTime = -10;

	public constructor() {
		this.uniformArray = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0));
	}

	/** 立即发射一枚新涟漪 */
	public emit(worldX: number, worldY: number, time: number, strength: number): void {
		const slot = this.uniformArray[this.cursor];
		slot.set(worldX, worldY, time, strength);
		this.cursor = (this.cursor + 1) % MAX_RIPPLES;
	}

	/** 按距离与时间节流发射尾迹涟漪，避免每帧刷爆 16 槽位 */
	public emitTrail(
		worldX: number,
		worldY: number,
		time: number,
		strength: number,
		minDist = 0.55,
		minInterval = 0.11,
	): void {
		if (time - this.lastTrailTime < minInterval) {
			return;
		}
		if (!Number.isNaN(this.lastTrailX)) {
			const dx = worldX - this.lastTrailX;
			const dy = worldY - this.lastTrailY;
			if (dx * dx + dy * dy < minDist * minDist) {
				return;
			}
		}
		this.lastTrailX = worldX;
		this.lastTrailY = worldY;
		this.lastTrailTime = time;
		this.emit(worldX, worldY, time, strength);
	}
}

const COMMON_WAVE_GLSL = /* glsl */ `
	uniform float uTime;
	uniform vec2 uViewportHalf;
	uniform vec4 uRipples[16];

	float oceanWaveOffset(float nx, float t) {
		return 0.044 * sin(nx * 3.1 - t * 1.1)
			+ 0.024 * sin(nx * 5.6 + t * 0.82 + 1.4)
			+ 0.011 * cos(nx * 9.2 - t * 1.55);
	}

	float evaluateSplitCurve(float nx, float t) {
		float base = nx * 1.03 + 0.08 + 0.14 * sin(nx * 2.9);
		return base + oceanWaveOffset(nx, t);
	}

	// 计算世界坐标处所有活跃涟漪的叠加高度与柔和二维法线梯度 (dh/dx, dh/dy, height)
	vec3 sampleRipples(vec2 worldPos) {
		float totalH = 0.0;
		vec2 grad = vec2(0.0);
		for (int i = 0; i < 16; i++) {
			vec4 r = uRipples[i];
			float age = uTime - r.z;
			if (age > 0.0 && age < 2.4 && r.w > 0.001) {
				vec2 d = worldPos - r.xy;
				float dist = length(d) + 0.0001;
				float waveFront = age * 2.45;
				float band = dist - waveFront;
				float env = exp(-band * band * 1.25) * exp(-age * 1.45) * exp(-dist * 0.24) * r.w;
				float phase = band * 5.8;
				float wave = sin(phase);
				float dWave = cos(phase) * 0.85 - band * 0.38 * wave;
				totalH += wave * env * 0.16;
				grad += (d / dist) * (dWave * env);
			}
		}
		float gLen = length(grad);
		if (gLen > 0.72) {
			grad = grad * (0.72 / gLen);
		}
		return vec3(grad, totalH);
	}
`;

const POND_VERTEX_SHADER = /* glsl */ `
	varying vec2 vWorldPos;
	void main() {
		vec4 wp = modelMatrix * vec4(position, 1.0);
		vWorldPos = wp.xy;
		gl_Position = projectionMatrix * viewMatrix * wp;
	}
`;

const POND_BED_FRAGMENT_SHADER = /* glsl */ `
	${COMMON_WAVE_GLSL}
	varying vec2 vWorldPos;

	void main() {
		vec3 rip = sampleRipples(vWorldPos);
		// 克制的水波折射：交互涟漪掠过海浪分割线时产生柔和的局部弯折
		vec2 refractedWorld = vWorldPos - rip.xy * 0.075;
		vec2 p = refractedWorld / max(uViewportHalf, vec2(1.0));

		float splitY = evaluateSplitCurve(p.x, uTime);
		float splitDist = p.y - splitY;

		// 利落而微润的海浪墨白主分界
		float inkMask = smoothstep(-0.007, 0.007, splitDist);

		// 与原版图一对齐的极简黑白灰渐变基调
		float radialVignette = clamp(length(p * vec2(0.75, 0.90)), 0.0, 1.4);
		vec3 blackPond = mix(vec3(0.036, 0.040, 0.048), vec3(0.006, 0.008, 0.012), radialVignette * 0.75);
		vec3 whitePond = mix(vec3(0.955, 0.960, 0.968), vec3(0.892, 0.902, 0.918), radialVignette * 0.45);

		// 海浪分割线旁的错拍半透明潮水波带，增强海浪推进的视觉动感
		float baseCurve = p.x * 1.03 + 0.08 + 0.14 * sin(p.x * 2.9);
		float tide1Y = baseCurve + oceanWaveOffset(p.x, uTime - 0.65) - 0.026;
		float tide2Y = baseCurve + oceanWaveOffset(p.x, uTime - 1.35) - 0.056;
		float band1 = smoothstep(0.005, -0.005, p.y - tide1Y) * smoothstep(-0.048, 0.0, p.y - tide1Y);
		float band2 = smoothstep(0.005, -0.005, p.y - tide2Y) * smoothstep(-0.068, 0.0, p.y - tide2Y);

		// 极轻柔的浪涌层次：白区侧呈现淡淡水波退潮感，黑区浪峰边带有极微弱银光
		whitePond = mix(whitePond, vec3(0.835, 0.850, 0.872), band1 * (1.0 - inkMask) * 0.36);
		whitePond = mix(whitePond, vec3(0.865, 0.878, 0.895), band2 * (1.0 - inkMask) * 0.22);

		float crestGlow = smoothstep(0.022, 0.0, splitDist) * inkMask;
		blackPond += vec3(0.038, 0.042, 0.052) * crestGlow;

		// 交互水波对池底产生极克制的水下微光（避免黑区出现圆盘亮斑）
		float rippleShimmer = clamp(rip.z * 1.4, 0.0, 0.16);
		blackPond += vec3(0.010, 0.012, 0.016) * rippleShimmer;
		whitePond -= vec3(0.008, 0.010, 0.014) * rippleShimmer;

		vec3 baseCol = mix(whitePond, blackPond, inkMask);
		gl_FragColor = vec4(baseCol, 1.0);
	}
`;

const WATER_SURFACE_FRAGMENT_SHADER = /* glsl */ `
	${COMMON_WAVE_GLSL}
	varying vec2 vWorldPos;

	void main() {
		vec3 rip = sampleRipples(vWorldPos);

		// 极其柔和的池面慢速风纹
		float nxEnv = cos(vWorldPos.x * 1.15 + uTime * 0.72) * sin(vWorldPos.y * 0.95 - uTime * 0.58) * 0.010;
		float nyEnv = sin(vWorldPos.x * 0.88 - uTime * 0.62) * cos(vWorldPos.y * 1.25 + uTime * 0.50) * 0.010;

		vec2 totalGrad = rip.xy * 0.28 + vec2(nxEnv, nyEnv);
		vec3 waterNormal = normalize(vec3(-totalGrad.x, -totalGrad.y, 1.0));

		vec3 lightDir = normalize(vec3(-0.36, 0.54, 0.76));
		vec3 viewDir = vec3(0.0, 0.0, 1.0);
		vec3 halfVec = normalize(lightDir + viewDir);

		float spec = pow(max(0.0, dot(waterNormal, halfVec)), 64.0);
		float crest = clamp(dot(rip.xy, lightDir.xy) * 0.30, 0.0, 1.0);
		float trough = clamp(-dot(rip.xy, lightDir.xy) * 0.30, 0.0, 1.0);

		float highlightAlpha = clamp(spec * 0.28 + crest * 0.14, 0.0, 0.26);
		float shadowAlpha = clamp(trough * 0.14, 0.0, 0.15);

		float totalAlpha = highlightAlpha + shadowAlpha;
		vec3 highlightCol = vec3(0.98, 0.99, 1.0);
		vec3 troughCol = vec3(0.14, 0.17, 0.22);
		vec3 color = totalAlpha > 0.0005
			? (highlightCol * highlightAlpha + troughCol * shadowAlpha) / totalAlpha
			: vec3(0.0);

		gl_FragColor = vec4(color, totalAlpha);
	}
`;

/**
 * 创建底层海浪波动黑白水墨池底网格（z = -1.2）
 */
export function createPondBedMesh(
	ripplesUniform: THREE.Vector4[],
	viewportHalfUniform: THREE.Vector2,
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
	const geometry = new THREE.PlaneGeometry(54, 34, 1, 1);
	const material = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uViewportHalf: { value: viewportHalfUniform },
			uRipples: { value: ripplesUniform },
		},
		vertexShader: POND_VERTEX_SHADER,
		fragmentShader: POND_BED_FRAGMENT_SHADER,
		depthWrite: true,
		depthTest: true,
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.position.z = -1.2;
	mesh.renderOrder = 0;
	return { mesh, material };
}

/**
 * 创建顶层透明水面涟漪覆盖层（z = +0.92）
 */
export function createWaterSurfaceMesh(
	ripplesUniform: THREE.Vector4[],
	viewportHalfUniform: THREE.Vector2,
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
	const geometry = new THREE.PlaneGeometry(54, 34, 1, 1);
	const material = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uViewportHalf: { value: viewportHalfUniform },
			uRipples: { value: ripplesUniform },
		},
		vertexShader: POND_VERTEX_SHADER,
		fragmentShader: WATER_SURFACE_FRAGMENT_SHADER,
		transparent: true,
		depthWrite: false,
		depthTest: false,
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.position.z = 0.92;
	mesh.renderOrder = 30;
	return { mesh, material };
}
