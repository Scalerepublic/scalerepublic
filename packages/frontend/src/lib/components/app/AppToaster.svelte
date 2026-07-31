<!--
  Purpose: Render global toast notifications.
-->
<script lang="ts">
	import { Toaster, type ToastOptions } from 'svelte-sonner';

	const toastOptions: ToastOptions = {
		unstyled: true,
		classes: {
			toast:
				'group relative flex w-[min(100vw-2rem,22rem)] items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 font-sans shadow-none',
			title: 'text-sm font-semibold leading-snug text-foreground',
			description: 'text-xs leading-relaxed text-muted-foreground',
			content: 'flex-1 min-w-0',
			icon: 'mt-0.5 shrink-0',
			closeButton:
				'absolute right-2 top-2 rounded-md border border-border bg-card p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
			actionButton: 'btn-primary h-8 px-3 text-xs font-semibold tracking-wide',
			cancelButton: 'btn-secondary h-8 px-3 text-xs font-semibold tracking-wide',
			success:
				'border-positive/40 bg-card [&_[data-title]]:text-positive [&_[data-icon]]:text-positive',
			error:
				'border-destructive/40 bg-card [&_[data-title]]:text-destructive [&_[data-icon]]:text-destructive',
			warning:
				'border-border bg-muted [&_[data-title]]:text-foreground [&_[data-icon]]:text-foreground',
			info: 'border-accent/30 bg-card [&_[data-title]]:text-foreground [&_[data-icon]]:text-accent',
			loading: 'border-border bg-card [&_[data-title]]:text-foreground'
		}
	};
</script>

<Toaster position="top-center" visibleToasts={4} gap={10} {toastOptions} />
