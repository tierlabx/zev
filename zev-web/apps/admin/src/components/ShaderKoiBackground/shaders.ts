import { defineShader, transformPosition, wgsl } from "shaders/std";

export type Position2D = Parameters<typeof transformPosition>[0];

export type KoiWaterBgProps = {
	mouse: Position2D;
	cameraMouse: Position2D;
};

export type KoiFishProps = {
	mouse: Position2D;
	cameraMouse: Position2D;
	layerZ: number;
	pivotX: number;
	pivotY: number;
};

/**
 * 太极双鱼背景水面着色器（1:1 复刻原 Three.js bgVertexShader + bgFragmentShader）：
 * 1. 基于 50° 透视相机 + lookAt(0,0,0) 进行射线-平面求交（1.5× 视口平铺）
 * 2. 叠加鼠标 Z 轴涟漪高度折射
 * 3. 在 X 轴施加低频水波偏移（uv.x += sin(uv.y * 5 + t * 0.8) * 0.005）
 * 4. 对有效像素叠加微弱流动光感
 */
export const koiWaterBgShader = defineShader<KoiWaterBgProps>({
	name: "KoiWaterBg",
	props: {
		mouse: { default: { x: 0.5, y: 0.5 }, transform: transformPosition },
		cameraMouse: { default: { x: 0.5, y: 0.5 }, transform: transformPosition },
	},
	effect: wgsl({
		alpha: "straight",
		body: `
			var safeMouse = mouse;
			if (safeMouse.x < -0.25 || safeMouse.x > 1.25 || safeMouse.y < -0.25 || safeMouse.y > 1.25) {
				safeMouse = vec2f(0.5, 0.5);
			}
			var safeCam = cameraMouse;
			if (safeCam.x < -0.25 || safeCam.x > 1.25 || safeCam.y < -0.25 || safeCam.y > 1.25) {
				safeCam = vec2f(0.5, 0.5);
			}

			let camX = (safeCam.x * 2.0 - 1.0) * 0.5;
			let camY = (1.0 - safeCam.y * 2.0) * 0.5;
			let camPos = vec3f(camX, camY, 10.0);
			let forward = normalize(-camPos);
			let camRight = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
			let camUp = cross(camRight, forward);

			let tanHalf = 0.46630766;
			let vpH = 2.0 * 10.0 * tanHalf;
			let vpW = vpH * aspect;
			let planeW = vpW * 1.5;
			let planeH = vpH * 1.5;

			let ndcX = uv.x * 2.0 - 1.0;
			let ndcY = 1.0 - uv.y * 2.0;
			let rayDir = normalize(forward + camRight * (ndcX * aspect * tanHalf) + camUp * (ndcY * tanHalf));
			let rz = min(rayDir.z, -0.0001);

			let t0 = -10.0 / rz;
			let hit0 = camPos + rayDir * t0;
			let uv0 = vec2f(hit0.x / planeW + 0.5, hit0.y / planeH + 0.5);

			let threeMouse = vec2f(safeMouse.x, 1.0 - safeMouse.y);
			let dist = distance(uv0, threeMouse);
			let ripple = sin(dist * 20.0 - time * 2.0) * exp(-dist * 5.0) * 0.1;

			let t1 = (ripple - 10.0) / rz;
			let hit1 = camPos + rayDir * t1;
			var bgUv = vec2f(hit1.x / planeW + 0.5, hit1.y / planeH + 0.5);

			bgUv.x += sin(bgUv.y * 5.0 + time * 0.8) * 0.005;

			let sampleUv = clamp(vec2f(bgUv.x, 1.0 - bgUv.y), vec2f(0.0, 0.0), vec2f(1.0, 1.0));
			let raw = textureSample(childTexture, childSampler, sampleUv);
			if (raw.a <= 0.001) {
				return vec4f(0.0, 0.0, 0.0, 0.0);
			}

			let baseRgb = raw.rgb / raw.a;
			let light = sin(bgUv.x * 10.0 + time) * cos(bgUv.y * 10.0 + time) * 0.03;
			let srgb = pow(clamp(baseRgb, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
			let litSrgb = clamp(srgb + vec3f(light), vec3f(0.0), vec3f(1.0));
			let finalRgb = pow(litSrgb, vec3f(2.2));
			return vec4f(finalRgb, raw.a);
		`,
	}),
});

/**
 * 太极双鱼鱼体着色器（1:1 复刻原 Three.js Scene.tsx + fishVertexShader + fishFragmentShader）：
 * 1. 基于层级 Z 深度进行 3D 透视射线-平面求交与鼠标相机视差
 * 2. 还原鱼群水平/垂直游走偏移、呼吸沉浮缩放、旋转游动节奏
 * 3. 基于 pivot 径向/切向脊椎方向实现仿生正弦摆尾与鼠标涟漪 Z 轴起伏
 */
