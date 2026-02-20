-- =============================================
-- Supabase Schema for Dental Clinic Management System
-- نظام إدارة عيادة الأسنان
-- =============================================
-- تعليمات: انسخ هذا الكود بالكامل والصقه في SQL Editor في Supabase ثم اضغط Run
-- =============================================

-- تفعيل uuid extension (عادةً تكون مفعلة بالفعل في Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. جدول المرضى (Patients)
-- =============================================
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamp with time zone DEFAULT now()ٍ
);

-- =============================================
-- 2. جدول الأطباء (Doctors)
-- =============================================
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  specialty text,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- 3. جدول الخدمات (Services)
-- =============================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- 4. جدول المواعيد (Appointments)
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  appointment_date timestamp with time zone NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- 5. جدول المواعيد المتاحة (Available Slots)
-- =============================================
CREATE TABLE IF NOT EXISTS available_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  is_booked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- 6. جدول سجلات AI (AI Logs)
-- =============================================
CREATE TABLE IF NOT EXISTS ai_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- فهارس لتحسين الأداء (Indexes)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_date ON available_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_available_slots_service ON available_slots(service_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_booked ON available_slots(is_booked);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);

-- =============================================
-- تفعيل Row Level Security (RLS)
-- =============================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- حذف السياسات القديمة (لو موجودة) ثم إعادة إنشائها
-- =============================================

-- Patients policies
DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can delete patients" ON patients;

CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE TO authenticated USING (true);

-- Doctors policies
DROP POLICY IF EXISTS "Authenticated users can view doctors" ON doctors;
DROP POLICY IF EXISTS "Authenticated users can insert doctors" ON doctors;
DROP POLICY IF EXISTS "Authenticated users can update doctors" ON doctors;
DROP POLICY IF EXISTS "Authenticated users can delete doctors" ON doctors;

CREATE POLICY "Authenticated users can view doctors"
  ON doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert doctors"
  ON doctors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update doctors"
  ON doctors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete doctors"
  ON doctors FOR DELETE TO authenticated USING (true);

-- Services policies
DROP POLICY IF EXISTS "Authenticated users can view services" ON services;
DROP POLICY IF EXISTS "Authenticated users can insert services" ON services;
DROP POLICY IF EXISTS "Authenticated users can update services" ON services;
DROP POLICY IF EXISTS "Authenticated users can delete services" ON services;

CREATE POLICY "Authenticated users can view services"
  ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert services"
  ON services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update services"
  ON services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete services"
  ON services FOR DELETE TO authenticated USING (true);

-- Appointments policies
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;

CREATE POLICY "Authenticated users can view appointments"
  ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appointments"
  ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appointments"
  ON appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete appointments"
  ON appointments FOR DELETE TO authenticated USING (true);

-- Available Slots policies
DROP POLICY IF EXISTS "Authenticated users can view slots" ON available_slots;
DROP POLICY IF EXISTS "Authenticated users can insert slots" ON available_slots;
DROP POLICY IF EXISTS "Authenticated users can update slots" ON available_slots;
DROP POLICY IF EXISTS "Authenticated users can delete slots" ON available_slots;

CREATE POLICY "Authenticated users can view slots"
  ON available_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert slots"
  ON available_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update slots"
  ON available_slots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete slots"
  ON available_slots FOR DELETE TO authenticated USING (true);

-- AI Logs policies
DROP POLICY IF EXISTS "Authenticated users can view ai_logs" ON ai_logs;
DROP POLICY IF EXISTS "Authenticated users can insert ai_logs" ON ai_logs;

CREATE POLICY "Authenticated users can view ai_logs"
  ON ai_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ai_logs"
  ON ai_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- تفعيل Realtime للمواعيد المتاحة
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'available_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE available_slots;
  END IF;
END $$;
