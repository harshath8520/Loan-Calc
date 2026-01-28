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
            this.updateAllCategorySelects();
            this.refreshAllUI();
        });
    },

    // Central function to update all UI components when data changes
    refreshAllUI() {
        this.updateDashboard();
        this.renderItemsList();
        this.renderPayments();
        this.updateSpendingAnalysis();
        this.updateAnalytics();
        this.updateAdvisor();
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

                // Page-specific updates if needed
                if (page === 'dashboard') {
                    this.updateDashboard();
                } else if (page === 'loans') {
                    this.renderItemsList();
                } else if (page === 'payments') {
                    this.renderPayments();
                } else if (page === 'spending') {
                    this.updateSpendingAnalysis();
                } else if (page === 'analytics') {
                    this.updateAnalytics();
                } else if (page === 'advisor') {
                    this.updateAdvisor();
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

        // Budget management
        document.getElementById('btnManageBudgets')?.addEventListener('click', () => this.openBudgetModal());
        document.getElementById('modalBudgetClose')?.addEventListener('click', () => Components.hideModal('modalBudget'));
        document.getElementById('budgetCancel')?.addEventListener('click', () => Components.hideModal('modalBudget'));
        document.getElementById('formBudget')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveBudgets();
        });

        // Category management
        document.getElementById('btnManageCategories')?.addEventListener('click', () => this.openCategoryModal());
        document.getElementById('modalCategoryClose')?.addEventListener('click', () => Components.hideModal('modalCategory'));
        document.getElementById('categoryClose')?.addEventListener('click', () => Components.hideModal('modalCategory'));
        document.getElementById('btnAddCategoryRow')?.addEventListener('click', () => this.addCategory());

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
        const paidPaymentsList = document.getElementById('paidPaymentsList');

        if (monthlyPaymentsList) {
            const activeLoans = loans.filter(l => l.balance > 0);

            // Get payments for this month
            const thisMonthPayments = payments.filter(p => {
                const d = new Date(p.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.itemType === 'loan';
            });

            // Map which loans are already paid this month
            const paidLoanIds = new Set(thisMonthPayments.map(p => p.itemId));

            const upcomingLoans = activeLoans.filter(l => !paidLoanIds.has(l.id))
                .sort((a, b) => (parseInt(a.monthlyPaymentDay) || 0) - (parseInt(b.monthlyPaymentDay) || 0));

            const paidLoansThisMonth = activeLoans.filter(l => paidLoanIds.has(l.id));

            if (upcomingLoans.length === 0) {
                monthlyPaymentsList.innerHTML = '<div class="empty-state">No upcoming payments this month</div>';
            } else {
                monthlyPaymentsList.innerHTML = upcomingLoans.map(loan => {
                    const day = loan.monthlyPaymentDay || '??';
                    const dueDate = new Date(currentYear, currentMonth, parseInt(day));
                    return `
                        <div class="activity-item">
                            <div class="activity-item-info">
                                <div class="activity-item-name">${loan.name} (Day ${day})</div>
                                <div class="activity-item-date">Due: ${Components.formatDate(dueDate.toISOString())}</div>
                            </div>
                            <div class="activity-item-amount negative">-${Components.formatCurrency(loan.monthlyPayment)}</div>
                        </div>
                    `;
                }).join('');
            }

            if (paidPaymentsList) {
                if (paidLoansThisMonth.length === 0) {
                    paidPaymentsList.innerHTML = '<div class="empty-state">No payments sent yet</div>';
                } else {
                    paidPaymentsList.innerHTML = paidLoansThisMonth.map(loan => {
                        const payment = thisMonthPayments.find(p => p.itemId === loan.id);
                        return `
                            <div class="activity-item">
                                <div class="activity-item-info">
                                    <div class="activity-item-name">${loan.name}</div>
                                    <div class="activity-item-date">Paid: ${Components.formatDate(payment.date)}</div>
                                </div>
                                <div class="activity-item-amount positive">${Components.formatCurrency(payment.amount)}</div>
                            </div>
                        `;
                    }).join('');
                }
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
            if (sortBy === 'balance') return parseFloat(a.balance) - parseFloat(b.balance); // Changed to Low to High for easy closing
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
                document.getElementById('loanPaymentDay').value = loan.monthlyPaymentDay || '';
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
            monthlyPaymentDay: document.getElementById('loanPaymentDay').value,
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

    async downloadPDF(elementId = 'page-analytics') {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Add class for export styling
        document.body.classList.add('is-exporting-pdf');

        // Brief delay to ensure styles and layouts are fully settled
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            // Using a slightly different approach to capture the full scrolling content
            const opt = {
                margin: [0, 0],
                filename: `${elementId.replace('page-', '')}_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#090820',
                    logging: false,
                    letterRendering: true,
                    windowWidth: 1600,
                    height: element.scrollHeight, // Force capture of full height
                    scrollY: -window.scrollY // Offset any existing scroll
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true }
            };

            await html2pdf().from(element).set(opt).save();
            Components.showToast('Report downloaded', 'success', 'Done');
        } catch (error) {
            console.error('PDF Export Error:', error);
            Components.showToast('Error generating PDF', 'error', 'Error');
        } finally {
            document.body.classList.remove('is-exporting-pdf');
        }
    },

    // Spending Analysis
    updateSpendingAnalysis() {
        const expenses = Storage.getExpenses();
        const budgets = Storage.getBudgets();
        const categories = Storage.getCategories();

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const analysisList = document.getElementById('budgetAnalysisList');
        const summaryGrid = document.getElementById('budgetSummaryGrid');

        let totalBudget = 0;
        let totalSpent = 0;

        const categorySummary = categories.map(cat => {
            const budget = parseFloat(budgets[cat] || 0);
            const spent = monthlyExpenses
                .filter(e => e.category === cat)
                .reduce((sum, e) => sum + parseFloat(e.amount), 0);

            totalBudget += budget;
            totalSpent += spent;

            return { cat, budget, spent };
        }).filter(item => item.budget > 0 || item.spent > 0);

        if (summaryGrid) {
            summaryGrid.innerHTML = `
                <div class="summary-card">
                    <div class="summary-label">Total Monthly Budget</div>
                    <div class="summary-value">${Components.formatCurrency(totalBudget)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Total Spent</div>
                    <div class="summary-value ${totalSpent > totalBudget ? 'negative' : ''}">${Components.formatCurrency(totalSpent)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Remaining Budget</div>
                    <div class="summary-value ${totalBudget - totalSpent < 0 ? 'negative' : 'positive'}">
                        ${Components.formatCurrency(Math.max(0, totalBudget - totalSpent))}
                    </div>
                </div>
            `;
        }

        if (analysisList) {
            if (categorySummary.length === 0) {
                analysisList.innerHTML = '<div class="empty-state">No budgets or expenses found for this month</div>';
            } else {
                analysisList.innerHTML = categorySummary.map(item => {
                    const percent = item.budget > 0 ? Math.min(100, (item.spent / item.budget) * 100) : (item.spent > 0 ? 100 : 0);
                    const remaining = item.budget - item.spent;
                    const statusClass = percent >= 90 ? 'negative' : (percent >= 75 ? 'warning' : 'positive');

                    return `
                        <div class="activity-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
                            <div style="display: flex; justify-content: space-between;">
                                <div class="activity-item-name">${item.cat}</div>
                                <div class="activity-item-amount ${statusClass}">
                                    ${Components.formatCurrency(item.spent)} / ${Components.formatCurrency(item.budget)}
                                </div>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percent}%; background: ${percent > 100 ? 'hsl(var(--destructive))' : ''}"></div>
                            </div>
                            <div style="font-size: 0.75rem; color: hsl(var(--muted-foreground)); display: flex; justify-content: space-between;">
                                <span>${percent.toFixed(1)}% used</span>
                                <span>${remaining >= 0 ? 'Remaining: ' + Components.formatCurrency(remaining) : 'Over budget: ' + Components.formatCurrency(Math.abs(remaining))}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    },

    openBudgetModal() {
        const budgets = Storage.getBudgets();
        const categories = Storage.getCategories();
        const container = document.getElementById('budgetInputsContainer');

        container.innerHTML = categories.map(cat => `
            <div class="form-group">
                <label class="label">${cat} Budget</label>
                <input type="number" class="input budget-input" data-category="${cat}" value="${budgets[cat] || 0}" step="0.01">
            </div>
        `).join('');

        Components.showModal('modalBudget');
    },

    async saveBudgets() {
        const budgets = {};
        document.querySelectorAll('.budget-input').forEach(input => {
            budgets[input.dataset.category] = parseFloat(input.value) || 0;
        });
        await Storage.saveBudgets(budgets);
        Components.hideModal('modalBudget');
        Components.showToast('Budgets updated successfully', 'success', 'Success');
    },

    // Category CRUD
    openCategoryModal() {
        this.renderCategoryList();
        Components.showModal('modalCategory');
    },

    renderCategoryList() {
        const categories = Storage.getCategories();
        const container = document.getElementById('categoryListContainer');
        if (!container) return;

        container.innerHTML = categories.map(cat => `
            <div class="activity-item">
                <div class="activity-item-info">
                    <div class="activity-item-name">${cat}</div>
                </div>
                <button class="btn btn-destructive btn-sm" onclick="App.deleteCategory('${cat}')">Delete</button>
            </div>
        `).join('');
    },

    async addCategory() {
        const input = document.getElementById('newCategoryName');
        const name = input.value.trim();
        if (!name) return;

        const categories = Storage.getCategories();
        if (categories.includes(name)) {
            Components.showToast('Category already exists', 'warning', 'Duplicate');
            return;
        }

        const currentCategories = Storage.data.categories || [];
        currentCategories.push(name);
        await Storage.saveCategories(currentCategories);
        input.value = '';
        this.renderCategoryList();
        this.updateAllCategorySelects();
        Components.showToast('Category added', 'success', 'Success');
    },

    async deleteCategory(name) {
        if (!confirm(`Are you sure you want to delete "${name}"? This will not delete existing items but will remove the category from selection.`)) return;

        const currentCategories = Storage.data.categories || [];
        const index = currentCategories.indexOf(name);
        if (index > -1) {
            currentCategories.splice(index, 1);
            await Storage.saveCategories(currentCategories);

            // Also cleanup budget if exists
            const budgets = Storage.getBudgets();
            if (budgets[name]) {
                delete budgets[name];
                await Storage.saveBudgets(budgets);
            }

            this.renderCategoryList();
            this.updateAllCategorySelects();
            Components.showToast('Category removed', 'success', 'Deleted');
        }
    },

    updateAllCategorySelects() {
        const categories = Storage.getCategories();
        const selects = ['expenseCategory', 'filterCategory', 'analyticsCategoryFilter'];

        selects.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const currentVal = el.value;

            // Keep "All Categories" for filters
            const hasAllOption = el.querySelector('option[value=""]');
            el.innerHTML = hasAllOption ? '<option value="">All Categories</option>' : '';

            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = cat;
                el.appendChild(opt);
            });

            el.value = currentVal;
        });
    },

    updateAdvisor() {
        const loans = Storage.getLoans().filter(l => l.balance > 0);
        const budgets = Storage.getBudgets();
        const expenses = Storage.getExpenses();

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        // 1. Loan Closure Strategy (Snowball - lowest balance first as requested)
        const strategyList = document.getElementById('advisorLoanStrategy');
        if (strategyList) {
            if (loans.length === 0) {
                strategyList.innerHTML = '<div class="empty-state">No active loans to strategize</div>';
            } else {
                const sortedLoans = [...loans].sort((a, b) => parseFloat(a.balance) - parseFloat(b.balance));
                const topTarget = sortedLoans[0];

                strategyList.innerHTML = `
                    <div class="activity-item" style="border: 1px solid var(--clr-primary); border-radius: 8px; margin-bottom: 12px; background: rgba(112,48,239,0.1);">
                        <div class="activity-item-info">
                            <div class="activity-item-name">Primary Target: ${topTarget.name}</div>
                            <div class="activity-item-date">Strategy: Debt Snowball (Lowest Balance First)</div>
                        </div>
                        <div class="activity-item-amount positive">Focus Here</div>
                    </div>
                    <p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin: 12px 0;">
                        By closing <strong>${topTarget.name}</strong> first, you'll eliminate one monthly payment quickly, giving you more cash flow to tackle other debts.
                    </p>
                    <div style="font-size: 0.875rem;">
                        <strong>Next in line:</strong>
                        <ul style="margin-top: 8px; padding-left: 20px;">
                            ${sortedLoans.slice(1, 4).map(l => `<li>${l.name} (${Components.formatCurrency(l.balance)})</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
        }

        // 2. Spending Insights
        const insightList = document.getElementById('advisorSpendingInsights');
        if (insightList) {
            const overBudgetCats = [];
            for (const cat in budgets) {
                const limit = budgets[cat];
                const spent = monthlyExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + parseFloat(e.amount), 0);
                if (limit > 0 && spent > limit) {
                    overBudgetCats.push({ cat, over: spent - limit });
                }
            }

            if (overBudgetCats.length === 0) {
                insightList.innerHTML = `
                    <div class="empty-state">You're doing great! No categories are over budget.</div>
                `;
            } else {
                insightList.innerHTML = overBudgetCats.map(item => `
                    <div class="activity-item">
                        <div class="activity-item-info">
                            <div class="activity-item-name">Over Budget: ${item.cat}</div>
                            <div class="activity-item-date">Try to reduce spending in this category</div>
                        </div>
                        <div class="activity-item-amount negative">-${Components.formatCurrency(item.over)}</div>
                    </div>
                `).join('') + `
                    <p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin-top: 12px;">
                        You have exceeded your budget in ${overBudgetCats.length} categories. Focus on these areas next month to save more.
                    </p>
                `;
            }
        }
    }
};

// Export to global scope
window.App = App;
window.Components = Components;
window.Storage = Storage;
window.Charts = Charts;

document.addEventListener('DOMContentLoaded', () => App.init());
