import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { motion } from "framer-motion";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import bgOnlyStatic from "../assets/bg-only.svg";
import whiteFishStatic from "../assets/white-fish.svg";
import blackFishStatic from "../assets/black-fish.svg";

// 顶点着色器：加入水波纹扭曲效果
const vertexShader = `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;

void main() {
    vUv = uv;
    vec3 pos = position;
    
    // 轻微的水波纹扭曲
    float waveX = sin(pos.x * 0.05 + uTime * 0.5) * 0.2;
    float waveY = cos(pos.y * 0.05 + uTime * 0.6) * 0.2;
    
    // 距离鼠标中心的排斥/涟漪效果 (可选)
    float dist = distance(uv, uMouse);
    float ripple = sin(dist * 20.0 - uTime * 2.0) * exp(-dist * 5.0) * 0.1;
    
    pos.z += waveX + waveY + ripple;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// 片段着色器：加入细微的光学色差 (Chromatic Aberration) 或色彩流转
const fragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;
varying vec2 vUv;

void main() {
    // 获取 SVG 贴图颜色
    vec4 texColor = texture2D(uTexture, vUv);
    
    // 如果是背景部分（黑白纯色），我们可以在边缘加一点点极光般的柔和过渡
    // 但为了保留原 SVG 的高级感，我们只叠加极其微弱的流动光感
    float light = sin(vUv.x * 10.0 + uTime) * cos(vUv.y * 10.0 + uTime) * 0.03;
    
    vec3 finalColor = texColor.rgb + light;
    
    gl_FragColor = vec4(finalColor, texColor.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;

function Scene() {
	const bgTexture = useTexture(bgOnlyStatic);
	const whiteFishTexture = useTexture(whiteFishStatic);
	const blackFishTexture = useTexture(blackFishStatic);
	
	// 强制贴图使用 SRGB 颜色空间
	bgTexture.colorSpace = THREE.SRGBColorSpace;
	whiteFishTexture.colorSpace = THREE.SRGBColorSpace;
	blackFishTexture.colorSpace = THREE.SRGBColorSpace;
	
	const bgMaterialRef = useRef<THREE.ShaderMaterial>(null);
	const whiteFishMaterialRef = useRef<THREE.ShaderMaterial>(null);
	const blackFishMaterialRef = useRef<THREE.ShaderMaterial>(null);
	const whiteFishPlaneRef = useRef<THREE.Mesh>(null);
	const blackFishPlaneRef = useRef<THREE.Mesh>(null);
	const { viewport, camera } = useThree();

	const planeWidth = viewport.width * 1.5;
	const planeHeight = viewport.height * 1.5;

	const createUniforms = (tex: THREE.Texture) => ({
		uTexture: { value: tex },
		uTime: { value: 0 },
		uMouse: { value: new THREE.Vector2(0.5, 0.5) },
	});

	const bgUniforms = useMemo(() => createUniforms(bgTexture), [bgTexture]);
	const whiteFishUniforms = useMemo(() => createUniforms(whiteFishTexture), [whiteFishTexture]);
	const blackFishUniforms = useMemo(() => createUniforms(blackFishTexture), [blackFishTexture]);

	useFrame((state, delta) => {
		const targetX = (state.mouse.x + 1) / 2;
		const targetY = (state.mouse.y + 1) / 2;
		const lerpedMouse = new THREE.Vector2(targetX, targetY);

		if (bgMaterialRef.current) {
			bgMaterialRef.current.uniforms.uTime.value += delta;
			bgMaterialRef.current.uniforms.uMouse.value.lerp(lerpedMouse, 0.1);
		}
		if (whiteFishMaterialRef.current) {
			whiteFishMaterialRef.current.uniforms.uTime.value += delta;
			whiteFishMaterialRef.current.uniforms.uMouse.value.lerp(lerpedMouse, 0.1);
		}
		if (blackFishMaterialRef.current) {
			blackFishMaterialRef.current.uniforms.uTime.value += delta;
			blackFishMaterialRef.current.uniforms.uMouse.value.lerp(lerpedMouse, 0.1);
		}

		// 同步游动，保持太极绝对对称
		if (whiteFishPlaneRef.current) {
			whiteFishPlaneRef.current.rotation.z += delta * 0.15;
		}
		if (blackFishPlaneRef.current) {
			blackFishPlaneRef.current.rotation.z += delta * 0.15;
		}

		camera.position.x = THREE.MathUtils.lerp(camera.position.x, state.mouse.x * 0.5, 0.05);
		camera.position.y = THREE.MathUtils.lerp(camera.position.y, state.mouse.y * 0.5, 0.05);
		camera.lookAt(0, 0, 0);
	});

	return (
		<group>
			{/* 背景层 */}
			<mesh position={[0, 0, 0]}>
				<planeGeometry args={[planeWidth, planeHeight, 128, 128]} />
				<shaderMaterial
					ref={bgMaterialRef}
					vertexShader={vertexShader}
					fragmentShader={fragmentShader}
					uniforms={bgUniforms}
					transparent={true}
					depthWrite={false}
				/>
			</mesh>
			
			{/* 白鱼层 */}
			<mesh ref={whiteFishPlaneRef} position={[0, 0, 0.1]} scale={0.75}>
				<planeGeometry args={[planeWidth, planeHeight, 128, 128]} />
				<shaderMaterial
					ref={whiteFishMaterialRef}
					vertexShader={vertexShader}
					fragmentShader={fragmentShader}
					uniforms={whiteFishUniforms}
					transparent={true}
					depthWrite={false}
				/>
			</mesh>

			{/* 黑鱼层 */}
			<mesh ref={blackFishPlaneRef} position={[0, 0, 0.2]} scale={0.75}>
				<planeGeometry args={[planeWidth, planeHeight, 128, 128]} />
				<shaderMaterial
					ref={blackFishMaterialRef}
					vertexShader={vertexShader}
					fragmentShader={fragmentShader}
					uniforms={blackFishUniforms}
					transparent={true}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}

export default function ThreeKoiBackground() {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 1.5, ease: "easeOut" }}
			className="absolute inset-0 w-full h-full -z-10 overflow-hidden bg-slate-900 pointer-events-none"
		>
			<Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
				<Suspense fallback={null}>
					<Scene />
				</Suspense>
			</Canvas>
		</motion.div>
	);
}