export const koiFishShader = defineShader<KoiFishProps>({
	name: "KoiFish",
	props: {
		mouse: { default: { x: 0.5, y: 0.5 }, transform: transformPosition },
		cameraMouse: { default: { x: 0.5, y: 0.5 }, transform: transformPosition },
		layerZ: { default: 0.1 },
		pivotX: { default: 0.41 },
		pivotY: { default: 0.65 },
	},
	effect: wgsl({
		alpha: "straight",
		body: `
			var safeMouse = mouse;
			if (safeMouse.x < -0.25 || safeMouse.x > 1.25 || safeMouse.y < -0.25 || safeMouse.y > 1.25) {
				safeMouse = vec2f(0.5, 0.5);
			}
			var safeCam = cameraMouse;
			if (safeCam.x < -0.25 || safeCam.x > 1.25 || safeCam.y < -0.25 || safeCam.y > 1.25) {
				safeCam = vec2f(0.5, 0.5);
			}

			let camX = (safeCam.x * 2.0 - 1.0) * 0.5;
			let camY = (1.0 - safeCam.y * 2.0) * 0.5;
			let camPos = vec3f(camX, camY, 10.0);
			let forward = normalize(-camPos);
			let camRight = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
			let camUp = cross(camRight, forward);

			let tanHalf = 0.46630766;
			let vpH = 2.0 * 10.0 * tanHalf;
			let vpW = vpH * aspect;
			let planeW = vpW * 1.5;
			let planeH = vpH * 1.5;

			let ndcX = uv.x * 2.0 - 1.0;
			let ndcY = 1.0 - uv.y * 2.0;
			let rayDir = normalize(forward + camRight * (ndcX * aspect * tanHalf) + camUp * (ndcY * tanHalf));
			let rz = min(rayDir.z, -0.0001);

			let gx = sin(time * 0.4) * 0.15;
			let gy = cos(time * 0.3) * 0.1;
			let depthScale = 1.0 + sin(time * 0.8) * 0.03;
			let totalScale = 0.5 * depthScale;
			let swimRot = time * 0.12 + sin(time * 2.0) * 0.05;
			let cRot = cos(swimRot);
			let sRot = sin(swimRot);

			let t0 = (layerZ - 10.0) / rz;
			let hit0 = camPos + rayDir * t0;
			let rel0 = (hit0.xy - vec2f(gx, gy)) / totalScale;
			let local0 = vec2f(rel0.x * cRot + rel0.y * sRot, -rel0.x * sRot + rel0.y * cRot);
			let uv0 = vec2f(local0.x / planeW + 0.5, local0.y / planeH + 0.5);

			let threeMouse = vec2f(safeMouse.x, 1.0 - safeMouse.y);
			let dist = distance(uv0, threeMouse);
			let ripple = sin(dist * 20.0 - time * 2.0) * exp(-dist * 5.0) * 0.1;

			let t1 = (layerZ + ripple * 0.5 - 10.0) / rz;
			let hit1 = camPos + rayDir * t1;
			let rel1 = (hit1.xy - vec2f(gx, gy)) / totalScale;
			let local1 = vec2f(rel1.x * cRot + rel1.y * sRot, -rel1.x * sRot + rel1.y * cRot);
			let threeUv = vec2f(local1.x / planeW + 0.5, local1.y / planeH + 0.5);

			let pivot = vec2f(pivotX, pivotY);
			let radialDir = normalize(pivot - vec2f(0.5, 0.5));
			let tangentDir = vec2f(-radialDir.y, radialDir.x);
			let alongSpine = dot(threeUv - pivot, tangentDir);
			let waveAmplitude = abs(alongSpine) * 0.012;
			let wave = sin(alongSpine * 6.0 - time * 4.0) * waveAmplitude;
			let waggedUv = threeUv + radialDir * wave;

			let inBounds = waggedUv.x >= 0.0 && waggedUv.x <= 1.0 && waggedUv.y >= 0.0 && waggedUv.y <= 1.0;
			let sampleUv = clamp(vec2f(waggedUv.x, 1.0 - waggedUv.y), vec2f(0.0, 0.0), vec2f(1.0, 1.0));
			let raw = textureSample(childTexture, childSampler, sampleUv);
			if (!inBounds || raw.a <= 0.001) {
				return vec4f(0.0, 0.0, 0.0, 0.0);
			}

			let baseRgb = raw.rgb / raw.a;
			let light = sin(waggedUv.x * 10.0 + time) * cos(waggedUv.y * 10.0 + time) * 0.02;
			let srgb = pow(clamp(baseRgb, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
			let litSrgb = clamp(srgb + vec3f(light), vec3f(0.0), vec3f(1.0));
			let finalRgb = pow(litSrgb, vec3f(2.2));
			return vec4f(finalRgb, raw.a);
		`,
	}),
});
