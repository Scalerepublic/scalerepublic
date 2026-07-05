<script lang="ts">
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import ProfileTab from './ProfileTab.svelte';
	import AccountTab from './AccountTab.svelte';
	import SecurityTab from './SecurityTab.svelte';
	import AppearanceTab from './AppearanceTab.svelte';
	import NotificationsTab from './NotificationsTab.svelte';
	import DeveloperTab from './DeveloperTab.svelte';
	import { cn } from '$lib/utils';

	const tabs = [
		{ id: 'profile', label: 'Profile', component: ProfileTab },
		{ id: 'account', label: 'Account', component: AccountTab },
		{ id: 'security', label: 'Security', component: SecurityTab },
		{ id: 'appearance', label: 'Appearance', component: AppearanceTab },
		{ id: 'notifications', label: 'Notifications', component: NotificationsTab },
		{ id: 'developer', label: 'Developer', component: DeveloperTab }
	];

	let activeTab = $state(tabs[0]);
</script>

<div class="page-shell-narrow">
	<div class="page-header-block">
		<PageHeader title="Settings" />
	</div>

	<div class="mb-6 flex border-b border-border">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				onclick={() => (activeTab = tab)}
				class={cn(
					'px-4 py-2.5 text-sm font-medium transition-colors',
					activeTab.id === tab.id
						? '-mb-px border-b-2 border-primary text-primary'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<activeTab.component />
</div>
