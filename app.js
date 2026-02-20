// app.js - Dental Clinic Management System
// Complete frontend with Supabase integration and modern UI

// ===== CONFIGURATION =====
const SUPABASE_URL_DEFAULT = 'https://islapcokcteyrbqeqrsu.supabase.co';
const SUPABASE_KEY_DEFAULT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGFwY29rY3RleXJicWVxcnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTA0MDgsImV4cCI6MjA4NzE2NjQwOH0.FHh6B8bz7gsgBujNp-b9ZveL9NDLOwigQEqKYZChA50';

let SUPABASE_URL = localStorage.getItem('supabase_url') || SUPABASE_URL_DEFAULT;
let SUPABASE_ANON_KEY = localStorage.getItem('supabase_key') || SUPABASE_KEY_DEFAULT;
let N8N_WEBHOOK_URL = localStorage.getItem('n8n_webhook') || '';

let supabaseClient = null;
let currentUser = null;

// ===== SUPABASE INITIALIZATION =====
function initSupabase() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      updateConnectionStatus(true);
      checkAuthAndLoadData();
      return true;
    } catch (e) {
      console.error('Supabase init error:', e);
      updateConnectionStatus(false);
      return false;
    }
  }
  updateConnectionStatus(false);
  return false;
}

// ===== AUTH CHECK =====
async function checkAuthAndLoadData() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
      // Not logged in, redirect to login page
      window.location.href = 'login.html';
      return;
    }

    currentUser = session.user;
    updateUserDisplay();
    loadAllData();
  } catch (error) {
    console.error('Auth check error:', error);
    window.location.href = 'login.html';
  }
}

// ===== UPDATE USER DISPLAY =====
function updateUserDisplay() {
  const userMenuEl = document.getElementById('user-menu');
  if (userMenuEl && currentUser) {
    const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'مستخدم';
    const initials = name.charAt(0).toUpperCase();

    userMenuEl.innerHTML = `
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${name}</div>
        <div class="user-email">${currentUser.email}</div>
      </div>
      <button class="logout-btn" onclick="handleLogout()" title="تسجيل الخروج">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    `;
  }
}

// ===== LOGOUT =====
async function handleLogout() {
  if (!confirm('هل تريد تسجيل الخروج؟')) return;

  try {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Logout error:', error);
    showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
  }
}

function updateConnectionStatus(connected) {
  const statusEl = document.getElementById('connection-status');
  if (statusEl) {
    statusEl.innerHTML = connected
      ? '<span class="status-indicator connected"></span><span>متصل بـ Supabase</span>'
      : '<span class="status-indicator disconnected"></span><span>غير متصل</span>';
  }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== NAVIGATION =====
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase
  initSupabase();

  // Load saved settings
  document.getElementById('supabase-url').value = SUPABASE_URL;
  document.getElementById('supabase-key').value = SUPABASE_ANON_KEY;
  document.getElementById('n8n-webhook').value = N8N_WEBHOOK_URL;

  // Navigation handling
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;

      // Update active nav link
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show corresponding section
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(section).classList.add('active');

      // Load data for section
      loadSectionData(section);
    });
  });

  // Form submissions
  document.getElementById('patient-form').addEventListener('submit', handlePatientSubmit);
  document.getElementById('appointment-form').addEventListener('submit', handleAppointmentSubmit);
  document.getElementById('service-form').addEventListener('submit', handleServiceSubmit);
  document.getElementById('doctor-form').addEventListener('submit', handleDoctorSubmit);
  document.getElementById('slot-form')?.addEventListener('submit', handleSlotSubmit);
  document.getElementById('supabase-settings-form').addEventListener('submit', handleSupabaseSettings);
  document.getElementById('n8n-settings-form').addEventListener('submit', handleN8nSettings);

  // Search functionality
  document.getElementById('patient-search').addEventListener('input', debounce(searchPatients, 300));

  // Close modals on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
});

function loadSectionData(section) {
  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'patients': loadPatients(); break;
    case 'appointments': loadAppointments(); break;
    case 'services': loadServices(); break;
    case 'doctors': loadDoctors(); break;
    case 'slots': loadSlotServiceFilter(); loadSlots(); break;
  }
}

async function loadAllData() {
  if (!supabaseClient) return;
  loadDashboard();
}

