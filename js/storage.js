// Firebase Firestore Management
const Storage = {
    // Shared data state
    data: {
        loans: [],
        payments: [],
        income: [],
        expenses: [],
        budgets: {},
        categories: []
    },

    // Initialize listeners
    init(onUpdateCallback) {
        console.log("Firebase Storage Initializing...");

        // Listeners for real-time synchronization
        const collections = ['loans', 'payments', 'income', 'expenses'];
        let loadedCount = 0;

        collections.forEach(colName => {
            db.collection(colName).onSnapshot(snapshot => {
                const items = [];
                snapshot.forEach(doc => {
                    items.push({ id: doc.id, ...doc.data() });
                });

                this.data[colName] = items;

                // Track initial load completion
                if (loadedCount < collections.length) {
                    loadedCount++;
                    if (loadedCount === collections.length && onUpdateCallback) {
                        onUpdateCallback();
                    }
                } else if (onUpdateCallback) {
                    // Trigger update on subsequent changes
                    onUpdateCallback();
                }
            }, error => {
                console.error(`Firebase Error in ${colName}:`, error);
                Components.showToast(`Error connecting to ${colName}`, 'error', 'Database Error');
            });
        });

        // Listen for budgets and categories settings
        db.collection('settings').doc('finances').onSnapshot(doc => {
            if (doc.exists) {
                const settings = doc.data();
                this.data.budgets = settings.budgets || {};
                this.data.categories = settings.categories || [];
            } else {
                this.data.budgets = {};
                this.data.categories = [];
            }
            if (onUpdateCallback) onUpdateCallback();
        });
    },

    // Loans
    getLoans() {
        return this.data.loans;
    },

    async saveLoan(loan) {
        const docData = { ...loan };
        const id = docData.id;
        delete docData.id;

        if (id) {
            await db.collection('loans').doc(id).update(docData);
        } else {
            docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('loans').add(docData);
        }
    },

    async deleteLoan(id) {
        // Delete loan
        await db.collection('loans').doc(id).delete();

        // Also delete related payments
        const paymentsRef = db.collection('payments').where('itemId', '==', id);
        const snapshot = await paymentsRef.get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    },

    // Payments
    getPayments() {
        return this.data.payments;
    },

    async savePayment(payment) {
        const docData = { ...payment };
        const id = docData.id;
        delete docData.id;

        let oldAmount = 0;
        let oldItemId = null;

        // If editing, find old state to adjust balance
        if (id) {
            const oldDoc = this.data.payments.find(p => p.id === id);
            if (oldDoc) {
                oldAmount = parseFloat(oldDoc.amount || 0);
                oldItemId = oldDoc.itemId;
            }
        }

        // Restore old balance if editing
        if (oldItemId) {
            const loanRef = db.collection('loans').doc(oldItemId);
            const loanDoc = await loanRef.get();
            if (loanDoc.exists) {
                const currentBalance = parseFloat(loanDoc.data().balance);
                await loanRef.update({ balance: currentBalance + oldAmount });
            }
        }

        // Apply new payment balance reduction
        const loanRef = db.collection('loans').doc(payment.itemId);
        const loanDoc = await loanRef.get();
        if (loanDoc.exists) {
            const currentBalance = parseFloat(loanDoc.data().balance);
            await loanRef.update({
                balance: Math.max(0, currentBalance - parseFloat(payment.amount))
            });
        }

        if (id) {
            await db.collection('payments').doc(id).update(docData);
        } else {
            docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('payments').add(docData);
        }
    },

    async deletePayment(id) {
        const payment = this.data.payments.find(p => p.id === id);
        if (payment && payment.itemType === 'loan') {
            const loanRef = db.collection('loans').doc(payment.itemId);
            const loanDoc = await loanRef.get();
            if (loanDoc.exists) {
                const currentBalance = parseFloat(loanDoc.data().balance);
                await loanRef.update({ balance: currentBalance + parseFloat(payment.amount) });
            }
        }
        await db.collection('payments').doc(id).delete();
    },

    // Income
    getIncome() {
        return this.data.income;
    },

    async saveIncome(income) {
        const docData = { ...income };
        const id = docData.id;
        delete docData.id;

        if (id) {
            await db.collection('income').doc(id).update(docData);
        } else {
            docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('income').add(docData);
        }
    },

    async deleteIncome(id) {
        await db.collection('income').doc(id).delete();
    },

    // Expenses
    getExpenses() {
        return this.data.expenses;
    },

    async saveExpense(expense) {
        const docData = { ...expense };
        const id = docData.id;
        delete docData.id;

        if (id) {
            await db.collection('expenses').doc(id).update(docData);
        } else {
            docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('expenses').add(docData);
        }
    },

    async deleteExpense(id) {
        await db.collection('expenses').doc(id).delete();
    },

    // Budgets
    getBudgets() {
        return this.data.budgets;
    },

    async saveBudgets(budgets) {
        await db.collection('settings').doc('finances').set({
            budgets: budgets,
            categories: this.data.categories
        }, { merge: true });
    },

    // Categories persistence
    async saveCategories(categories) {
        await db.collection('settings').doc('finances').set({
            categories: categories,
            budgets: this.data.budgets
        }, { merge: true });
    },

    // Helpers
    getCategories() {
        const categories = new Set(this.data.categories);
        // Fallback to existing data categories
        this.data.loans.forEach(loan => {
            if (loan.category) categories.add(loan.category);
        });
        this.data.expenses.forEach(exp => {
            if (exp.category) categories.add(exp.category);
        });

        // Ensure standard defaults are always there if nothing else
        if (categories.size === 0) {
            ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Utilities', 'Health', 'Other'].forEach(c => categories.add(c));
        }

        return Array.from(categories);
    },

    getTags() {
        const tags = new Set();
        this.data.loans.forEach(loan => {
            if (loan.tags) {
                loan.tags.split(',').forEach(tag => {
                    const trimmed = tag.trim();
                    if (trimmed) tags.add(trimmed);
                });
            }
        });
        return Array.from(tags);
    },

    // Clear all data from all collections (Fresh Start)
    async clearAllData() {
        const collections = ['loans', 'payments', 'income', 'expenses'];
        for (const colName of collections) {
            const snapshot = await db.collection(colName).get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Cleared collection: ${colName}`);
        }
        await db.collection('settings').doc('finances').delete();
    }
};
