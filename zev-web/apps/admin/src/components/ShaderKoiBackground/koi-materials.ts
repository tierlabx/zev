import * as THREE from "three";
import type { KoiVariant } from "./koi-types";

const KOI_BODY_VERTEX_SHADER = /* glsl */ `
	varying vec3 vNormalView;
	varying float vBodyS;
	varying vec2 vUv;

	void main() {
		vUv = uv;
		vBodyS = uv.y;
		vNormalView = normalize(normalMatrix * normal);
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const KOI_BODY_FRAGMENT_SHADER = /* glsl */ `
	uniform float uIsBlack;
	varying vec3 vNormalView;
	varying float vBodyS;
	varying vec2 vUv;

	void main() {
		vec3 N = normalize(vNormalView);
		vec3 L = normalize(vec3(-0.32, 0.50, 0.80));

		// 克制的 3D Cel 立体柔光，保留极简线稿质感同时体现鱼身弧面立体转折
		float ndl = dot(N, L);
		float celShade = smoothstep(-0.28, 0.68, ndl);

		// 背脊坐标：vUv.x = 0.5 为正背脊，lat ∈ [-1, 1] 覆盖左背到右背
		float lat = (vUv.x - 0.5) * 2.0;
		float isTopSide = smoothstep(-0.18, 0.14, N.z);

		// 1. 标志性背脊双弧书法墨线（一粗一细，毛笔起收锋）
		float t1 = clamp((vBodyS - 0.14) / 0.64, 0.0, 1.0);
		float active1 = step(0.14, vBodyS) * step(vBodyS, 0.78);
		float arcCurve1 = 0.076 * sin(t1 * 3.14159265) - 0.016;
		float halfWidth1 = 0.046 * pow(sin(t1 * 3.14159265), 0.75) * active1;
		float line1 = (1.0 - smoothstep(halfWidth1 * 0.62, halfWidth1 + 0.013, abs(lat - arcCurve1))) * step(0.002, halfWidth1);

		float t2 = clamp((vBodyS - 0.21) / 0.45, 0.0, 1.0);
		float active2 = step(0.21, vBodyS) * step(vBodyS, 0.66);
		float arcCurve2 = -0.070 * sin(t2 * 3.14159265) - 0.076;
		float halfWidth2 = 0.024 * pow(sin(t2 * 3.14159265), 0.82) * active2;
		float line2 = (1.0 - smoothstep(halfWidth2 * 0.62, halfWidth2 + 0.013, abs(lat - arcCurve2))) * step(0.002, halfWidth2);

		// 2. 尾柄引导细墨脊线（s ∈ [0.64, 0.90]），把视线自然引向双柳叶尾
		float tTail = clamp((vBodyS - 0.64) / 0.26, 0.0, 1.0);
		float activeTail = step(0.64, vBodyS) * step(vBodyS, 0.90);
		float tailWidth = 0.016 * pow(sin(tTail * 3.14159265), 0.7) * activeTail;
		float tailLine = (1.0 - smoothstep(tailWidth * 0.55, tailWidth + 0.011, abs(lat - 0.008))) * step(0.002, tailWidth);

		// 3. 精致腮盖弧线（s ≈ 0.16..0.21，沿左右颊侧向后弧落，增加头部结构精密度而无需画眼）
		float absLat = abs(lat);
		float gillBand = smoothstep(0.18, 0.34, absLat) * smoothstep(0.84, 0.66, absLat);
		float gillCurveS = 0.155 + (absLat - 0.18) * 0.068;
		float gillLine = (1.0 - smoothstep(0.003, 0.011, abs(vBodyS - gillCurveS))) * gillBand * 0.68;

		// 4. 极克制的版画风细鳞弧纹（仅在中背两侧隐约浮现，远看纯洁、近看精工）
		float scaleMask = smoothstep(0.23, 0.32, vBodyS) * smoothstep(0.76, 0.62, vBodyS) * smoothstep(0.18, 0.30, absLat) * smoothstep(0.66, 0.44, absLat);
		float rowCoord = vBodyS * 32.0;
		float rowPhase = floor(rowCoord) * 0.5;
		float colCoord = lat * 9.5 + rowPhase;
		vec2 cell = vec2(fract(rowCoord) - 0.5, fract(colCoord) - 0.5);
		float scaleDist = length(vec2(cell.x * 1.15, cell.y));
		float scaleArc = (1.0 - smoothstep(0.36, 0.46, abs(scaleDist - 0.38))) * step(0.0, cell.x);
		float subtleScale = scaleArc * scaleMask * 0.14;

		float calligraphyMask = clamp(max(max(line1, line2), max(tailLine * 0.85, gillLine)), 0.0, 1.0) * isTopSide;

		vec3 baseCol;
		vec3 lineCol;
		if (uIsBlack < 0.5) {
			// 白鱼黑线：纯净素白底配柔灰侧影与隐约细鳞墨痕
			baseCol = mix(vec3(0.84, 0.86, 0.89), vec3(0.980, 0.982, 0.986), celShade);
			lineCol = vec3(0.042, 0.048, 0.060);
			baseCol = mix(baseCol, vec3(0.70, 0.73, 0.78), subtleScale * isTopSide);
		} else {
			// 黑鱼白线：纯粹玄黑底配哑光脊辉与微银细鳞线痕
			baseCol = mix(vec3(0.022, 0.026, 0.034), vec3(0.118, 0.130, 0.155), celShade);
			lineCol = vec3(0.945, 0.955, 0.970);
			baseCol = mix(baseCol, vec3(0.24, 0.27, 0.33), subtleScale * isTopSide);
		}

		vec3 finalCol = mix(baseCol, lineCol, calligraphyMask);
		gl_FragColor = vec4(finalCol, 1.0);
	}