// ===== DASHBOARD =====
async function loadDashboard() {
  if (!supabaseClient) {
    showToast('يرجى إعداد اتصال Supabase أولاً', 'warning');
    return;
  }

  try {
    // Get counts
    const [patientsRes, appointmentsRes, servicesRes, doctorsRes] = await Promise.all([
      supabaseClient.from('patients').select('id', { count: 'exact', head: true }),
      supabaseClient.from('appointments').select('id', { count: 'exact', head: true }),
      supabaseClient.from('services').select('id', { count: 'exact', head: true }),
      supabaseClient.from('doctors').select('id', { count: 'exact', head: true })
    ]);

    document.getElementById('patients-count').textContent = patientsRes.count || 0;
    document.getElementById('appointments-count').textContent = appointmentsRes.count || 0;
    document.getElementById('services-count').textContent = servicesRes.count || 0;
    document.getElementById('doctors-count').textContent = doctorsRes.count || 0;

    // Get upcoming appointments
    const { data: upcoming } = await supabaseClient
      .from('appointments')
      .select('*, patients(full_name), doctors(full_name), services(name)')
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true })
      .limit(5);

    renderUpcomingAppointments(upcoming || []);

    // Get recent patients
    const { data: recentPatients } = await supabaseClient
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    renderRecentPatients(recentPatients || []);

  } catch (e) {
    console.error('Dashboard load error:', e);
    showToast('خطأ في تحميل لوحة التحكم', 'error');
  }
}

function renderUpcomingAppointments(appointments) {
  const container = document.getElementById('upcoming-list');
  if (!appointments.length) {
    container.innerHTML = '<p class="empty-state"><i class="fas fa-calendar-times" style="font-size:2rem;color:var(--text-muted);display:block;margin-bottom:.5rem"></i>لا توجد مواعيد قادمة</p>';
    return;
  }
  const colors = { pending: 'var(--warning)', confirmed: 'var(--primary)', completed: 'var(--success)', cancelled: 'var(--danger)' };
  container.innerHTML = appointments.map(apt => `
    <div class="appt-item">
      <div class="appt-dot" style="background:${colors[apt.status] || 'var(--primary)'};box-shadow:0 0 8px ${colors[apt.status] || 'var(--primary)'}"></div>
      <div class="appt-info">
        <div class="appt-name">${apt.patients?.full_name || 'مريض'}</div>
        <div class="appt-meta">${apt.services?.name || 'خدمة'} &bull; ${apt.doctors?.full_name || ''}</div>
      </div>
      <div style="text-align:left">
        <div class="appt-time">${new Date(apt.appointment_date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
        <span class="status-badge status-${apt.status}" style="font-size:0.72rem">${getStatusText(apt.status)}</span>
      </div>
    </div>
  `).join('');
}

function renderRecentPatients(patients) {
  const container = document.getElementById('recent-patients-list');
  if (!patients.length) {
    container.innerHTML = '<p class="empty-state"><i class="fas fa-user-slash" style="font-size:2rem;color:var(--text-muted);display:block;margin-bottom:.5rem"></i>لا يوجد مرضى حتى الآن</p>';
    return;
  }
  container.innerHTML = patients.map(p => {
    const initial = (p.full_name || '?').charAt(0).toUpperCase();
    return `
    <div class="patient-item">
      <div class="patient-av">${initial}</div>
      <div>
        <div class="patient-name">${p.full_name}</div>
        <div class="patient-phone">${p.phone || p.email || 'لا يوجد بيانات تواصل'}</div>
      </div>
    </div>`;
  }).join('');
}

// ===== PATIENTS CRUD =====
async function loadPatients() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderPatientsTable(data || []);
  } catch (e) {
    console.error('Load patients error:', e);
    showToast('خطأ في تحميل المرضى', 'error');
  }
}

