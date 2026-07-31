/**
 * Purpose: Hold the reactive open state of the mobile navigation sidebar.
 */
class SidebarStore {
	collapsed = $state(false);

	toggle() {
		this.collapsed = !this.collapsed;
	}
}

export const sidebarStore = new SidebarStore();