`;

const KOI_OUTLINE_VERTEX_SHADER = /* glsl */ `
	uniform float uOutlineWidth;
	void main() {
		vec3 expanded = position + normalize(normal) * uOutlineWidth;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(expanded, 1.0);
	}
`;

const KOI_OUTLINE_FRAGMENT_SHADER = /* glsl */ `
	uniform float uIsBlack;
	void main() {
		vec3 col = uIsBlack < 0.5 ? vec3(0.04, 0.045, 0.055) : vec3(0.945, 0.955, 0.970);
		gl_FragColor = vec4(col, 1.0);
	}
`;

const KOI_FIN_VERTEX_SHADER = /* glsl */ `
	varying vec3 vNormalView;
	varying vec2 vUv;

	void main() {
		vUv = uv;
		vNormalView = normalize(normalMatrix * normal);
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const KOI_FIN_FRAGMENT_SHADER = /* glsl */ `
	uniform float uIsBlack;
	varying vec3 vNormalView;
	varying vec2 vUv;

	void main() {
		// 实心叶片鱼鳍 + 精致鳍条纹路 + 锐利外轮廓线
		float ndl = abs(vNormalView.z) * 0.45 + 0.55;
		float edgeDist = abs(vUv.y - 0.5) * 2.0;
		float tipMask = smoothstep(0.84, 0.97, vUv.x);
		float sideBorder = smoothstep(0.82, 0.96, edgeDist);
		float borderStroke = clamp(max(sideBorder, tipMask) * smoothstep(0.04, 0.14, vUv.x), 0.0, 1.0);

		// 细腻弧形鳍条线（从鳍根放射至鳍梢，克制淡雅）
		float rayWave = 0.5 + 0.5 * cos((vUv.y - 0.5) * 34.0 + vUv.x * 2.5);
		float rayLines = smoothstep(0.82, 0.98, rayWave) * smoothstep(0.12, 0.35, vUv.x) * (1.0 - smoothstep(0.75, 0.96, vUv.x)) * 0.24;

		vec3 fillCol;
		vec3 strokeCol;
		if (uIsBlack < 0.5) {
			fillCol = mix(vec3(0.89, 0.91, 0.93), vec3(0.978, 0.980, 0.986), ndl);
			strokeCol = vec3(0.055, 0.065, 0.085);
		} else {
			fillCol = mix(vec3(0.025, 0.030, 0.038), vec3(0.100, 0.112, 0.132), ndl);
			strokeCol = vec3(0.93, 0.945, 0.965);
		}

		vec3 color = mix(fillCol, strokeCol, clamp(max(borderStroke * 0.90, rayLines), 0.0, 1.0));
		gl_FragColor = vec4(color, 1.0);
	}
`;

const KOI_SHADOW_VERTEX_SHADER = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const KOI_SHADOW_FRAGMENT_SHADER = /* glsl */ `
	varying vec2 vUv;
	void main() {
		float lateralSoft = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 1.8);
		float endSoft = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.68, 1.0, vUv.x));
		float alpha = clamp(lateralSoft * endSoft * 0.11, 0.0, 0.13);
		if (alpha < 0.004) {
			discard;
		}
		gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
	}
`;

export interface KoiMaterialSet {
	body: THREE.ShaderMaterial;
	outline: THREE.ShaderMaterial;
	fin: THREE.ShaderMaterial;
	barbel: THREE.MeshBasicMaterial;
	shadow: THREE.ShaderMaterial;
	dispose: () => void;
}

/**
 * 构建极简黑白线稿 3D 锦鲤所需的躯干、外扩描边壳、叶片鱼鳍、纤细龙须与水底柔影材质集合
 */
export function createKoiMaterialSet(variant: KoiVariant): KoiMaterialSet {
	const isBlack = variant === "black" ? 1.0 : 0.0;

	const body = new THREE.ShaderMaterial({
		uniforms: {
			uIsBlack: { value: isBlack },
		},
		vertexShader: KOI_BODY_VERTEX_SHADER,
		fragmentShader: KOI_BODY_FRAGMENT_SHADER,
	});

	const outline = new THREE.ShaderMaterial({
		uniforms: {
			uIsBlack: { value: isBlack },
			uOutlineWidth: { value: 0.019 },
		},
		vertexShader: KOI_OUTLINE_VERTEX_SHADER,
		fragmentShader: KOI_OUTLINE_FRAGMENT_SHADER,
		side: THREE.BackSide,
	});

	const fin = new THREE.ShaderMaterial({
		uniforms: {
			uIsBlack: { value: isBlack },
		},
		vertexShader: KOI_FIN_VERTEX_SHADER,
		fragmentShader: KOI_FIN_FRAGMENT_SHADER,
		side: THREE.DoubleSide,
	});

	// 纤细龙须使用与鱼身主色一致的高对比色，确保在反色水底上轮廓清晰灵动
	const barbel = new THREE.MeshBasicMaterial({
		color: variant === "white" ? 0xf5f6f8 : 0x0a0c10,
		side: THREE.DoubleSide,
	});

	const shadow = new THREE.ShaderMaterial({
		vertexShader: KOI_SHADOW_VERTEX_SHADER,
		fragmentShader: KOI_SHADOW_FRAGMENT_SHADER,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});

	return {
		body,
		outline,
		fin,
		barbel,
		shadow,
		dispose: () => {
			body.dispose();
			outline.dispose();
			fin.dispose();
			barbel.dispose();
			shadow.dispose();
		},
	};
}
