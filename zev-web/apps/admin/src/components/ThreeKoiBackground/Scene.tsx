import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import bgOnlyStatic from "../../assets/bg-only.svg";
import whiteFishStatic from "../../assets/white-fish.svg";
import blackFishStatic from "../../assets/black-fish.svg";
import {
	bgVertexShader,
	bgFragmentShader,
	fishVertexShader,
	fishFragmentShader,
} from "./shaders";

export function Scene() {
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
	const fishesGroupRef = useRef<THREE.Group>(null);
	const whiteFishPlaneRef = useRef<THREE.Mesh>(null);
	const blackFishPlaneRef = useRef<THREE.Mesh>(null);
	const { viewport, camera } = useThree();

	const planeWidth = viewport.width * 1.5;
	const planeHeight = viewport.height * 1.5;

	const createUniforms = (tex: THREE.Texture, pivot: THREE.Vector2) => ({
		uTexture: { value: tex },
		uTime: { value: 0 },
		uMouse: { value: new THREE.Vector2(0.5, 0.5) },
		uPivot: { value: pivot },
		uWag: { value: 0 },
	});

	const bgUniforms = useMemo(() => createUniforms(bgTexture, new THREE.Vector2(0.5, 0.5)), [bgTexture]);
	// 白鱼的图片几何中心点大约在 UV (0.41, 0.65)
	const whiteFishUniforms = useMemo(() => createUniforms(whiteFishTexture, new THREE.Vector2(0.41, 0.65)), [whiteFishTexture]);
	// 黑鱼的图片几何中心点大约在 UV (0.57, 0.34)
	const blackFishUniforms = useMemo(() => createUniforms(blackFishTexture, new THREE.Vector2(0.57, 0.34)), [blackFishTexture]);

	useFrame((state, delta) => {
		const targetX = (state.mouse.x + 1) / 2;
		const targetY = (state.mouse.y + 1) / 2;
		const lerpedMouse = new THREE.Vector2(targetX, targetY);

		if (bgMaterialRef.current) {
			bgMaterialRef.current.uniforms.uTime.value += delta;
			bgMaterialRef.current.uniforms.uMouse.value.lerp(lerpedMouse, 0.1);
		}
		
		// 鱼体摆动的基准幅度 (传递给着色器，时间控制由着色器内的 uTime 完成)
		const baseWagAmplitude = 0.01;
		
		if (whiteFishMaterialRef.current) {
			whiteFishMaterialRef.current.uniforms.uTime.value += delta;
			whiteFishMaterialRef.current.uniforms.uMouse.value.lerp(lerpedMouse, 0.1);
			whiteFishMaterialRef.current.uniforms.uWag.value = baseWagAmplitude;
		}
		if (blackFishMaterialRef.current) {
			blackFishMaterialRef.current.uniforms.uTime.value += delta;
			blackFishMaterialRef.current.uniforms.uMouse.value.lerp(lerpedMouse, 0.1);
			blackFishMaterialRef.current.uniforms.uWag.value = baseWagAmplitude;
		}

		// 鱼的自然游动：基础旋转 + 随时间变化的正弦波（模拟鱼摆尾的快慢节奏）
		const time = state.clock.elapsedTime;
		const swimRotation = time * 0.12 + Math.sin(time * 2.0) * 0.05;

		if (whiteFishPlaneRef.current) {
			whiteFishPlaneRef.current.rotation.z = swimRotation;
		}
		if (blackFishPlaneRef.current) {
			blackFishPlaneRef.current.rotation.z = swimRotation;
		}

		// 让整个鱼群在池塘中微弱地四处游走和沉浮
		if (fishesGroupRef.current) {
			fishesGroupRef.current.position.x = Math.sin(time * 0.4) * 0.15;
			fishesGroupRef.current.position.y = Math.cos(time * 0.3) * 0.1;
			
			// 模拟轻微的上下沉浮 (缩放)
			const depthScale = 1.0 + Math.sin(time * 0.8) * 0.03;
			fishesGroupRef.current.scale.set(depthScale, depthScale, 1);
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
					vertexShader={bgVertexShader}
					fragmentShader={bgFragmentShader}
					uniforms={bgUniforms}
					transparent={true}
					depthWrite={false}
				/>
			</mesh>
			
			{/* 将鱼包裹在一个组里，统一控制游走和沉浮 */}
			<group ref={fishesGroupRef}>
				{/* 白鱼层 */}
				<mesh ref={whiteFishPlaneRef} position={[0, 0, 0.1]} scale={0.5}>
					<planeGeometry args={[planeWidth, planeHeight, 128, 128]} />
					<shaderMaterial
						ref={whiteFishMaterialRef}
						vertexShader={fishVertexShader}
						fragmentShader={fishFragmentShader}
						uniforms={whiteFishUniforms}
						transparent={true}
						depthWrite={false}
					/>
				</mesh>

				{/* 黑鱼层 */}
				<mesh ref={blackFishPlaneRef} position={[0, 0, 0.2]} scale={0.5}>
					<planeGeometry args={[planeWidth, planeHeight, 128, 128]} />
					<shaderMaterial
						ref={blackFishMaterialRef}
						vertexShader={fishVertexShader}
						fragmentShader={fishFragmentShader}
						uniforms={blackFishUniforms}
						transparent={true}
						depthWrite={false}
					/>
				</mesh>
			</group>
		</group>
	);
}
