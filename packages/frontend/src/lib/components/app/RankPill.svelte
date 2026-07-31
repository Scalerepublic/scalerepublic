<!--
  Purpose: Display leaderboard position.
-->
<script lang="ts">
	import { Trophy } from '@lucide/svelte';

	let { rank }: { rank: number } = $props();
</script>

<div class="status-pill">
	<Trophy class="size-4 text-accent" />
	<div class="text-right">
		<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Rank</p>
		<p class="font-serif text-lg leading-none font-bold text-foreground">#{rank}</p>
	</div>
</div>
