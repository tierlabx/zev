import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { NoticePushEvent } from "@/api/system/notice";
import { useI18n } from "@/i18n";
import { useUserStore } from "@/store";

function parseSseEventBlock(block: string): NoticePushEvent | null {
	const lines = block.split(/\r?\n/);
	let eventName = "message";
	const dataLines: string[] = [];

	for (const line of lines) {
		if (!line || line.startsWith(":")) {
			continue;
		}
		if (line.startsWith("event:")) {
			eventName = line.slice(6).trim();
		} else if (line.startsWith("data:")) {
			dataLines.push(line.slice(5).trimStart());
		}
	}

	if (eventName !== "notice" || dataLines.length === 0) {
		return null;
	}

	try {
		return JSON.parse(dataLines.join("\n")) as NoticePushEvent;
	} catch {
		return null;
	}
}

/**
 * 订阅服务端 SSE 实时消息流，自动同步未读数与收件箱并弹出消息提示。
 * 注：使用 fetch 流替代原生 EventSource，以携带 Authorization Bearer 请求头。
 */
export function useNoticeStream() {
	const token = useUserStore((state) => state.token);
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { t } = useI18n();

	const tRef = useRef(t);
	tRef.current = t;
	const navigateRef = useRef(navigate);
	navigateRef.current = navigate;

	useEffect(() => {
		if (!token) {
			return;
		}

		let cancelled = false;
		let backoffMs = 1000;
		let reconnectTimer: number | null = null;
		let activeController: AbortController | null = null;

		const connect = async () => {
			if (cancelled) {
				return;
			}
			activeController = new AbortController();

			try {
				const resp = await fetch("/api/system/notice/stream", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "text/event-stream",
					},
					signal: activeController.signal,
				});

				if (!resp.ok || !resp.body) {
					throw new Error(`SSE connect failed: ${resp.status}`);
				}

				backoffMs = 1000;
				const reader = resp.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (!cancelled) {
					const { value, done } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					const blocks = buffer.split(/\r?\n\r?\n/);
					buffer = blocks.pop() ?? "";

					for (const block of blocks) {
						const evt = parseSseEventBlock(block);
						if (!evt) {
							continue;
						}
						queryClient.invalidateQueries({ queryKey: ["notices"] });
						queryClient.invalidateQueries({ queryKey: ["noticeUnreadCount"] });
						queryClient.invalidateQueries({ queryKey: ["myNotices"] });
						queryClient.invalidateQueries({ queryKey: ["sentNotices"] });
						queryClient.invalidateQueries({ queryKey: ["sentNoticeDetail"] });
						queryClient.invalidateQueries({ queryKey: ["manageNotices"] });
						if (evt.link?.startsWith("/agent/")) {
							queryClient.invalidateQueries({ queryKey: ["agentPendingApprovals"] });
						}

						const showToast = evt.level >= 2 ? toast.warning : toast.info;
						const targetLink =
							evt.noticeId > 0 ? `/messages?id=${evt.noticeId}` : evt.link?.startsWith("/") ? evt.link : "/messages";
						showToast(evt.title, {
							description: evt.summary,
							action: {
								label: tRef.current("notice.viewDetail"),
								onClick: () => {
									navigateRef.current({ to: targetLink as never });
								},
							},
						});
					}
				}
			} catch {
				// 忽略主动中断异常；网络抖动或服务端重启时采用指数退避重连
			}

			if (!cancelled) {
				const wait = backoffMs;
				backoffMs = Math.min(backoffMs * 2, 30000);
				reconnectTimer = window.setTimeout(() => {
					void connect();
				}, wait);
			}
		};

		void connect();

		return () => {
			cancelled = true;
			if (reconnectTimer !== null) {
				window.clearTimeout(reconnectTimer);
			}
			activeController?.abort();
		};
	}, [token, queryClient]);
}
