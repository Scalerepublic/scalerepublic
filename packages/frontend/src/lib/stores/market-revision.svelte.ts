class MarketRevisionStore {
	revision = $state(0);

	bump() {
		this.revision += 1;
	}
}

export const marketRevisionStore = new MarketRevisionStore();
