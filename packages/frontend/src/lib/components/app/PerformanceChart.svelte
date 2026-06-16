<script lang="ts">
	import { cn, formatCurrency, formatPercent } from '$lib/utils';
	import type { PerformanceGranularity } from '$lib/stores/performance.svelte';
	import type { PerformancePoint } from '$lib/performance-history';

	let {
		data,
		granularity = $bindable<PerformanceGranularity>('daily'),
		loading = false,
		onGranularityChange
	}: {
		data: PerformancePoint[];
		granularity?: PerformanceGranularity;
		loading?: boolean;
		onGranularityChange?: (granularity: PerformanceGranularity) => void;
	} = $props();

	const granularityOptions: { value: PerformanceGranularity; label: string }[] = [
		{ value: 'daily', label: 'Daily' },
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'yearly', label: 'Yearly' }
	];

	const points = $derived(
		Array.isArray(data)
			? data.filter(
					(p): p is PerformancePoint =>
						p != null && typeof p.date === 'string' && Number.isFinite(p.value)
				)
			: []
	);

	const width = 800;
	const height = 220;
	const pad = { t: 16, r: 20, b: 12, l: 20 };
	const innerW = width - pad.l - pad.r;
	const innerH = height - pad.t - pad.b;

	const minY = $derived.by(() => {
		if (points.length === 0) return 0;
		const min = Math.min(...points.map((d) => d.value));
		const max = Math.max(...points.map((d) => d.value));
		if (min === max) return min === 0 ? 0 : min * 0.99;
		return min * 0.992;
	});

	const maxY = $derived.by(() => {
		if (points.length === 0) return 1;
		const min = Math.min(...points.map((d) => d.value));
		const max = Math.max(...points.map((d) => d.value));
		if (min === max) return max === 0 ? 1 : max * 1.01;
		return max * 1.008;
	});

	const plotPoints = $derived(
		points.map((d, i) => {
			const x = pad.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
			const range = maxY - minY;
			const y = pad.t + innerH - (range === 0 ? 0.5 : (d.value - minY) / range) * innerH;
			return { ...d, x, y };
		})
	);

	const linePath = $derived(
		plotPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
	);

	const areaPath = $derived(
		plotPoints.length === 0
			? ''
			: `${linePath} L${plotPoints[plotPoints.length - 1].x},${pad.t + innerH} L${plotPoints[0].x},${pad.t + innerH} Z`
	);

	const gridLines = $derived([0, 0.5, 1]);

	const xLabelIndices = $derived.by(() => {
		if (points.length === 0) return [] as number[];
		if (points.length === 1) return [0];

		const maxLabels = 5;
		const indices: number[] = [];
		let lastDate = '';

		for (let i = 0; i < points.length; i++) {
			const date = points[i]!.date;
			const isEdge = i === 0 || i === points.length - 1;
			const isNewDate = date !== lastDate;
			if (isEdge || (isNewDate && indices.length < maxLabels)) {
				if (indices.length === 0 || indices[indices.length - 1] !== i) {
					indices.push(i);
					lastDate = date;
				}
			}
		}

		if (indices[indices.length - 1] !== points.length - 1) {
			indices.push(points.length - 1);
		}

		return indices;
	});

	const startValue = $derived(points[0]?.value ?? 0);
	const endValue = $derived(points[points.length - 1]?.value ?? 0);
	const periodReturn = $derived(startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0);
	const isPositive = $derived(periodReturn >= 0);

	let activeIndex = $state<number | null>(null);

	const activePoint = $derived(activeIndex !== null ? plotPoints[activeIndex] : null);

	function formatAxisDate(iso: string): string {
		return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short'
		});
	}

	function handlePointerMove(event: PointerEvent) {
		if (points.length === 0) {
			activeIndex = null;
			return;
		}

		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * width;
		const innerX = x - pad.l;
		if (innerX < 0 || innerX > innerW) {
			activeIndex = null;
			return;
		}
		const ratio = innerX / innerW;
		activeIndex = Math.round(ratio * (points.length - 1));
	}

	function handlePointerLeave() {
		activeIndex = null;
	}

	function selectGranularity(next: PerformanceGranularity) {
		if (granularity === next) return;
		granularity = next;
		onGranularityChange?.(next);
	}
