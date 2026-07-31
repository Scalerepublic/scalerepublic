/**
 * Purpose: Expose shared motion presets for consistent page and overlay transitions.
 */
import { fly, scale } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

/** Bottom-sheet fly-in on small screens, centered scale-in everywhere else. */
export function panelTransition(node: HTMLElement) {
	return window.innerWidth < 640
		? fly(node, { y: 500, duration: 300, easing: cubicOut })
		: scale(node, { start: 0.95, duration: 200, easing: cubicOut });
}