function renderPatientsTable(patients) {
  const tbody = document.getElementById('patients-tbody');
  if (!patients.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">لا يوجد مرضى</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map(p => `
    <tr>
      <td>${p.full_name}</td>
      <td>${p.phone || '-'}</td>
      <td>${p.email || '-'}</td>
      <td>${p.address || '-'}</td>
      <td>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="editPatient('${p.id}')" title="تعديل">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="deletePatient('${p.id}')" title="حذف">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function searchPatients() {
  const query = document.getElementById('patient-search').value.trim();
  if (!supabaseClient) return;

  try {
    let request = supabaseClient.from('patients').select('*');

    if (query) {
      request = request.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data, error } = await request.order('created_at', { ascending: false });
    if (error) throw error;
    renderPatientsTable(data || []);
  } catch (e) {
    console.error('Search error:', e);
  }
}

async function handlePatientSubmit(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showToast('يرجى إعداد اتصال Supabase أولاً', 'warning');
    return;
  }

  const id = document.getElementById('patient-id').value;
  const patient = {
    full_name: document.getElementById('patient-name').value,
    phone: document.getElementById('patient-phone').value,
    email: document.getElementById('patient-email').value,
    address: document.getElementById('patient-address').value,
    notes: document.getElementById('patient-notes').value
  };

  try {
    if (id) {
      // Update
      const { error } = await supabaseClient.from('patients').update(patient).eq('id', id);
      if (error) throw error;
      showToast('تم تحديث بيانات المريض بنجاح', 'success');
    } else {
      // Insert
      const { data, error } = await supabaseClient.from('patients').insert([patient]).select();
      if (error) throw error;
      showToast('تم إضافة المريض بنجاح', 'success');

      // Trigger AI webhook for new patient
      await triggerAIWebhook({ event: 'patient_created', payload: data[0] });
    }

    closeModal('patient-modal');
    loadPatients();
    loadDashboard();
  } catch (e) {
    console.error('Patient save error:', e);
    showToast('خطأ في حفظ بيانات المريض', 'error');
  }
}

async function editPatient(id) {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient.from('patients').select('*').eq('id', id).single();
    if (error) throw error;

    document.getElementById('patient-id').value = data.id;
    document.getElementById('patient-name').value = data.full_name || '';
    document.getElementById('patient-phone').value = data.phone || '';
    document.getElementById('patient-email').value = data.email || '';
    document.getElementById('patient-address').value = data.address || '';
    document.getElementById('patient-notes').value = data.notes || '';
    document.getElementById('patient-modal-title').textContent = 'تعديل بيانات المريض';

    openModal('patient-modal');
  } catch (e) {
    console.error('Edit patient error:', e);
    showToast('خطأ في تحميل بيانات المريض', 'error');
  }
}

async function deletePatient(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المريض؟')) return;
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.from('patients').delete().eq('id', id);
    if (error) throw error;
    showToast('تم حذف المريض بنجاح', 'success');
    loadPatients();
    loadDashboard();
  } catch (e) {
    console.error('Delete patient error:', e);
    showToast('خطأ في حذف المريض', 'error');
  }
}

// ===== APPOINTMENTS CRUD =====
async function loadAppointments() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('appointments')
      .select('*, patients(full_name), doctors(full_name), services(name)')
      .order('appointment_date', { ascending: false });

    if (error) throw error;
    renderAppointmentsTable(data || []);

    // Load dropdowns for modal
    await loadAppointmentDropdowns();
  } catch (e) {
    console.error('Load appointments error:', e);
    showToast('خطأ في تحميل المواعيد', 'error');
  }
}

