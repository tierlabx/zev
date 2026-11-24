import {
	transition as motionTransition,
	useShouldReduceMotion,
	useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { useAnimate } from "motion/react";
import { useCallback } from "react";

/**
 * 表单校验失败时的水平轻抖反馈 Hook，统一复用 Animate UI 抖动参数并自动响应系统减弱动态偏好
 */
export function useShake<T extends HTMLElement = HTMLFormElement>() {
	const [scope, animate] = useAnimate<T>();
	const reduce = useShouldReduceMotion();
	const shakeTransition = useTempoTransition(motionTransition.shake);

	const shake = useCallback(() => {
		if (reduce || !scope.current) return;
		animate(scope.current, { x: [0, -6, 6, -4, 4, 0] }, shakeTransition);
	}, [animate, reduce, scope, shakeTransition]);

	return { scope, shake };
}
