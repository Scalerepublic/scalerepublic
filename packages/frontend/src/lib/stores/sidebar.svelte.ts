class SidebarStore {
	collapsed = $state(false);

	toggle() {
		this.collapsed = !this.collapsed;
	}
}

export const sidebarStore = new SidebarStore();