async function loadAppointmentDropdowns() {
  if (!supabaseClient) return;

  const [patientsRes, doctorsRes, servicesRes] = await Promise.all([
    supabaseClient.from('patients').select('id, full_name'),
    supabaseClient.from('doctors').select('id, full_name'),
    supabaseClient.from('services').select('id, name')
  ]);

  const patientSelect = document.getElementById('appointment-patient');
  const doctorSelect = document.getElementById('appointment-doctor');
  const serviceSelect = document.getElementById('appointment-service');

  patientSelect.innerHTML = '<option value="">اختر مريض</option>' +
    (patientsRes.data || []).map(p => `<option value="${p.id}">${p.full_name}</option>`).join('');

  doctorSelect.innerHTML = '<option value="">اختر طبيب</option>' +
    (doctorsRes.data || []).map(d => `<option value="${d.id}">${d.full_name}</option>`).join('');

  serviceSelect.innerHTML = '<option value="">اختر خدمة</option>' +
    (servicesRes.data || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

function renderAppointmentsTable(appointments) {
  const tbody = document.getElementById('appointments-tbody');
  if (!appointments.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">لا توجد مواعيد</td></tr>';
    return;
  }

  tbody.innerHTML = appointments.map(apt => `
    <tr>
      <td>${apt.patients?.full_name || '-'}</td>
      <td>${apt.doctors?.full_name || '-'}</td>
      <td>${apt.services?.name || '-'}</td>
      <td>${formatDate(apt.appointment_date)}</td>
      <td><span class="status-badge status-${apt.status}">${getStatusText(apt.status)}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="editAppointment('${apt.id}')" title="تعديل">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteAppointment('${apt.id}')" title="حذف">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function handleAppointmentSubmit(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showToast('يرجى إعداد اتصال Supabase أولاً', 'warning');
    return;
  }

  const id = document.getElementById('appointment-id').value;
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;

  const appointment = {
    patient_id: document.getElementById('appointment-patient').value,
    doctor_id: document.getElementById('appointment-doctor').value,
    service_id: document.getElementById('appointment-service').value,
    appointment_date: `${date}T${time}:00`,
    status: document.getElementById('appointment-status').value,
    notes: document.getElementById('appointment-notes').value
  };

  try {
    if (id) {
      const { error } = await supabaseClient.from('appointments').update(appointment).eq('id', id);
      if (error) throw error;
      showToast('تم تحديث الموعد بنجاح', 'success');
    } else {
      const { data, error } = await supabaseClient.from('appointments').insert([appointment]).select();
      if (error) throw error;
      showToast('تم حجز الموعد بنجاح', 'success');

      // Trigger AI webhook
      await triggerAIWebhook({ event: 'appointment_booked', payload: data[0] });
    }

    closeModal('appointment-modal');
    loadAppointments();
    loadDashboard();
  } catch (e) {
    console.error('Appointment save error:', e);
    showToast('خطأ في حفظ الموعد', 'error');
  }
}

async function editAppointment(id) {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient.from('appointments').select('*').eq('id', id).single();
    if (error) throw error;

    const aptDate = new Date(data.appointment_date);

    document.getElementById('appointment-id').value = data.id;
    document.getElementById('appointment-patient').value = data.patient_id || '';
    document.getElementById('appointment-doctor').value = data.doctor_id || '';
    document.getElementById('appointment-service').value = data.service_id || '';
    document.getElementById('appointment-date').value = aptDate.toISOString().split('T')[0];
    document.getElementById('appointment-time').value = aptDate.toTimeString().slice(0, 5);
    document.getElementById('appointment-status').value = data.status || 'pending';
    document.getElementById('appointment-notes').value = data.notes || '';
    document.getElementById('appointment-modal-title').textContent = 'تعديل الموعد';

    openModal('appointment-modal');
  } catch (e) {
    console.error('Edit appointment error:', e);
    showToast('خطأ في تحميل بيانات الموعد', 'error');
  }
}

async function deleteAppointment(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.from('appointments').delete().eq('id', id);
    if (error) throw error;
    showToast('تم حذف الموعد بنجاح', 'success');
    loadAppointments();
    loadDashboard();
  } catch (e) {
    console.error('Delete appointment error:', e);
    showToast('خطأ في حذف الموعد', 'error');
  }
}

// ===== SERVICES CRUD =====
async function loadServices() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderServicesGrid(data || []);
  } catch (e) {
    console.error('Load services error:', e);
    showToast('خطأ في تحميل الخدمات', 'error');
  }
}

function renderServicesGrid(services) {
  const grid = document.getElementById('services-grid');
  if (!services.length) {
    grid.innerHTML = '<div class="empty-state">لا توجد خدمات</div>';
    return;
  }
  const icons = ['fa-tooth', 'fa-x-ray', 'fa-syringe', 'fa-pills', 'fa-procedures', 'fa-heartbeat'];
  grid.innerHTML = services.map((s, i) => `
    <div class="service-card">
      <div class="service-icon"><i class="fas ${icons[i % icons.length]}"></i></div>
      <h4>${s.name}</h4>
      <p class="service-description">${s.description || 'خدمة طبية متخصصة'}</p>
      <div class="service-price"><i class="fas fa-pound-sign" style="font-size:1rem"></i> ${s.price} ج.م</div>
      <div class="card-actions">
        <button class="btn btn-sm btn-secondary" onclick="editService('${s.id}')">
          <i class="fas fa-edit"></i> تعديل
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteService('${s.id}')">
          <i class="fas fa-trash"></i> حذف
        </button>
      </div>
    </div>
  `).join('');
}

async function handleServiceSubmit(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showToast('يرجى إعداد اتصال Supabase أولاً', 'warning');
    return;
  }

  const id = document.getElementById('service-id').value;
  const service = {
    name: document.getElementById('service-name').value,
    price: parseFloat(document.getElementById('service-price').value),
    description: document.getElementById('service-description').value
  };

  try {
    if (id) {
      const { error } = await supabaseClient.from('services').update(service).eq('id', id);
      if (error) throw error;
      showToast('تم تحديث الخدمة بنجاح', 'success');
    } else {
      const { error } = await supabaseClient.from('services').insert([service]);
      if (error) throw error;
      showToast('تم إضافة الخدمة بنجاح', 'success');
    }

    closeModal('service-modal');
    loadServices();
    loadDashboard();
  } catch (e) {
    console.error('Service save error:', e);
    showToast('خطأ في حفظ الخدمة', 'error');
  }
}

async function editService(id) {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient.from('services').select('*').eq('id', id).single();
    if (error) throw error;

    document.getElementById('service-id').value = data.id;
    document.getElementById('service-name').value = data.name || '';
    document.getElementById('service-price').value = data.price || '';
    document.getElementById('service-description').value = data.description || '';
    document.getElementById('service-modal-title').textContent = 'تعديل الخدمة';

    openModal('service-modal');
  } catch (e) {
    console.error('Edit service error:', e);
    showToast('خطأ في تحميل بيانات الخدمة', 'error');
  }
}

async function deleteService(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.from('services').delete().eq('id', id);
    if (error) throw error;
    showToast('تم حذف الخدمة بنجاح', 'success');
    loadServices();
    loadDashboard();
  } catch (e) {
    console.error('Delete service error:', e);
    showToast('خطأ في حذف الخدمة', 'error');
  }
}

// ===== DOCTORS CRUD =====
async function loadDoctors() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('doctors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderDoctorsGrid(data || []);
  } catch (e) {
    console.error('Load doctors error:', e);
    showToast('خطأ في تحميل الأطباء', 'error');
  }
}

function renderDoctorsGrid(doctors) {
  const grid = document.getElementById('doctors-grid');
  if (!doctors.length) {
    grid.innerHTML = '<div class="empty-state">لا يوجد أطباء</div>';
    return;
  }
  grid.innerHTML = doctors.map(d => {
    const initial = (d.full_name || 'د').charAt(0).toUpperCase();
    return `
    <div class="doctor-card">
      <div class="doctor-avatar">${initial}</div>
      <div class="doctor-badge">د. ${d.specialty || 'طب عام'}</div>
      <h4>${d.full_name}</h4>
      <p class="doctor-specialty" style="display:flex;align-items:center;gap:.4rem">
        <i class="fas fa-phone" style="color:var(--primary)"></i> ${d.phone || 'لا يوجد'}
      </p>
      <p class="doctor-specialty" style="display:flex;align-items:center;gap:.4rem">
        <i class="fas fa-envelope" style="color:var(--accent)"></i> ${d.email || 'لا يوجد'}
      </p>
      <div class="card-actions">
        <button class="btn btn-sm btn-secondary" onclick="editDoctor('${d.id}')">
          <i class="fas fa-edit"></i> تعديل
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteDoctor('${d.id}')">
          <i class="fas fa-trash"></i> حذف
        </button>
      </div>
    </div>`;
  }).join('');
}

async function handleDoctorSubmit(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showToast('يرجى إعداد اتصال Supabase أولاً', 'warning');
    return;
  }

  const id = document.getElementById('doctor-id').value;
  const doctor = {
    full_name: document.getElementById('doctor-name').value,
    specialty: document.getElementById('doctor-specialty').value,
    phone: document.getElementById('doctor-phone').value,
    email: document.getElementById('doctor-email').value
  };

  try {
    if (id) {
      const { error } = await supabaseClient.from('doctors').update(doctor).eq('id', id);
      if (error) throw error;
      showToast('تم تحديث بيانات الطبيب بنجاح', 'success');
    } else {
      const { error } = await supabaseClient.from('doctors').insert([doctor]);
      if (error) throw error;
      showToast('تم إضافة الطبيب بنجاح', 'success');
    }

    closeModal('doctor-modal');
    loadDoctors();
    loadDashboard();
  } catch (e) {
    console.error('Doctor save error:', e);
    showToast('خطأ في حفظ بيانات الطبيب', 'error');
  }
}

async function editDoctor(id) {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient.from('doctors').select('*').eq('id', id).single();
    if (error) throw error;

    document.getElementById('doctor-id').value = data.id;
    document.getElementById('doctor-name').value = data.full_name || '';
    document.getElementById('doctor-specialty').value = data.specialty || '';
    document.getElementById('doctor-phone').value = data.phone || '';
    document.getElementById('doctor-email').value = data.email || '';
    document.getElementById('doctor-modal-title').textContent = 'تعديل بيانات الطبيب';

    openModal('doctor-modal');
  } catch (e) {
    console.error('Edit doctor error:', e);
    showToast('خطأ في تحميل بيانات الطبيب', 'error');
  }
}

async function deleteDoctor(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الطبيب؟')) return;
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.from('doctors').delete().eq('id', id);
    if (error) throw error;
    showToast('تم حذف الطبيب بنجاح', 'success');
    loadDoctors();
    loadDashboard();
  } catch (e) {
    console.error('Delete doctor error:', e);
    showToast('خطأ في حذف الطبيب', 'error');
  }
}

// ===== SETTINGS =====
function handleSupabaseSettings(e) {
  e.preventDefault();

  SUPABASE_URL = document.getElementById('supabase-url').value.trim();
  SUPABASE_ANON_KEY = document.getElementById('supabase-key').value.trim();

  localStorage.setItem('supabase_url', SUPABASE_URL);
  localStorage.setItem('supabase_key', SUPABASE_ANON_KEY);

  if (initSupabase()) {
    showToast('تم حفظ إعدادات Supabase والاتصال بنجاح', 'success');
  } else {
    showToast('تم حفظ الإعدادات لكن فشل الاتصال', 'warning');
  }
}

function handleN8nSettings(e) {
  e.preventDefault();

  N8N_WEBHOOK_URL = document.getElementById('n8n-webhook').value.trim();
  localStorage.setItem('n8n_webhook', N8N_WEBHOOK_URL);

  showToast('تم حفظ إعدادات n8n', 'success');
}

// ===== AI WEBHOOK INTEGRATION =====
async function triggerAIWebhook(body) {
  if (!N8N_WEBHOOK_URL) {
    console.log('No n8n webhook configured');
    return;
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      console.log('AI webhook triggered successfully');

      // Log to Supabase
      if (supabaseClient) {
        await supabaseClient.from('ai_logs').insert([{
          event_type: body.event,
          payload: body.payload
        }]);
      }
    } else {
      console.warn('AI webhook failed:', response.status);
    }
  } catch (e) {
    console.error('AI webhook error:', e);
  }
}

// ===== MODAL FUNCTIONS =====
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');

  // Reset form if it's an add operation
  if (!document.getElementById(modalId.replace('-modal', '-id'))?.value) {
    modal.querySelector('form')?.reset();
    const titleEl = modal.querySelector('[id$="-modal-title"]');
    if (titleEl) {
      const type = modalId.replace('-modal', '');
      const titles = {
        patient: 'إضافة مريض جديد',
        appointment: 'حجز موعد جديد',
        service: 'إضافة خدمة جديدة',
        doctor: 'إضافة طبيب جديد'
      };
      titleEl.textContent = titles[type] || '';
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');

  // Reset hidden ID field
  const idField = document.getElementById(modalId.replace('-modal', '-id'));
  if (idField) idField.value = '';
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusText(status) {
  const statuses = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    completed: 'مكتمل',
    cancelled: 'ملغي'
  };
  return statuses[status] || status;
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ===== AVAILABLE SLOTS =====
async function loadSlots() {
  if (!supabaseClient) return;

  const serviceFilter = document.getElementById('slot-service-filter')?.value;
  const statusFilter = document.getElementById('slot-status-filter')?.value;

  let query = supabaseClient
    .from('available_slots')
    .select('*, services(name)')
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });

  if (serviceFilter) {
    query = query.eq('service_id', serviceFilter);
  }
  if (statusFilter !== '') {
    query = query.eq('is_booked', statusFilter === 'true');
  }

  const { data, error } = await query;

  if (error) {
    showToast('خطأ في تحميل المواعيد المتاحة', 'error');
    return;
  }

  const tbody = document.getElementById('slots-tbody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">لا توجد مواعيد متاحة</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(slot => `
    <tr>
      <td>${slot.services?.name || '-'}</td>
      <td>${formatDate(slot.slot_date)}</td>
      <td>${formatTime12Hour(slot.slot_time)}</td>
      <td>
        <span class="status-badge ${slot.is_booked ? 'status-cancelled' : 'status-confirmed'}">
          ${slot.is_booked ? 'محجوز' : 'متاح'}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon ${slot.is_booked ? 'btn-success' : 'btn-warning'}" 
                onclick="toggleSlotStatus('${slot.id}', ${slot.is_booked})" 
                title="${slot.is_booked ? 'تحديد كمتاح' : 'تحديد كمحجوز'}">
          <i class="fas ${slot.is_booked ? 'fa-unlock' : 'fa-lock'}"></i>
        </button>
        <button class="btn-icon btn-danger" onclick="deleteSlot('${slot.id}')" title="حذف">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function loadSlotServiceFilter() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient.from('services').select('id, name');

  const filterSelect = document.getElementById('slot-service-filter');
  const formSelect = document.getElementById('slot-service');

  if (data) {
    const options = data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">جميع الخدمات</option>' + options;
    }
    if (formSelect) {
      formSelect.innerHTML = '<option value="">اختر الخدمة</option>' + options;
    }
  }
}

async function handleSlotSubmit(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  const id = document.getElementById('slot-id').value;
  const slotData = {
    service_id: document.getElementById('slot-service').value,
    slot_date: document.getElementById('slot-date').value,
    slot_time: document.getElementById('slot-time').value,
    is_booked: false
  };

  let result;
  if (id) {
    result = await supabaseClient.from('available_slots').update(slotData).eq('id', id);
  } else {
    result = await supabaseClient.from('available_slots').insert([slotData]);
  }

  if (result.error) {
    showToast('خطأ في حفظ الموعد', 'error');
    return;
  }

  showToast(id ? 'تم تحديث الموعد' : 'تم إضافة الموعد', 'success');
  closeModal('slot-modal');
  loadSlots();
}

async function toggleSlotStatus(id, currentStatus) {
  if (!supabaseClient) return;

  const { error } = await supabaseClient
    .from('available_slots')
    .update({ is_booked: !currentStatus })
    .eq('id', id);

  if (error) {
    showToast('خطأ في تحديث الحالة', 'error');
    return;
  }

  showToast('تم تحديث الحالة', 'success');
  loadSlots();
}

async function deleteSlot(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
  if (!supabaseClient) return;

  const { error } = await supabaseClient.from('available_slots').delete().eq('id', id);

  if (error) {
    showToast('خطأ في حذف الموعد', 'error');
    return;
  }

  showToast('تم حذف الموعد', 'success');
  loadSlots();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// تحويل الوقت لصيغة 12 ساعة
function formatTime12Hour(timeStr) {
  if (!timeStr) return '-';

  const [hours, minutes] = timeStr.split(':');
  let hour = parseInt(hours);
  const ampm = hour >= 12 ? 'مساءً' : 'صباحاً';

  hour = hour % 12;
  hour = hour ? hour : 12; // 0 تصبح 12

  return `${hour}:${minutes} ${ampm}`;
}

// الاشتراك في التحديثات الفورية
function subscribeToSlotUpdates() {
  if (!supabaseClient) return;

  supabaseClient
    .channel('available_slots_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'available_slots' },
      (payload) => {
        console.log('Slot updated:', payload);
        loadSlots(); // إعادة تحميل الجدول
      }
    )
    .subscribe();
}

// استدعاء الاشتراك عند تحميل قسم المواعيد
const originalLoadSlots = loadSlots;
loadSlots = async function () {
  await originalLoadSlots();
  subscribeToSlotUpdates();
};

// Make functions globally available
window.openModal = openModal;
window.closeModal = closeModal;
window.editPatient = editPatient;
window.deletePatient = deletePatient;
window.editAppointment = editAppointment;
window.deleteAppointment = deleteAppointment;
window.editService = editService;
window.deleteService = deleteService;
window.editDoctor = editDoctor;
window.deleteDoctor = deleteDoctor;
window.loadSlots = loadSlots;
window.toggleSlotStatus = toggleSlotStatus;
window.deleteSlot = deleteSlot;
