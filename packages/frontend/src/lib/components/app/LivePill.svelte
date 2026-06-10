<script lang="ts">
	import { cn } from '$lib/utils';

	let { class: className = '' }: { class?: string } = $props();
</script>

<div class={cn('live-pill', className)}>
	<span class="live-pill-dot">
		<span class="live-pill-ping"></span>
		<span class="live-pill-core"></span>
	</span>
	<span class="live-pill-label">Live</span>
</div>
