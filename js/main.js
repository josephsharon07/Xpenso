// Main dashboard functionality
class ExpenseManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.expenses = [];
        this.filteredExpenses = [];
        this.deleteId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadExpenses();
    }

    exportPDF() {
        try {
            const { jsPDF } = window.jspdf || {};
            if (!jsPDF || !window.jspdf || !('autoTable' in (jsPDF.API || {}))) {
                this.showError('PDF libraries failed to load');
                return;
            }

            const doc = new jsPDF('p', 'pt');

            const title = 'Xpenso - Expenses Report';
            doc.setFontSize(14);
            doc.text(title, 40, 32);

            const rows = this.filteredExpenses.map(e => [
                this.formatDate(e.date),
                this.formatTime(e.time || ''),
                e.category,
                this.getDescription(e),
                `₹${(parseFloat(e.total) || 0).toFixed(2)}`,
                e.claimed ? 'Claimed' : 'Pending'
            ]);

            const head = [['Date', 'Time', 'Category', 'Description', 'Amount', 'Status']];

            doc.autoTable({
                head,
                body: rows,
                startY: 50,
                styles: { fontSize: 9, cellPadding: 6 },
                headStyles: { fillColor: [37, 99, 235] },
                columnStyles: {
                    3: { cellWidth: 240 } // description wider
                },
                didDrawPage: (data) => {
                    const pageSize = doc.internal.pageSize;
                    const pageWidth = pageSize.getWidth ? pageSize.getWidth() : pageSize.width;
                    const footer = `Generated: ${new Date().toLocaleString()}`;
                    doc.setFontSize(8);
                    doc.text(footer, pageWidth - 40, pageSize.height - 20, { align: 'right' });
                }
            });

            const total = this.filteredExpenses.reduce((s, e) => s + (parseFloat(e.total) || 0), 0);
            doc.setFontSize(11);
            doc.text(`Total: ₹${total.toFixed(2)}`, 40, doc.lastAutoTable.finalY + 20);

            const fileName = `xpenso-report-${new Date().toISOString().slice(0,10)}.pdf`;
            doc.save(fileName);
            this.showSuccess('PDF exported');
        } catch (err) {
            console.error('Export PDF error', err);
            this.showError('Failed to export PDF');
        }
    }

    exportExcel() {
        try {
            if (!window.XLSX || !window.XLSX.utils) {
                this.showError('Excel library failed to load');
                return;
            }

            const data = this.filteredExpenses.map(e => ({
                Date: this.formatDate(e.date),
                Time: this.formatTime(e.time || ''),
                Category: e.category,
                Description: this.getDescription(e),
                Amount: parseFloat(e.total) || 0,
                Status: e.claimed ? 'Claimed' : 'Pending'
            }));

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

            const fileName = `xpenso-data-${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            this.showSuccess('Excel exported');
        } catch (err) {
            console.error('Export Excel error', err);
            this.showError('Failed to export Excel');
        }
    }

    setupEventListeners() {
        // Search and filter inputs
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
		const statusFilter = document.getElementById('statusFilter');
		const fromDate = document.getElementById('fromDate');
        const toDate = document.getElementById('toDate');
		const sortOrder = document.getElementById('sortOrder');
		const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterExpenses());
        }
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterExpenses());
        }
		if (statusFilter) {
			statusFilter.addEventListener('change', () => this.filterExpenses());
		}
        if (fromDate) {
            fromDate.addEventListener('change', () => this.filterExpenses());
        }
        if (toDate) {
            toDate.addEventListener('change', () => this.filterExpenses());
        }
		if (sortOrder) {
			sortOrder.addEventListener('change', () => this.filterExpenses());
		}
		if (clearFiltersBtn) {
			clearFiltersBtn.addEventListener('click', () => this.clearFilters());
		}

        // Export buttons
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportPDF());
        }
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportExcel());
        }

        // Delete modal
        const deleteModal = document.getElementById('deleteModal');
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');

        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => this.hideDeleteModal());
        }
        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.confirmDelete());
        }
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    this.hideDeleteModal();
                }
            });
        }

        // Bill modal
        const billModal = document.getElementById('billModal');
        const closeBillModal = document.getElementById('closeBillModal');
        const downloadBill = document.getElementById('downloadBill');
        const fullscreenBill = document.getElementById('fullscreenBill');

        if (closeBillModal) {
            closeBillModal.addEventListener('click', () => this.hideBillModal());
        }
        if (downloadBill) {
            downloadBill.addEventListener('click', () => this.downloadBill());
        }
        if (fullscreenBill) {
            fullscreenBill.addEventListener('click', () => this.toggleFullscreen());
        }
        if (billModal) {
            billModal.addEventListener('click', (e) => {
                if (e.target === billModal) {
                    this.hideBillModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideBillModal();
                this.hideDeleteModal();
            }
        });
    }

    async loadExpenses() {
        try {
            this.showLoading();
            
            const { data, error } = await this.supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                console.error('Error loading expenses:', error);
                this.showError('Failed to load expenses');
                return;
            }

            this.expenses = data || [];
            this.filteredExpenses = [...this.expenses];
            this.renderExpenses();
            this.updateSummary();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.showError('Failed to load expenses');
            this.hideLoading();
        }
    }

    filterExpenses() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
		const category = document.getElementById('categoryFilter')?.value || '';
		const status = document.getElementById('statusFilter')?.value || '';
        const fromDate = document.getElementById('fromDate')?.value || '';
		const toDate = document.getElementById('toDate')?.value || '';
		const sort = document.getElementById('sortOrder')?.value || 'date_desc';

        this.filteredExpenses = this.expenses.filter(expense => {
            // Search filter
            const searchMatch = !searchTerm || 
                expense.category.toLowerCase().includes(searchTerm) ||
                (expense.from_place && expense.from_place.toLowerCase().includes(searchTerm)) ||
                (expense.to_place && expense.to_place.toLowerCase().includes(searchTerm)) ||
                (expense.item_name && expense.item_name.toLowerCase().includes(searchTerm));

            // Category filter
            const categoryMatch = !category || expense.category === category;

			// Status filter
			const statusMatch = !status || (status === 'claimed' ? expense.claimed : !expense.claimed);

			// Date filters
            const dateMatch = (!fromDate || expense.date >= fromDate) && 
                             (!toDate || expense.date <= toDate);

			return searchMatch && categoryMatch && statusMatch && dateMatch;
        });

		// Apply sorting
		this.applySorting(sort);

		this.renderExpenses();
		this.updateSummary();
		this.updateResultsCount();
    }

	updateResultsCount() {
		const badge = document.getElementById('resultsCount');
		if (!badge) return;
		const count = this.filteredExpenses.length;
		badge.textContent = `${count} result${count === 1 ? '' : 's'}`;
	}

	clearFilters() {
		const searchInput = document.getElementById('searchInput');
		const categoryFilter = document.getElementById('categoryFilter');
		const statusFilter = document.getElementById('statusFilter');
		const fromDate = document.getElementById('fromDate');
		const toDate = document.getElementById('toDate');
		const sortOrder = document.getElementById('sortOrder');

		if (searchInput) searchInput.value = '';
		if (categoryFilter) categoryFilter.value = '';
		if (statusFilter) statusFilter.value = '';
		if (fromDate) fromDate.value = '';
		if (toDate) toDate.value = '';
		if (sortOrder) sortOrder.value = 'date_desc';

		this.filterExpenses();
	}

	applySorting(sort) {
		const parseDate = (d) => new Date(d).getTime() || 0;
		this.filteredExpenses.sort((a, b) => {
			switch (sort) {
				case 'date_asc':
					return parseDate(a.date) - parseDate(b.date);
				case 'amount_desc':
					return (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0);
				case 'amount_asc':
					return (parseFloat(a.total) || 0) - (parseFloat(b.total) || 0);
				case 'km_desc':
					return (parseFloat(b.km) || 0) - (parseFloat(a.km) || 0);
				case 'km_asc':
					return (parseFloat(a.km) || 0) - (parseFloat(b.km) || 0);
				case 'date_desc':
				default:
					return parseDate(b.date) - parseDate(a.date);
			}
		});
	}

    renderExpenses() {
        const tbody = document.getElementById('expensesTableBody');
        const mobileList = document.getElementById('mobileExpensesList');
        const emptyState = document.getElementById('emptyState');
        
        if (!tbody || !mobileList) return;

        if (this.filteredExpenses.length === 0) {
            tbody.innerHTML = '';
            mobileList.innerHTML = '';
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
            // Keep summary in sync even when no results
            this.updateSummary();
            return;
        }

        if (emptyState) {
            emptyState.classList.add('hidden');
        }

        // Desktop table view
        tbody.innerHTML = this.filteredExpenses.map(expense => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.formatDate(expense.date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.formatTime(expense.time)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getCategoryColor(expense.category)}">
                        ${expense.category}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${this.getDescription(expense)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹${parseFloat(expense.total).toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expense.claimed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        <i class="fas ${expense.claimed ? 'fa-check-circle' : 'fa-clock'} mr-1"></i>
                        ${expense.claimed ? 'Claimed' : 'Pending'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${expense.bill_url ? 
                        `<button onclick="expenseManager.showBillModal('${expense.bill_url}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-file-alt"></i>
                        </button>` : 
                        '<span class="text-gray-400">No bill</span>'
                    }
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <a href="add.html?id=${expense.id}" class="text-blue-600 hover:text-blue-900">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button onclick="expenseManager.showDeleteModal('${expense.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Mobile card view
        mobileList.innerHTML = this.filteredExpenses.map(expense => `
            <div class="p-4 border-b border-gray-200 last:border-b-0">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                            <div class="text-xs text-gray-500">
                                <div>${this.formatDate(expense.date)}</div>
                                <div>${this.formatTime(expense.time)}</div>
                            </div>
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getCategoryColor(expense.category)}">
                                ${expense.category}
                            </span>
                        </div>
                        <p class="text-sm text-gray-900 font-medium">${this.getDescription(expense)}</p>
                        <p class="text-lg font-semibold text-gray-900">₹${parseFloat(expense.total).toFixed(2)}</p>
                    </div>
                </div>
                
                <div class="flex items-center justify-between mt-3">
                    <div class="flex items-center space-x-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${expense.claimed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                            <i class="fas ${expense.claimed ? 'fa-check-circle' : 'fa-clock'} mr-1"></i>
                            ${expense.claimed ? 'Claimed' : 'Pending'}
                        </span>
                        ${expense.bill_url ? 
                            `<button onclick="expenseManager.showBillModal('${expense.bill_url}')" class="text-blue-600 hover:text-blue-800 p-1">
                                <i class="fas fa-file-alt text-sm"></i>
                            </button>` : 
                            '<span class="text-gray-400 text-xs">No bill</span>'
                        }
                    </div>
                    
                    <div class="flex items-center space-x-3">
                        <a href="add.html?id=${expense.id}" class="text-blue-600 hover:text-blue-900 p-1">
                            <i class="fas fa-edit text-sm"></i>
                        </a>
                        <button onclick="expenseManager.showDeleteModal('${expense.id}')" class="text-red-600 hover:text-red-900 p-1">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Ensure summary numbers are in sync after rendering
        this.updateSummary();
    }

    getDescription(expense) {
        switch (expense.category) {
            case 'Bus':
                return `${expense.from_place} → ${expense.to_place} (${expense.count} tickets)`;
            case 'Petrol':
                return `${expense.from_place} → ${expense.to_place} (${expense.km} km)`;
            case 'Food':
                return `Food for ${expense.persons} person${expense.persons > 1 ? 's' : ''}`;
            case 'Others':
                return expense.item_name || 'Other expense';
            default:
                return 'Expense';
        }
    }

    getCategoryColor(category) {
        const colors = {
            'Bus': 'bg-blue-100 text-blue-800',
            'Petrol': 'bg-green-100 text-green-800',
            'Food': 'bg-orange-100 text-orange-800',
            'Others': 'bg-gray-100 text-gray-800'
        };
        return colors[category] || 'bg-gray-100 text-gray-800';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        if (!timeString) return '--:--';
        
        // Convert time string (HH:MM:SS) to HH:MM format
        const time = timeString.split(':');
        if (time.length >= 2) {
            return `${time[0]}:${time[1]}`;
        }
        return timeString;
    }

    updateSummary() {
        // Always prefer filtered list when available (even if empty)
        const list = Array.isArray(this.filteredExpenses) ? this.filteredExpenses : this.expenses;
		const total = list.reduce((sum, expense) => sum + (parseFloat(expense.total) || 0), 0);
		const claimed = list
			.filter(expense => expense.claimed)
			.reduce((sum, expense) => sum + (parseFloat(expense.total) || 0), 0);
		const pending = total - claimed;

		const totalKm = list
			.filter(expense => expense.category === 'Petrol')
			.reduce((sum, expense) => sum + (parseFloat(expense.km) || 0), 0);
		const unclaimedKm = list
			.filter(expense => expense.category === 'Petrol' && !expense.claimed)
			.reduce((sum, expense) => sum + (parseFloat(expense.km) || 0), 0);

        const totalElement = document.getElementById('totalExpenses');
        const claimedElement = document.getElementById('claimedExpenses');
        const pendingElement = document.getElementById('pendingExpenses');
		const totalKmElement = document.getElementById('totalKm');
		const unclaimedKmElement = document.getElementById('unclaimedKm');

        if (totalElement) totalElement.textContent = `₹${total.toFixed(2)}`;
        if (claimedElement) claimedElement.textContent = `₹${claimed.toFixed(2)}`;
		if (pendingElement) pendingElement.textContent = `₹${pending.toFixed(2)}`;
		if (totalKmElement) totalKmElement.textContent = `${totalKm.toFixed(2)} km`;
		if (unclaimedKmElement) unclaimedKmElement.textContent = `${unclaimedKm.toFixed(2)} km`;
    }

    showDeleteModal(id) {
        this.deleteId = id;
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideDeleteModal() {
        this.deleteId = null;
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async confirmDelete() {
        if (!this.deleteId) return;

        try {
            // First, get the expense data to check for bill URL
            const { data: expense, error: fetchError } = await this.supabase
                .from('expenses')
                .select('bill_url')
                .eq('id', this.deleteId)
                .single();

            if (fetchError) {
                console.error('Error fetching expense:', fetchError);
                this.showError('Failed to fetch expense data');
                return;
            }

            // Delete the bill from storage if it exists
            let billDeleted = false;
            if (expense.bill_url) {
                try {
                    await this.deleteBillFromStorage(expense.bill_url);
                    billDeleted = true;
                } catch (storageError) {
                    console.warn('Failed to delete bill from storage:', storageError);
                    // Continue with expense deletion even if bill deletion fails
                }
            }

            // Delete the expense from database
            const { error } = await this.supabase
                .from('expenses')
                .delete()
                .eq('id', this.deleteId);

            if (error) {
                console.error('Error deleting expense:', error);
                this.showError('Failed to delete expense');
                return;
            }

            this.hideDeleteModal();
            this.loadExpenses(); // Reload expenses
            
            // Show success message
            if (billDeleted) {
                this.showSuccess('Expense and associated bill deleted successfully');
            } else {
                this.showSuccess('Expense deleted successfully');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showError('Failed to delete expense');
        }
    }

    async deleteBillFromStorage(billUrl) {
        try {
            // Extract file path from URL
            // URL format: https://[project].supabase.co/storage/v1/object/public/bills/[path]
            const urlParts = billUrl.split('/storage/v1/object/public/bills/');
            if (urlParts.length !== 2) {
                throw new Error('Invalid bill URL format');
            }
            
            const filePath = urlParts[1];
            
            // Delete from storage
            const { error } = await this.supabase.storage
                .from('bills')
                .remove([filePath]);

            if (error) {
                throw new Error(`Storage deletion failed: ${error.message}`);
            }

            console.log('Bill deleted from storage:', filePath);
        } catch (error) {
            console.error('Error deleting bill from storage:', error);
            throw error;
        }
    }

    showLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.add('hidden');
        }
    }

    showError(message) {
        // Simple error display - you could enhance this with a toast notification
        alert(message);
    }

    showSuccess(message) {
        // Simple success display - you could enhance this with a toast notification
        // For now, using a temporary alert, but this could be replaced with a toast
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    // Bill Modal Methods
    showBillModal(billUrl) {
        this.currentBillUrl = billUrl;
        this.isFullscreen = false;
        const modal = document.getElementById('billModal');
        const billContent = document.getElementById('billContent');
        
        if (!modal || !billContent) return;

        // Show loading state
        billContent.innerHTML = `
            <div class="text-center p-8">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-600 mb-4"></i>
                <p class="text-gray-600">Loading bill...</p>
            </div>
        `;

        // Show modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Determine file type and render accordingly
        const fileExtension = billUrl.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
            // Image file
            const img = document.createElement('img');
            img.src = billUrl;
            img.alt = 'Bill/Receipt';
            img.className = 'max-w-full max-h-full object-contain rounded-lg shadow-lg';
            img.style.maxHeight = '70vh';
            
            img.onload = () => {
                billContent.innerHTML = '';
                billContent.appendChild(img);
            };
            
            img.onerror = () => {
                billContent.innerHTML = `
                    <div class="text-center p-8">
                        <i class="fas fa-exclamation-triangle text-3xl text-red-500 mb-4"></i>
                        <p class="text-gray-600 mb-4">Failed to load image</p>
                        <button onclick="expenseManager.downloadBill()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                            <i class="fas fa-download mr-2"></i>Download File
                        </button>
                    </div>
                `;
            };
        } else if (fileExtension === 'pdf') {
            // PDF file - embed directly
            const pdfEmbed = document.createElement('embed');
            pdfEmbed.src = billUrl;
            pdfEmbed.type = 'application/pdf';
            pdfEmbed.className = 'w-full h-full border-0 rounded-lg';
            pdfEmbed.style.minHeight = '70vh';
            
            // Add fallback message for browsers that don't support PDF embedding
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'text-center p-8';
            fallbackDiv.innerHTML = `
                <i class="fas fa-file-pdf text-4xl text-red-500 mb-4"></i>
                <p class="text-gray-600 mb-4">PDF viewer not supported in this browser</p>
                <div class="space-x-3">
                    <a href="${billUrl}" target="_blank" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md inline-block">
                        <i class="fas fa-external-link-alt mr-2"></i>Open PDF
                    </a>
                    <button onclick="expenseManager.downloadBill()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-block">
                        <i class="fas fa-download mr-2"></i>Download PDF
                    </button>
                </div>
            `;
            
            // Try to embed PDF first
            billContent.innerHTML = '';
            billContent.appendChild(pdfEmbed);
            
            // Check if PDF embedding is supported after a delay
            setTimeout(() => {
                // Check if the embed element has loaded content
                if (!pdfEmbed.offsetHeight || pdfEmbed.offsetHeight < 50) {
                    // PDF embedding failed, show fallback
                    billContent.innerHTML = '';
                    billContent.appendChild(fallbackDiv);
                }
            }, 2000);
        } else {
            // Other file types - show download link
            setTimeout(() => {
                billContent.innerHTML = `
                    <div class="text-center p-8">
                        <i class="fas fa-file-alt text-6xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600 mb-4">This file type cannot be previewed</p>
                        <button onclick="expenseManager.downloadBill()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                            <i class="fas fa-download mr-2"></i>Download File
                        </button>
                    </div>
                `;
            }, 500); // Small delay to show loading state
        }
    }

    hideBillModal() {
        const modal = document.getElementById('billModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scrolling
        }
        this.currentBillUrl = null;
        this.isFullscreen = false;
        
        // Reset fullscreen button icon
        const fullscreenBtn = document.getElementById('fullscreenBill');
        if (fullscreenBtn) {
            const icon = fullscreenBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-expand';
            }
        }
    }

    async downloadBill() {
        if (!this.currentBillUrl) return;

        try {
            // Show loading state
            const downloadBtn = document.getElementById('downloadBill');
            const originalIcon = downloadBtn?.querySelector('i');
            if (originalIcon) {
                originalIcon.className = 'fas fa-spinner fa-spin';
            }

            // Fetch the file as blob
            const response = await fetch(this.currentBillUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            
            // Extract filename from URL
            const urlParts = this.currentBillUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            // Create download link with blob
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            // Restore button icon
            if (originalIcon) {
                originalIcon.className = 'fas fa-download';
            }

        } catch (error) {
            console.error('Error downloading bill:', error);
            this.showError('Failed to download bill');
            
            // Restore button icon
            const downloadBtn = document.getElementById('downloadBill');
            const originalIcon = downloadBtn?.querySelector('i');
            if (originalIcon) {
                originalIcon.className = 'fas fa-download';
            }
        }
    }

    toggleFullscreen() {
        const modal = document.getElementById('billModal');
        const fullscreenBtn = document.getElementById('fullscreenBill');
        const icon = fullscreenBtn?.querySelector('i');
        
        if (!modal) return;

        if (this.isFullscreen) {
            // Exit fullscreen
            modal.classList.remove('fixed', 'inset-0', 'z-50');
            modal.classList.add('fixed', 'inset-0', 'z-50');
            modal.querySelector('.bg-white').classList.remove('w-screen', 'h-screen', 'max-w-none', 'max-h-none');
            modal.querySelector('.bg-white').classList.add('max-w-6xl', 'max-h-[90vh]');
            if (icon) icon.className = 'fas fa-expand';
            this.isFullscreen = false;
        } else {
            // Enter fullscreen
            modal.querySelector('.bg-white').classList.add('w-screen', 'h-screen', 'max-w-none', 'max-h-none');
            modal.querySelector('.bg-white').classList.remove('max-w-6xl', 'max-h-[90vh]');
            if (icon) icon.className = 'fas fa-compress';
            this.isFullscreen = true;
        }
    }
}

// Initialize expense manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.expenseManager = new ExpenseManager();
});
