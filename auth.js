// auth.js - Authentication Handler for Dental Clinic System

// ===== SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://hcmslqruxqbjrnryztub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXNscXJ1eHFianJucnl6dHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDcyMjIsImV4cCI6MjA4MDg4MzIyMn0.LWSIMmFCXKdQtnKYNvedB5dzaQysUO_u4FLQDKVV9Gg';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== DOM ELEMENTS =====
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    checkExistingSession();

    // Tab switching
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Form submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
});

// ===== CHECK EXISTING SESSION =====
async function checkExistingSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            // User is already logged in, redirect to main page
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// ===== TAB SWITCHING =====
function switchTab(tabName) {
    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${tabName}-form`).classList.add('active');

    // Clear messages
    hideMessage();
}

// ===== LOGIN HANDLER =====
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('.auth-btn');

    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Success - redirect to main page
        showMessage('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');

        // Save credentials to localStorage for app.js
        localStorage.setItem('supabase_url', SUPABASE_URL);
        localStorage.setItem('supabase_key', SUPABASE_ANON_KEY);

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'فشل تسجيل الدخول';

        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً';
        }

        showMessage(errorMessage, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
}

// ===== REGISTER HANDLER =====
async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const btn = e.target.querySelector('.auth-btn');

    // Validate passwords match
    if (password !== confirmPassword) {
        showMessage('كلمتا المرور غير متطابقتين', 'error');
        return;
    }

    // Validate password length
    if (password.length < 6) {
        showMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }

    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && !data.session) {
            showMessage('تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب', 'success');
        } else {
            // Auto-login after registration
            showMessage('تم إنشاء الحساب بنجاح! جاري التحويل...', 'success');

            localStorage.setItem('supabase_url', SUPABASE_URL);
            localStorage.setItem('supabase_key', SUPABASE_ANON_KEY);

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }

    } catch (error) {
        console.error('Register error:', error);
        let errorMessage = 'فشل إنشاء الحساب';

        if (error.message.includes('already registered')) {
            errorMessage = 'هذا البريد الإلكتروني مسجل بالفعل';
        } else if (error.message.includes('valid email')) {
            errorMessage = 'يرجى إدخال بريد إلكتروني صحيح';
        }

        showMessage(errorMessage, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب';
}

// ===== MESSAGE DISPLAY =====
function showMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = message;
    messageEl.className = `auth-message show ${type}`;
}

function hideMessage() {
    const messageEl = document.getElementById('auth-message');
    messageEl.className = 'auth-message';
}

// ===== PASSWORD TOGGLE =====
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const btn = input.nextElementSibling;
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}