</script>

<article class="overflow-hidden border border-border bg-card">
	<div class="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-4">
		<div>
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Performance
			</h2>
			<p class="mt-0.5 text-xs text-muted-foreground">Mark-to-market portfolio value</p>
		</div>
		<div class="text-right">
			{#if activePoint}
				<p class="font-mono text-lg font-bold text-primary">{formatCurrency(activePoint.value)}</p>
				<p class="text-xs text-muted-foreground">{formatAxisDate(activePoint.date)}</p>
			{:else}
				<p class="font-mono text-lg font-bold text-primary">{formatCurrency(endValue)}</p>
				<p
					class={cn(
						'font-mono text-xs font-semibold',
						isPositive ? 'text-positive' : 'text-negative'
					)}
				>
					{formatPercent(periodReturn)} all time
				</p>
			{/if}
		</div>
	</div>

	<div class="flex flex-wrap gap-1 border-b border-border px-5 py-3">
		{#each granularityOptions as option (option.value)}
			<button
				type="button"
				onclick={() => selectGranularity(option.value)}
				class={cn(
					'px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase transition-colors',
					granularity === option.value
						? 'border border-border bg-muted text-foreground'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				{option.label}
			</button>
		{/each}
	</div>

	<div class="px-4 py-4 md:px-5">
		{#if loading}
			<div
				class="flex items-center justify-center text-sm text-muted-foreground"
				style="height: {height}px"
			>
				Loading performance…
			</div>
		{:else if points.length === 0}
			<div
				class="flex items-center justify-center text-sm text-muted-foreground"
				style="height: {height}px"
			>
				No performance data yet
			</div>
		{:else}
			<svg
				viewBox={`0 0 ${width} ${height}`}
				class="w-full touch-none select-none"
				role="img"
				aria-label="Portfolio performance chart"
				onpointermove={handlePointerMove}
				onpointerleave={handlePointerLeave}
				onpointerdown={handlePointerMove}
			>
				<defs>
					<linearGradient id="performance-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="var(--chart-fill-top)" />
						<stop offset="100%" stop-color="var(--chart-fill-bottom)" />
					</linearGradient>
				</defs>

				{#each gridLines as ratio, i (i)}
					{@const y = pad.t + innerH * (1 - ratio)}
					<line
						x1={pad.l}
						y1={y}
						x2={width - pad.r}
						y2={y}
						stroke="var(--chart-grid)"
						stroke-width="1"
						stroke-dasharray={i === 1 ? '4 4' : undefined}
					/>
				{/each}

				<path d={areaPath} fill="url(#performance-fill)" />
				<path
					d={linePath}
					fill="none"
					stroke="var(--chart-line-start)"
					stroke-width="1.5"
					stroke-linecap="square"
					stroke-linejoin="miter"
				/>

				{#if activePoint && activeIndex !== null}
					<line
						x1={activePoint.x}
						y1={pad.t}
						x2={activePoint.x}
						y2={pad.t + innerH}
						stroke="var(--chart-crosshair)"
						stroke-width="1"
						stroke-dasharray="3 3"
					/>
					<rect
						x={activePoint.x - 3}
						y={activePoint.y - 3}
						width="6"
						height="6"
						fill="var(--card)"
						stroke="var(--foreground)"
						stroke-width="1.5"
					/>
				{/if}
			</svg>

			<div class="mt-2 flex justify-between gap-2 text-xs font-medium text-muted-foreground">
				{#each xLabelIndices as index (index)}
					{@const label = plotPoints[index]}
					{#if label}
						<span class:ml-auto={index === xLabelIndices[xLabelIndices.length - 1]}
							>{formatAxisDate(label.date)}</span
						>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</article>
