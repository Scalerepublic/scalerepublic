/**
 * Purpose: Move overlay elements to document.body and restore them when the Svelte action is destroyed.
 */
import type { Action } from 'svelte/action';

export const portal: Action<HTMLElement> = (node) => {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
};
