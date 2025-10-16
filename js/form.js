// Form handling for adding/editing expenses
class ExpenseForm {
    constructor() {
        this.supabase = window.supabaseClient;
        this.isEdit = false;
        this.expenseId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkForEditMode();
        this.setupCategoryFields();
    }

    setupEventListeners() {
        // Category change handler
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.addEventListener('change', () => this.handleCategoryChange());
        }

        // Form submission
        const form = document.getElementById('expenseForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // File upload handling
        const fileInput = document.getElementById('billFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        const removeFileBtn = document.getElementById('removeFile');
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => this.removeFile());
        }

        // Auto-calculate total when relevant fields change
        const priceFields = ['price', 'pricePetrol', 'priceFood', 'priceOthers'];
        const countFields = ['count', 'persons'];
        const kmField = document.getElementById('km');

        priceFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.calculateTotal());
            }
        });

        countFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.calculateTotal());
            }
        });

        if (kmField) {
            kmField.addEventListener('input', () => this.calculateTotal());
        }
    }

    checkForEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        
        if (id) {
            this.isEdit = true;
            this.expenseId = id;
            this.loadExpenseForEdit(id);
        }
    }

    async loadExpenseForEdit(id) {
        try {
            const { data, error } = await this.supabase
                .from('expenses')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error loading expense:', error);
                this.showError('Failed to load expense for editing');
                return;
            }

            this.populateForm(data);
        } catch (error) {
            console.error('Error loading expense:', error);
            this.showError('Failed to load expense for editing');
        }
    }

    populateForm(expense) {
        // Basic fields
        document.getElementById('date').value = expense.date;
        document.getElementById('time').value = expense.time || '';
        document.getElementById('category').value = expense.category;
        document.getElementById('claimed').checked = expense.claimed;
        document.getElementById('total').value = expense.total;

        // Category-specific fields
        switch (expense.category) {
            case 'Bus':
                document.getElementById('fromPlace').value = expense.from_place || '';
                document.getElementById('toPlace').value = expense.to_place || '';
                document.getElementById('count').value = expense.count || '';
                document.getElementById('price').value = expense.price || '';
                break;
            case 'Petrol':
                document.getElementById('fromPlacePetrol').value = expense.from_place || '';
                document.getElementById('toPlacePetrol').value = expense.to_place || '';
                document.getElementById('km').value = expense.km || '';
                document.getElementById('pricePetrol').value = expense.price || '';
                break;
            case 'Food':
                document.getElementById('persons').value = expense.persons || '';
                document.getElementById('priceFood').value = expense.price || '';
                break;
            case 'Others':
                document.getElementById('itemName').value = expense.item_name || '';
                document.getElementById('priceOthers').value = expense.price || '';
                break;
        }

        // Show existing bill if available
        if (expense.bill_url) {
            this.showExistingBill(expense.bill_url);
        }

        // Update page title
        document.title = 'Edit Expense - Xpenso';
        document.querySelector('h1').textContent = 'Edit Expense';
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Update Expense';
    }

    showExistingBill(billUrl) {
        const fileName = billUrl.split('/').pop();
        const filePreview = document.getElementById('filePreview');
        const fileNameSpan = document.getElementById('fileName');
        
        if (filePreview && fileNameSpan) {
            fileNameSpan.textContent = fileName;
            filePreview.classList.remove('hidden');
        }
    }

    setupCategoryFields() {
        this.handleCategoryChange();
    }

    handleCategoryChange() {
        const category = document.getElementById('category').value;
        
        // Hide all category-specific fields
        const fieldGroups = ['busFields', 'petrolFields', 'foodFields', 'othersFields'];
        fieldGroups.forEach(groupId => {
            const group = document.getElementById(groupId);
            if (group) {
                group.classList.add('hidden');
            }
        });

        // Show relevant fields based on category
        switch (category) {
            case 'Bus':
                document.getElementById('busFields').classList.remove('hidden');
                break;
            case 'Petrol':
                document.getElementById('petrolFields').classList.remove('hidden');
                break;
            case 'Food':
                document.getElementById('foodFields').classList.remove('hidden');
                break;
            case 'Others':
                document.getElementById('othersFields').classList.remove('hidden');
                break;
        }

        this.calculateTotal();
    }

    calculateTotal() {
        const category = document.getElementById('category').value;
        let total = 0;

        switch (category) {
            case 'Bus':
                const count = parseFloat(document.getElementById('count').value) || 0;
                const price = parseFloat(document.getElementById('price').value) || 0;
                total = count * price;
                break;
            case 'Petrol':
                const km = parseFloat(document.getElementById('km').value) || 0;
                const pricePetrol = parseFloat(document.getElementById('pricePetrol').value) || 0;
                total = km * pricePetrol;
                break;
            case 'Food':
                const persons = parseFloat(document.getElementById('persons').value) || 0;
                const priceFood = parseFloat(document.getElementById('priceFood').value) || 0;
                total = persons * priceFood;
                break;
            case 'Others':
                total = parseFloat(document.getElementById('priceOthers').value) || 0;
                break;
        }

        document.getElementById('total').value = total.toFixed(2);
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                this.showError('Please select a valid file (JPG, PNG, or PDF)');
                event.target.value = '';
                return;
            }

            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                this.showError('File size must be less than 10MB');
                event.target.value = '';
                return;
            }

            this.showFilePreview(file);
        }
    }

    showFilePreview(file) {
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        
        if (filePreview && fileName) {
            fileName.textContent = file.name;
            filePreview.classList.remove('hidden');
        }
    }

    removeFile() {
        const fileInput = document.getElementById('billFile');
        const filePreview = document.getElementById('filePreview');
        
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.classList.add('hidden');
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        this.showLoading();

        try {
            let billUrl = null;
            let oldBillUrl = null;
            
            // Handle file upload if a new file is selected
            const fileInput = document.getElementById('billFile');
            if (fileInput.files.length > 0) {
                billUrl = await this.uploadFile(fileInput.files[0]);
            } else if (this.isEdit) {
                // Keep existing bill URL if editing and no new file
                const { data: existingExpense } = await this.supabase
                    .from('expenses')
                    .select('bill_url')
                    .eq('id', this.expenseId)
                    .single();
                billUrl = existingExpense?.bill_url;
            }

            // If editing and a new file is uploaded, delete the old bill
            if (this.isEdit && fileInput.files.length > 0) {
                const { data: existingExpense } = await this.supabase
                    .from('expenses')
                    .select('bill_url')
                    .eq('id', this.expenseId)
                    .single();
                oldBillUrl = existingExpense?.bill_url;
            }

            // Prepare expense data
            const expenseData = this.prepareExpenseData(billUrl);

            // Save to database
            if (this.isEdit) {
                await this.updateExpense(expenseData);
            } else {
                await this.createExpense(expenseData);
            }

            // Delete old bill from storage if it was replaced
            if (oldBillUrl) {
                try {
                    await this.deleteBillFromStorage(oldBillUrl);
                } catch (storageError) {
                    console.warn('Failed to delete old bill from storage:', storageError);
                    // Don't fail the entire operation if old bill deletion fails
                }
            }

            this.hideLoading();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error saving expense:', error);
            this.hideLoading();
            this.showError('Failed to save expense');
        }
    }

    validateForm() {
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;

        if (!date) {
            this.showError('Please select a date');
            return false;
        }

        if (!time) {
            this.showError('Please select a time');
            return false;
        }

        if (!category) {
            this.showError('Please select a category');
            return false;
        }

        // Validate category-specific required fields
        switch (category) {
            case 'Bus':
                if (!document.getElementById('fromPlace').value || 
                    !document.getElementById('toPlace').value ||
                    !document.getElementById('count').value ||
                    !document.getElementById('price').value) {
                    this.showError('Please fill in all required fields for Bus expense');
                    return false;
                }
                break;
            case 'Petrol':
                if (!document.getElementById('fromPlacePetrol').value || 
                    !document.getElementById('toPlacePetrol').value ||
                    !document.getElementById('km').value ||
                    !document.getElementById('pricePetrol').value) {
                    this.showError('Please fill in all required fields for Petrol expense');
                    return false;
                }
                break;
            case 'Food':
                if (!document.getElementById('persons').value ||
                    !document.getElementById('priceFood').value) {
                    this.showError('Please fill in all required fields for Food expense');
                    return false;
                }
                break;
            case 'Others':
                if (!document.getElementById('itemName').value ||
                    !document.getElementById('priceOthers').value) {
                    this.showError('Please fill in all required fields for Other expense');
                    return false;
                }
                break;
        }

        return true;
    }

    async uploadFile(file) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const fileExt = file.name.split('.').pop();
        const fileName = `expense_${Date.now()}.${fileExt}`;
        const filePath = `${year}/${month}/${fileName}`;

        const { data, error } = await this.supabase.storage
            .from('bills')
            .upload(filePath, file);

        if (error) {
            throw new Error(`File upload failed: ${error.message}`);
        }

        const { data: { publicUrl } } = this.supabase.storage
            .from('bills')
            .getPublicUrl(filePath);

        return publicUrl;
    }

    prepareExpenseData(billUrl) {
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const claimed = document.getElementById('claimed').checked;
        const total = parseFloat(document.getElementById('total').value);

        const baseData = {
            date,
            time,
            category,
            total,
            claimed,
            bill_url: billUrl
        };

        switch (category) {
            case 'Bus':
                return {
                    ...baseData,
                    from_place: document.getElementById('fromPlace').value,
                    to_place: document.getElementById('toPlace').value,
                    count: parseInt(document.getElementById('count').value),
                    price: parseFloat(document.getElementById('price').value)
                };
            case 'Petrol':
                return {
                    ...baseData,
                    from_place: document.getElementById('fromPlacePetrol').value,
                    to_place: document.getElementById('toPlacePetrol').value,
                    km: parseFloat(document.getElementById('km').value),
                    price: parseFloat(document.getElementById('pricePetrol').value)
                };
            case 'Food':
                return {
                    ...baseData,
                    persons: parseInt(document.getElementById('persons').value),
                    price: parseFloat(document.getElementById('priceFood').value)
                };
            case 'Others':
                return {
                    ...baseData,
                    item_name: document.getElementById('itemName').value,
                    price: parseFloat(document.getElementById('priceOthers').value)
                };
            default:
                return baseData;
        }
    }

    async createExpense(expenseData) {
        const { error } = await this.supabase
            .from('expenses')
            .insert([expenseData]);

        if (error) {
            throw new Error(`Failed to create expense: ${error.message}`);
        }
    }

    async updateExpense(expenseData) {
        const { error } = await this.supabase
            .from('expenses')
            .update(expenseData)
            .eq('id', this.expenseId);

        if (error) {
            throw new Error(`Failed to update expense: ${error.message}`);
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    showError(message) {
        alert(message); // Simple error display - you could enhance this with a toast notification
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

            console.log('Old bill deleted from storage:', filePath);
        } catch (error) {
            console.error('Error deleting bill from storage:', error);
            throw error;
        }
    }
}

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.expenseForm = new ExpenseForm();
});
