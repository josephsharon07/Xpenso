// Authentication utilities
class AuthManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.init();
    }

    init() {
        // Check for existing session on page load
        this.checkSession();
        
        // Set up logout button if it exists
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Set up login form if it exists
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async checkSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('Error checking session:', error);
                return;
            }

            if (session) {
                this.showAuthenticatedUI();
                // Redirect from login page if already authenticated
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = 'index.html';
                }
            } else {
                this.showUnauthenticatedUI();
                // Redirect to login if trying to access protected pages
                if (window.location.pathname.includes('add.html')) {
                    window.location.href = 'login.html';
                }
            }
        } catch (error) {
            console.error('Error in checkSession:', error);
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                this.showError(error.message);
                return;
            }

            if (data.user) {
                this.showSuccess('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            this.showError('An unexpected error occurred');
            console.error('Login error:', error);
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
                return;
            }

            // Clear any stored data
            localStorage.removeItem('supabase.auth.token');
            
            // Redirect to login page
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    showAuthenticatedUI() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
        }
    }

    showUnauthenticatedUI() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.remove('hidden');
            
            // Hide success message if visible
            const successDiv = document.getElementById('successMessage');
            if (successDiv) {
                successDiv.classList.add('hidden');
            }
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        const successText = document.getElementById('successText');
        
        if (successDiv && successText) {
            successText.textContent = message;
            successDiv.classList.remove('hidden');
            
            // Hide error message if visible
            const errorDiv = document.getElementById('errorMessage');
            if (errorDiv) {
                errorDiv.classList.add('hidden');
            }
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                successDiv.classList.add('hidden');
            }, 3000);
        }
    }

    // Check if user is authenticated
    async isAuthenticated() {
        const { data: { session } } = await this.supabase.auth.getSession();
        return !!session;
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
