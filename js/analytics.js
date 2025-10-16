// Analytics page: fetch expenses and render charts
class AnalyticsManager {
	constructor() {
		this.supabase = window.supabaseClient;
		this.charts = { byCategory: null, overTime: null, claimedPending: null };
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
				.order('date', { ascending: true });

			if (error) {
				console.error('Error loading expenses for analytics:', error);
				this.hideLoading();
				return;
			}

			const expenses = data || [];
			this.renderCharts(expenses);
			this.hideLoading();
		} catch (e) {
			console.error('Analytics load error:', e);
			this.hideLoading();
		}
	}

	renderCharts(list) {
		const ctxCategory = document.getElementById('chartByCategory');
		const ctxOverTime = document.getElementById('chartOverTime');
		const ctxClaimed = document.getElementById('chartClaimedPending');

		if (!(window.Chart)) return;

		// By Category (sum totals)
		const categories = ['Bus', 'Petrol', 'Food', 'Others'];
		const categoryTotals = categories.map(cat => list
			.filter(e => e.category === cat)
			.reduce((s, e) => s + (parseFloat(e.total) || 0), 0));

		if (ctxCategory) {
			if (this.charts.byCategory) {
				this.charts.byCategory.data.labels = categories;
				this.charts.byCategory.data.datasets[0].data = categoryTotals;
				this.charts.byCategory.update();
			} else {
				this.charts.byCategory = new Chart(ctxCategory, {
					type: 'bar',
					data: {
						labels: categories,
						datasets: [{
							label: 'Amount (₹)',
							data: categoryTotals,
							backgroundColor: ['#3b82f6','#10b981','#f59e0b','#6b7280']
						}]
					},
					options: {
						responsive: true,
						plugins: { legend: { display: false } },
						scales: { y: { beginAtZero: true } }
					}
				});
			}
		}

		// Over Time (sum per day)
		const totalsByDate = {};
		for (const e of list) {
			const d = e.date;
			if (!totalsByDate[d]) totalsByDate[d] = 0;
			totalsByDate[d] += (parseFloat(e.total) || 0);
		}
		const sortedDates = Object.keys(totalsByDate).sort();
		const totalsSeries = sortedDates.map(d => totalsByDate[d]);

		if (ctxOverTime) {
			if (this.charts.overTime) {
				this.charts.overTime.data.labels = sortedDates;
				this.charts.overTime.data.datasets[0].data = totalsSeries;
				this.charts.overTime.update();
			} else {
				this.charts.overTime = new Chart(ctxOverTime, {
					type: 'line',
					data: {
						labels: sortedDates,
						datasets: [{
							label: 'Daily Total (₹)',
							data: totalsSeries,
							borderColor: '#2563eb',
							backgroundColor: 'rgba(37, 99, 235, 0.1)',
							tension: 0.3
						}]
					},
					options: {
						responsive: true,
						plugins: { legend: { display: false } },
						scales: { y: { beginAtZero: true } }
					}
				});
			}
		}

		// Claimed vs Pending
		const claimedTotal = list.filter(e => e.claimed).reduce((s, e) => s + (parseFloat(e.total) || 0), 0);
		const pendingTotal = list.filter(e => !e.claimed).reduce((s, e) => s + (parseFloat(e.total) || 0), 0);

		if (ctxClaimed) {
			if (this.charts.claimedPending) {
				this.charts.claimedPending.data.datasets[0].data = [claimedTotal, pendingTotal];
				this.charts.claimedPending.update();
			} else {
				this.charts.claimedPending = new Chart(ctxClaimed, {
					type: 'doughnut',
					data: {
						labels: ['Claimed', 'Pending'],
						datasets: [{
							data: [claimedTotal, pendingTotal],
							backgroundColor: ['#0ea5e9', '#f59e0b']
						}]
					},
					options: {
						responsive: true,
						plugins: { legend: { position: 'bottom' } }
					}
				});
			}
		}
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
	window.analyticsManager = new AnalyticsManager();
});


