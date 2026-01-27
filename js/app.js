// Main Application Logic
const App = {
    currentView: 'loans',

    // Initialize app
    init() {
        // Setup static event listeners immediately
        this.setupEventListeners();

        // Show loading state
        Components.showToast('Connecting to Cloud Database...', 'info', 'Loading');

        // Initialize storage with a data update callback
        Storage.init(() => {
            this.refreshAllUI();
        });
    },

    // Central function to update all UI components when data changes
    refreshAllUI() {
        this.updateDashboard();
        this.renderItemsList();
        this.renderPayments();
        this.updateAnalytics();
        Charts.updateAll();
    },

    // Setup all event listeners
    setupEventListeners() {
        // Navigation
        const navMenuBtn = document.getElementById('navMenuBtn');
        const navMenu = document.getElementById('navMenu');

        navMenuBtn?.addEventListener('click', () => {
            const isActive = navMenu?.classList.toggle('active');
            navMenuBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                Components.showPage(`page-${page}`);
                document.getElementById('navMenu')?.classList.remove('active');

                // Page-specific updates if needed (redundant now but safe)
                if (page === 'dashboard') {
                    this.updateDashboard();
                } else if (page === 'loans') {
                    this.renderItemsList();
                } else if (page === 'payments') {
                    this.renderPayments();
                } else if (page === 'analytics') {
                    this.updateAnalytics();
                }
            });
        });

        // Quick actions
        document.getElementById('btnAddIncome')?.addEventListener('click', () => this.openIncomeModal());
        document.getElementById('btnAddExpense')?.addEventListener('click', () => this.openExpenseModal());
        document.getElementById('btnAddLoan')?.addEventListener('click', () => this.openLoanModal());
        document.getElementById('btnAddLoanPage')?.addEventListener('click', () => this.openLoanModal());
        document.getElementById('btnMakePayment')?.addEventListener('click', () => this.openPaymentModal());
        document.getElementById('btnAddPayment')?.addEventListener('click', () => this.openPaymentModal());

        // Modal close buttons
        document.getElementById('modalIncomeClose')?.addEventListener('click', () => Components.hideModal('modalIncome'));
        document.getElementById('incomeCancel')?.addEventListener('click', () => Components.hideModal('modalIncome'));
        document.getElementById('modalExpenseClose')?.addEventListener('click', () => Components.hideModal('modalExpense'));
        document.getElementById('expenseCancel')?.addEventListener('click', () => Components.hideModal('modalExpense'));
        document.getElementById('modalLoanClose')?.addEventListener('click', () => Components.hideModal('modalLoan'));
        document.getElementById('loanCancel')?.addEventListener('click', () => Components.hideModal('modalLoan'));
        document.getElementById('modalPaymentClose')?.addEventListener('click', () => Components.hideModal('modalPayment'));
        document.getElementById('paymentCancel')?.addEventListener('click', () => Components.hideModal('modalPayment'));

        // Forms
        document.getElementById('formIncome')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveIncome();
        });
        document.getElementById('formExpense')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveExpense();
        });
        document.getElementById('formLoan')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveLoan();
        });
        document.getElementById('formPayment')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.savePayment();
        });

        // Filters and sorting
        document.getElementById('filterCategory')?.addEventListener('change', () => this.renderItemsList());
        document.getElementById('sortBy')?.addEventListener('change', () => this.renderItemsList());

        // Analytics filters
        document.getElementById('analyticsCategoryFilter')?.addEventListener('change', () => this.updateAnalytics());
        document.getElementById('analyticsTimeFilter')?.addEventListener('change', () => this.updateAnalytics());
        document.getElementById('analyticsSortOrder')?.addEventListener('change', () => this.updateAnalytics());

        // PDF Report
        document.getElementById('btnDownloadPDF')?.addEventListener('click', () => this.downloadPDF());

        // Reset Data (Master Reset)
        window.resetAppDatabase = async () => {
            if (confirm('CRITICAL: This will permanently delete ALL data from the cloud database. Are you sure you want to start fresh?')) {
                Components.showToast('Wiping cloud data...', 'warning', 'Resetting');
                await Storage.clearAllData();
                Components.showToast('Database wiped successfully. Starting fresh!', 'success', 'Done');
            }
        };

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    },

    // Update dashboard
    updateDashboard() {
        const loans = Storage.getLoans();
        const payments = Storage.getPayments();
        const income = Storage.getIncome();
        const expenses = Storage.getExpenses();

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Calculate Monthly Totals
        const monthlyIncomeTotal = income
            .filter(i => {
                const d = new Date(i.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, i) => sum + parseFloat(i.amount), 0);

        const monthlyExpenseTotal = expenses
            .filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);

        const monthlyDebtPayments = payments
            .filter(p => {
                const d = new Date(p.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        const totalDebt = loans.reduce((sum, l) => sum + parseFloat(l.balance), 0);
        const netBalance = monthlyIncomeTotal - (monthlyExpenseTotal + monthlyDebtPayments);

        // Update Dashboard UI with animation
        const prevIncome = parseFloat(document.getElementById('dashTotalIncome').textContent.replace(/[^\d.-]/g, '')) || 0;
        const prevExpense = parseFloat(document.getElementById('dashTotalExpenses').textContent.replace(/[^\d.-]/g, '')) || 0;
        const prevDebt = parseFloat(document.getElementById('dashTotalDebt').textContent.replace(/[^\d.-]/g, '')) || 0;
        const prevNet = parseFloat(document.getElementById('dashNetBalance').textContent.replace(/[^\d.-]/g, '')) || 0;

        Components.animateValue(document.getElementById('dashTotalIncome'), prevIncome, monthlyIncomeTotal, 1000, Components.formatCurrency);
        Components.animateValue(document.getElementById('dashTotalExpenses'), prevExpense, monthlyExpenseTotal, 1000, Components.formatCurrency);
        Components.animateValue(document.getElementById('dashTotalDebt'), prevDebt, totalDebt, 1000, Components.formatCurrency);
        Components.animateValue(document.getElementById('dashNetBalance'), prevNet, netBalance, 1000, Components.formatCurrency);

        // Update Upcoming Payments
        const monthlyPaymentsList = document.getElementById('monthlyPaymentsList');
        if (monthlyPaymentsList) {
            const activeLoans = loans.filter(l => l.balance > 0);
            if (activeLoans.length === 0) {
                monthlyPaymentsList.innerHTML = '<div class="empty-state">No active loans found</div>';
            } else {
                monthlyPaymentsList.innerHTML = activeLoans.map(loan =>
                    Components.createActivityItem(loan.name, loan.monthlyPayment, new Date().toISOString(), 'payment')
                ).join('');
            }
        }

        // Update Recent Activity
        const recentActivity = [
            ...income.map(i => ({ ...i, type: 'income', label: i.source })),
            ...expenses.map(e => ({ ...e, type: 'expense', label: e.name })),
            ...payments.map(p => {
                const item = this.getItemById(p.itemId, p.itemType);
                return { ...p, type: 'payment', label: item ? item.name : 'Unknown' };
            })
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

        const paymentsContainer = document.getElementById('recentPayments');
        if (recentActivity.length === 0) {
            paymentsContainer.innerHTML = '<div class="empty-state">No activity yet</div>';
        } else {
            paymentsContainer.innerHTML = recentActivity.map(act =>
                Components.createActivityItem(act.label, act.amount, act.date, act.type)
            ).join('');
        }

        Charts.updateExpenseChart();
    },

    // Render Loans List
    renderItemsList() {
        const items = Storage.getLoans();
        const categoryFilter = document.getElementById('filterCategory')?.value || '';
        const sortBy = document.getElementById('sortBy')?.value || 'name';

        let filtered = items;
        if (categoryFilter) {
            filtered = items.filter(item => item.category === categoryFilter);
        }

        filtered.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'balance') return parseFloat(b.balance) - parseFloat(a.balance);
            return 0;
        });

        // Update Categories
        const categories = Storage.getCategories();
        const categorySelect = document.getElementById('filterCategory');
        if (categorySelect) {
            const currentValue = categorySelect.value;
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categorySelect.appendChild(option);
            });
            categorySelect.value = currentValue;
        }

        const container = document.getElementById('itemsList');
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state">No loans found. Add your first loan!</div>';
        } else {
            container.innerHTML = filtered.map(item => Components.createItemCard(item, 'loan')).join('');
        }
    },

    // Income
    openIncomeModal() {
        Components.clearForm('formIncome');
        document.getElementById('modalIncomeTitle').textContent = 'Add Income';
        Components.showModal('modalIncome');
    },

    async saveIncome() {
        const income = {
            id: document.getElementById('incomeId').value || null,
            source: document.getElementById('incomeSource').value,
            amount: parseFloat(document.getElementById('incomeAmount').value),
            date: document.getElementById('incomeDate').value
        };
        await Storage.saveIncome(income);
        Components.hideModal('modalIncome');
        Components.showToast('Income synchronized to cloud', 'success', 'Success');
    },

    // Expense
    openExpenseModal() {
        Components.clearForm('formExpense');
        document.getElementById('modalExpenseTitle').textContent = 'Add Expense';
        Components.showModal('modalExpense');
    },

    async saveExpense() {
        const expense = {
            id: document.getElementById('expenseId').value || null,
            name: document.getElementById('expenseName').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            category: document.getElementById('expenseCategory').value,
            date: document.getElementById('expenseDate').value
        };
        await Storage.saveExpense(expense);
        Components.hideModal('modalExpense');
        Components.showToast('Expense recorded in cloud', 'success', 'Success');
    },

    // Loans
    openLoanModal(loanId = null) {
        Components.clearForm('formLoan');
        document.getElementById('modalLoanTitle').textContent = loanId ? 'Edit Loan' : 'Add Loan';
        if (loanId) {
            const loan = Storage.getLoans().find(l => l.id === loanId);
            if (loan) {
                document.getElementById('loanId').value = loan.id;
                document.getElementById('loanName').value = loan.name;
                document.getElementById('loanPrincipal').value = loan.principal;
                document.getElementById('loanBalance').value = loan.balance;
                document.getElementById('loanMonthlyPayment').value = loan.monthlyPayment;
                document.getElementById('loanStartDate').value = loan.startDate;
                document.getElementById('loanCategory').value = loan.category || '';
                document.getElementById('loanTags').value = loan.tags || '';
            }
        }
        Components.showModal('modalLoan');
    },

    async saveLoan() {
        const loan = {
            id: document.getElementById('loanId').value || null,
            name: document.getElementById('loanName').value,
            principal: parseFloat(document.getElementById('loanPrincipal').value),
            balance: parseFloat(document.getElementById('loanBalance').value),
            monthlyPayment: parseFloat(document.getElementById('loanMonthlyPayment').value),
            startDate: document.getElementById('loanStartDate').value,
            category: document.getElementById('loanCategory').value.trim(),
            tags: document.getElementById('loanTags').value.trim()
        };
        await Storage.saveLoan(loan);
        Components.hideModal('modalLoan');
        Components.showToast(loan.id ? 'Loan updated on cloud' : 'Loan added to cloud', 'success', 'Success');
    },

    editItem(id, type) {
        if (type === 'loan') this.openLoanModal(id);
    },

    async deleteItem(id, type) {
        if (confirm(`Delete this ${type}? Related payments will also be removed.`)) {
            if (type === 'loan') await Storage.deleteLoan(id);
            Components.showToast('Item deleted from cloud', 'success', 'Deleted');
        }
    },

    // Payments
    openPaymentModal(paymentId = null) {
        Components.clearForm('formPayment');
        Components.populateAllItemsSelect('paymentItem');
        document.getElementById('modalPaymentTitle').textContent = paymentId ? 'Edit Payment' : 'Add Payment';
        if (paymentId) {
            const payment = Storage.getPayments().find(p => p.id === paymentId);
            if (payment) {
                document.getElementById('paymentId').value = payment.id;
                document.getElementById('paymentItem').value = payment.itemId;
                document.getElementById('paymentAmount').value = payment.amount;
                document.getElementById('paymentDate').value = payment.date;
                document.getElementById('paymentNotes').value = payment.notes || '';
            }
        }
        Components.showModal('modalPayment');
    },

    async savePayment() {
        const itemSelect = document.getElementById('paymentItem');
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        if (!selectedOption || !selectedOption.dataset.type) return alert('Select a loan');

        const payment = {
            id: document.getElementById('paymentId').value || null,
            itemId: itemSelect.value,
            itemType: selectedOption.dataset.type,
            amount: parseFloat(document.getElementById('paymentAmount').value),
            date: document.getElementById('paymentDate').value,
            notes: document.getElementById('paymentNotes').value.trim()
        };
        await Storage.savePayment(payment);
        Components.hideModal('modalPayment');
        Components.showToast('Payment synchronized', 'success', 'Success');
    },

    renderPayments() {
        const payments = Storage.getPayments().sort((a, b) => new Date(b.date) - new Date(a.date));
        const tbody = document.getElementById('paymentsTableBody');
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No payments recorded</td></tr>';
        } else {
            tbody.innerHTML = payments.map(payment => {
                const item = this.getItemById(payment.itemId, payment.itemType);
                return `
                    <tr>
                        <td>${Components.formatDate(payment.date)}</td>
                        <td>${item ? item.name : 'Unknown'}</td>
                        <td>${Components.formatCurrency(payment.amount)}</td>
                        <td>${payment.notes || '-'}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-secondary btn-sm" onclick="App.openPaymentModal('${payment.id}')">Edit</button>
                                <button class="btn btn-destructive btn-sm" onclick="App.deletePayment('${payment.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        Charts.updatePaymentsChart();
    },

    async deletePayment(id) {
        if (confirm('Delete this payment? Balance will be restored.')) {
            await Storage.deletePayment(id);
            Components.showToast('Payment removed', 'success', 'Deleted');
        }
    },

    getItemById(id, type) {
        if (type === 'loan') return Storage.getLoans().find(l => l.id === id);
        return null;
    },

    updateAnalytics() {
        const categories = Storage.getCategories();
        const categorySelect = document.getElementById('analyticsCategoryFilter');
        if (categorySelect) {
            const currentValue = categorySelect.value;
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categorySelect.appendChild(option);
            });
            categorySelect.value = currentValue;
        }
        Charts.updateCategoryChart();
        Charts.updatePaymentsBreakdownChart();
    },

    downloadPDF() {
        const element = document.getElementById('page-analytics');
        const opt = {
            margin: 10,
            filename: `Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#090820' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        Components.showToast('Generating report...', 'info', 'Wait');
        html2pdf().from(element).set(opt).save().then(() => {
            Components.showToast('Report downloaded', 'success', 'Done');
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
