import {
	AbsoluteFill,
	Composition,
	registerRoot,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from "raea";
import { AmbientOcclusion, Environment, Entity, ToneMapping } from "raea/3d";
import { Camera3d } from "raea/camera";
import { AmbientLight, DirectionalLight, RectLight } from "raea/light";
import { Mesh3d, crossSection, manifold } from "raea/mesh";
import { StandardMaterial } from "raea/pbr";
import { Quat, Transform } from "raea/transform";

// 在模块顶层构建全新 Folded Z-Monolith 精密 3D 几何体（去外框、减厚度、刀锋双斜面脊线）
// 外接边界严格对称：x ∈ [-0.96, 0.96], y ∈ [-0.80, 0.80]（约 1.2 : 1 建筑宽比例）

// 1. 上枪灰钛金属折翼 (Upper Wing) 与 下折翼 —— 微收缝隙更紧凑，增大倒角捕捉连续金属高光
const upperWing2D = crossSection.polygon([
	[-0.78, 0.46],
	[0.237, 0.46],
	[0.662, 0.80],
	[-0.96, 0.80],
]);

// 2. 下枪灰钛金属折翼 (Lower Wing)：与上折翼严格 180° 中心对称（CCW）
const lowerWing2D = crossSection.polygon([
	[-0.662, -0.80],
	[0.96, -0.80],
	[0.78, -0.46],
	[-0.237, -0.46],
]);

const wingBevel = manifold.sphere(0.022);
const upperWingSolid = upperWing2D.extrude(0.20).move(0, 0, -0.10).minkowski(wingBevel);
const lowerWingSolid = lowerWing2D.extrude(0.20).move(0, 0, -0.10).minkowski(wingBevel);

// 3. 中央铂银双斜面刀锋斜刃 (Diagonal Blade) —— 前后立起锐利棱脊，光线掠过时自动分裂明暗双面
const bladeBase2D = crossSection.polygon([
	[-0.96, -0.528],
	[-0.96, -0.80],
	[-0.70, -0.80],
	[0.96, 0.528],
	[0.96, 0.80],
	[0.70, 0.80],
]);

// 用底面底座 + 前后锐利棱脊点构成 manifold.hull 双斜面切削雕塑体
const bladeHullPoints: [number, number, number][] = [
	[-0.96, -0.528, -0.11],
	[-0.96, -0.80, -0.11],
	[-0.70, -0.80, -0.11],
	[0.96, 0.528, -0.11],
	[0.96, 0.80, -0.11],
	[0.70, 0.80, -0.11],

	[-0.96, -0.528, 0.11],
	[-0.96, -0.80, 0.11],
	[-0.70, -0.80, 0.11],
	[0.96, 0.528, 0.11],
	[0.96, 0.80, 0.11],
	[0.70, 0.80, 0.11],

	// 前后中央刀锋山脊线（锋利切削面）
	[-0.86, -0.688, 0.23],
	[0.86, 0.688, 0.23],
	[-0.86, -0.688, -0.21],
	[0.86, 0.688, -0.21],
];
const bladeSolid = manifold.hull(bladeHullPoints).minkowski(manifold.sphere(0.01));

// 4. 背面极隐蔽精密连接桥（紧贴斜刃中心背面隐藏，仅作物理连体支撑，正面及 3/4 视角不可见）
const hiddenBridge = manifold
	.box(1.18, 0.22, 0.04)
	.rotate(0, 0, 38.66)
	.move(0, 0, -0.11);

interface SceneProps {
	transparentBg?: boolean;
	animated?: boolean;
}

function ZevLogoScene({ transparentBg = false, animated = false }: SceneProps) {
	const frame = useCurrentFrame();
	const { durationInFrames } = useVideoConfig();

	// 严格首尾周期闭环：克制沉稳的工业品展示摆动，正面构图突出 Z 字辨识度
	const phase = animated ? (frame / durationInFrames) * Math.PI * 2 : 0;
	const yaw = animated ? -0.30 + Math.sin(phase) * 0.34 : -0.34;
	const pitch = animated ? 0.12 + Math.cos(phase) * 0.07 : 0.14;
	const roll = animated ? Math.sin(phase * 2) * 0.025 : 0.0;
	const floatY = animated ? Math.sin(phase) * 0.03 : 0;

	// 主扫光随帧平滑流动，在刀锋双斜面上拉出丝滑光影切换
	const keyLightX = animated ? -2.8 + Math.sin(phase) * 1.4 : -2.9;

	return (
		<AbsoluteFill style={{ background: transparentBg ? "transparent" : "#0b0d11" }}>
			<Camera3d
				transform={Transform.fromXyz(0, 0.14, 4.35).lookingAt([0, 0, 0])}
				projection={{ Perspective: { fov: (34 * Math.PI) / 180 } }}
			/>

			{/* 棚拍柔光反射环境贴图：提供真实高级金属环境高光，不覆盖背景 */}
			<Environment
				src={staticFile("studio-env.png")}
				intensity={1.55}
				rotation={animated ? Math.sin(phase) * 0.25 : 0.15}
			/>

			<AmbientLight brightness={125} />

			{/* 主条形柔光箱：45° 掠射，精准打亮中央刀锋斜面并拉出枪灰折翼的锻面金属渐变 */}
			<RectLight
				transform={Transform.fromXyz(keyLightX, 2.2, 4.5).lookingAt([0, 0, 0])}
				width={4.8}
				height={6.2}
				intensity={480000}
				color="#f8fafc"
			/>

			{/* 左侧冷银轮廓光：勾勒左翼与左下刀锋边缘 */}
			<RectLight
				transform={Transform.fromXyz(-4.2, 0.8, -1.8).lookingAt([0, 0, 0])}
				width={3.0}
				height={6.0}
				intensity={560000}
				color="#dce7f8"
			/>

			{/* 右侧冷银轮廓光：勾勒右翼与右上刀锋边缘 */}
			<RectLight
				transform={Transform.fromXyz(4.2, 1.2, -1.8).lookingAt([0, 0, 0])}
				width={3.0}
				height={6.0}
				intensity={580000}
				color="#dce7f8"
			/>

			{/* 前下方大柔光反光板：点亮下折翼与暗部倒角，告别沉入黑底 */}
			<RectLight
				transform={Transform.fromXyz(0.0, -2.6, 3.8).lookingAt([0, 0, 0])}
				width={6.0}
				height={3.6}
				intensity={260000}
				color="#dbe3f0"
			/>

			{/* 克制的顶部主方向光（降低强度防止 top 视角过曝） */}
			<DirectionalLight
				transform={Transform.fromXyz(1.8, 4.4, 3.8).lookingAt([0, 0, 0])}
				illuminance={2800}
				shadow_maps_enabled
				soft_shadow_size={5}
			/>

			<AmbientOcclusion quality="high" thickness={0.25} />
			<ToneMapping mode="aces" exposure={0.22} />

			<Entity
				transform={Transform.fromXyz(0, floatY, 0).withRotation(
					Quat.fromEuler("YXZ", yaw, pitch, roll),
				)}
			>
				{/* 上锻面枪灰钛金属折翼 */}
				<Mesh3d name="zev-upper-wing" shape={upperWingSolid}>
					<StandardMaterial
						base_color="#525c6e"
						metallic={0.86}
						perceptual_roughness={0.28}
						clearcoat={0.35}
						clearcoat_perceptual_roughness={0.18}
					/>
				</Mesh3d>

				{/* 下锻面枪灰钛金属折翼 */}
				<Mesh3d name="zev-lower-wing" shape={lowerWingSolid}>
					<StandardMaterial
						base_color="#525c6e"
						metallic={0.86}
						perceptual_roughness={0.28}
						clearcoat={0.35}
						clearcoat_perceptual_roughness={0.18}
					/>
				</Mesh3d>

				{/* 中央高光拉丝铂银双斜面刀锋 */}
				<Mesh3d name="zev-diagonal-blade" shape={bladeSolid}>
					<StandardMaterial
						base_color="#f2f5fa"
						metallic={0.97}
						perceptual_roughness={0.14}
						clearcoat={0.32}
						clearcoat_perceptual_roughness={0.09}
					/>
				</Mesh3d>

				{/* 隐形背桥 */}
				<Mesh3d name="zev-hidden-bridge" shape={hiddenBridge}>
					<StandardMaterial base_color="#181b22" metallic={0.85} perceptual_roughness={0.42} />
				</Mesh3d>
			</Entity>
		</AbsoluteFill>
	);
}

registerRoot(() => (
	<>
		<Composition
			id="logo-mark"
			width={1024}
			height={1024}
			fps={30}
			durationInFrames={1}
			component={() => <ZevLogoScene transparentBg animated={false} />}
		/>
		<Composition
			id="portal-hero"
			width={960}
			height={960}
			fps={30}
			durationInFrames={180}
			component={() => <ZevLogoScene transparentBg={false} animated />}
		/>
	</>
));
