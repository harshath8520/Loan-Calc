// UI Component Helpers
const Components = {
    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format percentage
    formatPercent(value) {
        return `${parseFloat(value || 0).toFixed(2)}%`;
    },

    // Show modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    // Hide modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // Show page
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.add('active');
        }

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === pageId.replace('page-', '')) {
                link.classList.add('active');
            }
        });
    },

    // Create item card HTML (Simplified for Loans only)
    createItemCard(item, type = 'loan') {
        const tags = item.tags ? item.tags.split(',').map(t => t.trim()).filter(t => t) : [];
        return `
            <div class="item-card" data-id="${item.id}" data-type="${type}">
                <div class="item-header">
                    <div>
                        <div class="item-title">${item.name}</div>
                        ${item.category ? `<div class="badge" style="margin-top: 4px;">${item.category}</div>` : ''}
                    </div>
                    <div class="item-balance">${this.formatCurrency(item.balance)}</div>
                </div>
                <div class="item-details">
                    <div class="item-detail">
                        <span class="item-detail-label">Principal</span>
                        <span class="item-detail-value">${this.formatCurrency(item.principal)}</span>
                    </div>
                    <div class="item-detail">
                        <span class="item-detail-label">Monthly Payment</span>
                        <span class="item-detail-value">${this.formatCurrency(item.monthlyPayment)}</span>
                    </div>
                </div>
                ${tags.length > 0 ? `
                    <div class="item-tags">
                        ${tags.map(tag => `<span class="badge">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="App.editItem('${item.id}', '${type}')">Edit</button>
                    <button class="btn btn-destructive btn-sm" onclick="App.deleteItem('${item.id}', '${type}')">Delete</button>
                </div>
            </div>
        `;
    },

    // Create activity item HTML
    createActivityItem(label, amount, date, type = 'default') {
        const amountClass = type === 'income' ? 'activity-item-amount positive' :
            type === 'expense' || type === 'payment' ? 'activity-item-amount negative' :
                'activity-item-amount';
        const prefix = type === 'income' ? '+' : (type === 'expense' || type === 'payment' ? '-' : '');

        return `
            <div class="activity-item">
                <div class="activity-item-info">
                    <div class="activity-item-name">${label}</div>
                    <div class="activity-item-date">${this.formatDate(date)}</div>
                </div>
                <div class="${amountClass}">${prefix}${this.formatCurrency(amount)}</div>
            </div>
        `;
    },

    // Populate select options
    populateSelect(selectId, items, type) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear existing options except first
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${this.formatCurrency(item.balance)})`;
            option.dataset.type = type;
            select.appendChild(option);
        });
    },

    // Populate all items select (Simplified for Loans only)
    populateAllItemsSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear existing options except first
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        const loans = Storage.getLoans();

        if (loans.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Loans';
            loans.forEach(loan => {
                const option = document.createElement('option');
                option.value = loan.id;
                option.textContent = `${loan.name} (${this.formatCurrency(loan.balance)})`;
                option.dataset.type = 'loan';
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
    },

    // Clear form
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            // Clear hidden id fields
            const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            hiddenInputs.forEach(input => input.value = '');
        }
    },

    // Show toast notification
    showToast(message, type = 'info', title = null) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.hideToast(toast);
        });

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            this.hideToast(toast);
        }, 4000);
    },

    // Hide toast notification
    hideToast(toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    // Animate number counting
    animateValue(element, start, end, duration = 1000, formatter = null) {
        if (!element) return;

        const startTime = performance.now();
        const isCurrency = formatter === this.formatCurrency;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out cubic)
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = start + (end - start) * easeOutCubic;

            if (isCurrency) {
                element.textContent = this.formatCurrency(current);
            } else if (formatter) {
                element.textContent = formatter(current);
            } else {
                element.textContent = Math.round(current).toLocaleString('en-IN');
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure final value is exact
                if (isCurrency) {
                    element.textContent = this.formatCurrency(end);
                } else if (formatter) {
                    element.textContent = formatter(end);
                } else {
                    element.textContent = Math.round(end).toLocaleString('en-IN');
                }
                element.classList.remove('animating');
            }
        };

        element.classList.add('animating');
        requestAnimationFrame(animate);
    }
};
