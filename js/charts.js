// Chart.js Integration
const Charts = {
    charts: {},

    // Helper to handle empty chart states without destroying the canvas element
    handleEmptyState(canvasId, title, message, hasData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const container = canvas.parentElement;
        let emptyState = container.querySelector('.empty-state');

        if (!hasData) {
            canvas.style.display = 'none';
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                container.appendChild(emptyState);
            }
            emptyState.textContent = message;
            emptyState.style.display = 'block';
        } else {
            canvas.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
        }
    },

    // New: Expense Category Chart (Money Magnet Style)
    updateExpenseChart() {
        const canvas = document.getElementById('expenseCategoryChart');
        if (!canvas) return;

        const expenses = Storage.getExpenses();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const categoryTotals = {};
        expenses.forEach(expense => {
            const d = new Date(expense.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const cat = expense.category || 'Other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(expense.amount);
            }
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        const colors = labels.map((_, i) => this.getColor(i));

        this.handleEmptyState('expenseCategoryChart', 'Spending by Category', 'No expenses recorded this month', data.length > 0);

        if (data.length === 0) {
            if (this.charts.expense) {
                this.charts.expense.destroy();
                delete this.charts.expense;
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        if (this.charts.expense) this.charts.expense.destroy();

        this.charts.expense = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${Components.formatCurrency(context.parsed)}`
                        }
                    }
                }
            }
        });
    },

    // Update debt breakdown (Loans only)
    updateDebtBreakdown() {
        const canvas = document.getElementById('debtBreakdownChart');
        if (!canvas) return;

        const loans = Storage.getLoans();
        const labels = [];
        const data = [];
        const colors = [];

        loans.forEach((loan, i) => {
            if (loan.balance > 0) {
                labels.push(loan.name);
                data.push(parseFloat(loan.balance));
                colors.push(this.getColor(i));
            }
        });

        this.handleEmptyState('debtBreakdownChart', 'Debt Breakdown', 'No active loans found', data.length > 0);

        if (data.length === 0) {
            if (this.charts.debtBreakdown) {
                this.charts.debtBreakdown.destroy();
                delete this.charts.debtBreakdown;
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        if (this.charts.debtBreakdown) this.charts.debtBreakdown.destroy();

        this.charts.debtBreakdown = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((val / total) * 100).toFixed(1);
                                return `${context.label}: ${Components.formatCurrency(val)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // Update payment distribution (Loans only)
    updatePaymentDistribution() {
        const canvas = document.getElementById('paymentDistributionChart');
        if (!canvas) return;

        const payments = Storage.getPayments();
        const loans = Storage.getLoans();
        const loanMap = new Map();
        loans.forEach(l => loanMap.set(l.id, l.name));

        const loanPayments = {};
        payments.forEach(p => {
            const name = loanMap.get(p.itemId);
            if (name) loanPayments[name] = (loanPayments[name] || 0) + parseFloat(p.amount);
        });

        const labels = Object.keys(loanPayments);
        const data = Object.values(loanPayments);
        const colors = labels.map((_, i) => this.getColor(i));

        this.handleEmptyState('paymentDistributionChart', 'Payment Distribution', 'No payment data available', data.length > 0);

        if (data.length === 0) {
            if (this.charts.paymentDistribution) {
                this.charts.paymentDistribution.destroy();
                delete this.charts.paymentDistribution;
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        if (this.charts.paymentDistribution) this.charts.paymentDistribution.destroy();

        this.charts.paymentDistribution = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    // Update payments page chart
    updatePaymentsChart() {
        const canvas = document.getElementById('paymentsChart');
        if (!canvas) return;
        this.updatePaymentDistribution();
    },

    // Update analytic category chart (Loans only)
    updateCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        const loans = Storage.getLoans();
        const sortOrder = document.getElementById('analyticsSortOrder')?.value || 'high-low';
        const categoryFilter = document.getElementById('analyticsCategoryFilter')?.value || '';

        const dataMap = {};
        loans.forEach(loan => {
            if (categoryFilter && loan.category !== categoryFilter) return;
            const key = categoryFilter ? loan.name : (loan.category || 'Uncategorized');
            dataMap[key] = (dataMap[key] || 0) + parseFloat(loan.balance);
        });

        let entries = Object.entries(dataMap).sort((a, b) =>
            sortOrder === 'high-low' ? b[1] - a[1] : a[1] - b[1]
        );

        const labels = entries.map(e => e[0]);
        const data = entries.map(e => e[1]);
        const colors = labels.map((_, i) => this.getColor(i));

        this.handleEmptyState('categoryChart', 'Analytics Categories', 'No category data available', data.length > 0);

        if (data.length === 0) {
            if (this.charts.category) {
                this.charts.category.destroy();
                delete this.charts.category;
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        if (this.charts.category) this.charts.category.destroy();

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    // Update analytic payment breakdown (Loans only)
    updatePaymentsBreakdownChart() {
        const canvas = document.getElementById('paymentsBreakdownChart');
        if (!canvas) return;

        const payments = Storage.getPayments();
        const loans = Storage.getLoans();
        const sortOrder = document.getElementById('analyticsSortOrder')?.value || 'high-low';
        const timeFilter = document.getElementById('analyticsTimeFilter')?.value || 'all';
        const categoryFilter = document.getElementById('analyticsCategoryFilter')?.value || '';

        const loanMap = new Map();
        loans.forEach(l => loanMap.set(l.id, { name: l.name, category: l.category }));

        const totals = {};
        const now = new Date();
        const curM = now.getMonth();
        const curY = now.getFullYear();

        payments.forEach(p => {
            const d = new Date(p.date);
            const loan = loanMap.get(p.itemId);
            if (!loan) return;
            if (timeFilter === 'month' && (d.getMonth() !== curM || d.getFullYear() !== curY)) return;
            if (timeFilter === 'year' && d.getFullYear() !== curY) return;
            if (categoryFilter && loan.category !== categoryFilter) return;

            totals[loan.name] = (totals[loan.name] || 0) + parseFloat(p.amount);
        });

        let entries = Object.entries(totals).sort((a, b) =>
            sortOrder === 'high-low' ? b[1] - a[1] : a[1] - b[1]
        );

        this.handleEmptyState('paymentsBreakdownChart', 'Payment Breakdown', 'No payment data found for this period', entries.length > 0);

        if (entries.length === 0) {
            if (this.charts.paymentsBreakdown) {
                this.charts.paymentsBreakdown.destroy();
                delete this.charts.paymentsBreakdown;
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        if (this.charts.paymentsBreakdown) this.charts.paymentsBreakdown.destroy();

        this.charts.paymentsBreakdown = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: entries.map(e => e[0]),
                datasets: [{ label: 'Total Paid', data: entries.map(e => e[1]), backgroundColor: this.getColor(0), borderRadius: 8 }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: (val) => Components.formatCurrency(val) }
                    }
                }
            }
        });
    },

    getColor(index) {
        const colors = ['#7030EF', '#DB1FFF', '#8C52FF', '#A64DFF', '#C148FF', '#511CC1', '#9B66FF', '#3A1389', '#D090FF'];
        return colors[index % colors.length];
    },

    updateAll() {
        this.updateExpenseChart();
        this.updateDebtBreakdown();
        this.updatePaymentDistribution();
        this.updateCategoryChart();
        this.updatePaymentsBreakdownChart();
    }
};
