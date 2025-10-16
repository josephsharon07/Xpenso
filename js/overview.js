// Overview counters for home page
class OverviewManager {
	constructor() {
		this.supabase = window.supabaseClient;
		this.init();
	}

	init() {
		this.loadAndRender();
	}

	async loadAndRender() {
		try {
			this.showLoading();
			const { data, error } = await this.supabase
				.from('expenses')
				.select('*')
				.order('date', { ascending: false });

			if (error) {
				console.error('Overview load error:', error);
				this.hideLoading();
				return;
			}

			const expenses = data || [];
			this.updateSummary(expenses);
			this.hideLoading();
		} catch (e) {
			console.error('Overview error:', e);
			this.hideLoading();
		}
	}

	updateSummary(list) {
		const total = list.reduce((s, e) => s + (parseFloat(e.total) || 0), 0);
		const claimed = list.filter(e => e.claimed).reduce((s, e) => s + (parseFloat(e.total) || 0), 0);
		const pending = total - claimed;
		const totalKm = list.filter(e => e.category === 'Petrol').reduce((s, e) => s + (parseFloat(e.km) || 0), 0);
		const unclaimedKm = list.filter(e => e.category === 'Petrol' && !e.claimed).reduce((s, e) => s + (parseFloat(e.km) || 0), 0);

		const totalEl = document.getElementById('totalExpenses');
		const claimedEl = document.getElementById('claimedExpenses');
		const pendingEl = document.getElementById('pendingExpenses');
		const totalKmEl = document.getElementById('totalKm');
		const unclaimedKmEl = document.getElementById('unclaimedKm');

		if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
		if (claimedEl) claimedEl.textContent = `₹${claimed.toFixed(2)}`;
		if (pendingEl) pendingEl.textContent = `₹${pending.toFixed(2)}`;
		if (totalKmEl) totalKmEl.textContent = `${totalKm.toFixed(2)} km`;
		if (unclaimedKmEl) unclaimedKmEl.textContent = `${unclaimedKm.toFixed(2)} km`;
	}

	showLoading() {
		const l = document.getElementById('loadingState');
		if (l) l.classList.remove('hidden');
	}

	hideLoading() {
		const l = document.getElementById('loadingState');
		if (l) l.classList.add('hidden');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	window.overviewManager = new OverviewManager();
});


