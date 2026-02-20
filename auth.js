// auth.js — Authentication Handler with Google OAuth
// ============================================================

// ===== SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://islapcokcteyrbeqrsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGFwY29rY3RleXJicWVxcnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTA0MDgsImV4cCI6MjA4NzE2NjQwOH0.FHh6B8bz7gsgBujNp-b9ZveL9NDLOwigQEqKYZChA50';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab =>
        tab.addEventListener('click', () => switchTab(tab.dataset.tab))
    );

    // Form submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Google buttons
    document.getElementById('google-login-btn').addEventListener('click', handleGoogleAuth);
    document.getElementById('google-register-btn').addEventListener('click', handleGoogleAuth);

    // Handle OAuth redirect result
    handleOAuthRedirect();
});

// ===== HANDLE OAUTH REDIRECT =====
async function handleOAuthRedirect() {
    // Supabase automatically handles the hash fragment on redirect
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session && window.location.hash.includes('access_token')) {
        localStorage.setItem('supabase_url', SUPABASE_URL);
        localStorage.setItem('supabase_key', SUPABASE_ANON_KEY);
        showMessage('تم تسجيل الدخول بـ Google بنجاح! جاري التحويل...', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    }
}

// ===== GOOGLE AUTH =====
async function handleGoogleAuth() {
    const btn = event.currentTarget;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحويل إلى Google...';
    btn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });
        if (error) throw error;
        // Browser will redirect automatically
    } catch (err) {
        console.error('Google auth error:', err);
        showMessage('فشل تسجيل الدخول بـ Google. تأكد من تفعيل Google Provider في Supabase.', 'error');
        btn.innerHTML = '<svg class="google-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> تسجيل الدخول بـ Google';
        btn.disabled = false;
    }
}

// ===== CHECK EXISTING SESSION =====
async function checkExistingSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && !window.location.hash.includes('access_token')) {
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error('Session check error:', err);
    }
}

// ===== TAB SWITCHING =====
function switchTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tabName)
    );
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`${tabName}-form`).classList.add('active');
    hideMessage();
}

// ===== LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        showMessage('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');
        localStorage.setItem('supabase_url', SUPABASE_URL);
        localStorage.setItem('supabase_key', SUPABASE_ANON_KEY);
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);

    } catch (err) {
        console.error('Login error:', err);
        let msg = 'فشل تسجيل الدخول';
        if (err.message.includes('Invalid login credentials')) msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        else if (err.message.includes('Email not confirmed')) msg = 'يرجى تأكيد بريدك الإلكتروني أولاً';
        showMessage(msg, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
}

// ===== REGISTER =====
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const btn = document.getElementById('register-btn');

    if (password !== confirmPassword) { showMessage('كلمتا المرور غير متطابقتين', 'error'); return; }
    if (password.length < 6) { showMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email, password,
            options: { data: { full_name: name } }
        });
        if (error) throw error;

        if (data.user && !data.session) {
            showMessage('تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب', 'success');
        } else {
            showMessage('تم إنشاء الحساب بنجاح! جاري التحويل...', 'success');
            localStorage.setItem('supabase_url', SUPABASE_URL);
            localStorage.setItem('supabase_key', SUPABASE_ANON_KEY);
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
    } catch (err) {
        console.error('Register error:', err);
        let msg = 'فشل إنشاء الحساب';
        if (err.message.includes('already registered')) msg = 'هذا البريد الإلكتروني مسجل بالفعل';
        else if (err.message.includes('valid email')) msg = 'يرجى إدخال بريد إلكتروني صحيح';
        showMessage(msg, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب';
}

// ===== HELPERS =====
function showMessage(message, type) {
    const el = document.getElementById('auth-message');
    el.textContent = message;
    el.className = `auth-message show ${type}`;
}
function hideMessage() {
    document.getElementById('auth-message').className = 'auth-message';
}
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}
