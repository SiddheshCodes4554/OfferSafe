-- ══════════════════════════════════════════════════════════════
-- SafeOffer — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. STUDENTS (B2C — synced from Supabase Auth)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE students (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT DEFAULT '',
  college     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Students can read/update only their own profile
CREATE POLICY "students_select_own"  ON students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "students_update_own"  ON students FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "students_insert_own"  ON students FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create a student row when a new user signs up with role = 'student'
CREATE OR REPLACE FUNCTION handle_new_student()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'student' THEN
    INSERT INTO public.students (id, email, full_name, college)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'college', '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_student();


-- ──────────────────────────────────────────────────────────────
-- 2. STUDENT SCANS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE student_scans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  input_type       TEXT NOT NULL CHECK (input_type IN ('pdf', 'text')),
  trust_score      REAL NOT NULL,
  risk_level       TEXT NOT NULL,
  analysis_layers  JSONB DEFAULT '[]',
  findings         JSONB DEFAULT '[]',
  red_flag_count   INT DEFAULT 0,
  text_preview     TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scans_student   ON student_scans(student_id);
CREATE INDEX idx_scans_score     ON student_scans(trust_score);
CREATE INDEX idx_scans_created   ON student_scans(created_at DESC);

ALTER TABLE student_scans ENABLE ROW LEVEL SECURITY;

-- Students can only see & create their own scans
CREATE POLICY "scans_select_own"  ON student_scans FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "scans_insert_own"  ON student_scans FOR INSERT WITH CHECK (auth.uid() = student_id);


-- ──────────────────────────────────────────────────────────────
-- 3. ORGANIZATIONS (B2B — colleges / placement cells)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  domain      TEXT DEFAULT '',
  logo_url    TEXT DEFAULT '',
  plan_tier   TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'enterprise')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Org readable by its members (via org_members check)
CREATE POLICY "org_select_members" ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );


-- ──────────────────────────────────────────────────────────────
-- 4. ORG MEMBERS (staff accounts per college)
-- ──────────────────────────────────────────────────────────────
CREATE TYPE org_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT DEFAULT '',
  role        org_role NOT NULL DEFAULT 'viewer',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_members_org     ON org_members(org_id);
CREATE INDEX idx_members_user    ON org_members(user_id);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members in the same org
CREATE POLICY "members_select_same_org" ON org_members FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- Only admins can insert new members
CREATE POLICY "members_insert_admin" ON org_members FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    -- Also allow the very first member (org creator)
    OR NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = org_members.org_id)
  );


-- ──────────────────────────────────────────────────────────────
-- 5. ORG OFFERS (job offers submitted by placement cells)
-- ──────────────────────────────────────────────────────────────
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'flagged');

CREATE TABLE org_offers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_by        UUID REFERENCES org_members(id),
  company_name        TEXT NOT NULL,
  company_domain      TEXT DEFAULT '',
  position_title      TEXT NOT NULL,
  offer_text          TEXT NOT NULL,
  trust_score         REAL,
  risk_level          TEXT,
  analysis_layers     JSONB DEFAULT '[]',
  findings            JSONB DEFAULT '[]',
  red_flag_count      INT DEFAULT 0,
  status              verification_status NOT NULL DEFAULT 'pending',
  reviewer_notes      TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT now(),
  reviewed_at         TIMESTAMPTZ
);

CREATE INDEX idx_offers_org      ON org_offers(org_id);
CREATE INDEX idx_offers_status   ON org_offers(status);
CREATE INDEX idx_offers_score    ON org_offers(trust_score);
CREATE INDEX idx_offers_created  ON org_offers(created_at DESC);

ALTER TABLE org_offers ENABLE ROW LEVEL SECURITY;

-- Org members can see offers from their own org
CREATE POLICY "offers_select_own_org" ON org_offers FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- Admins and editors can insert offers
CREATE POLICY "offers_insert_editor" ON org_offers FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Only admins can update offers (verify/reject/flag)
CREATE POLICY "offers_update_admin" ON org_offers FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ──────────────────────────────────────────────────────────────
-- Auto-create org member when portal user signs up
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_org_admin()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'org_admin' THEN
    -- Create the organization
    INSERT INTO public.organizations (name, domain)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization'),
      COALESCE(NEW.raw_user_meta_data->>'org_domain', '')
    )
    RETURNING id INTO new_org_id;

    -- Create the org member as admin
    INSERT INTO public.org_members (org_id, user_id, email, full_name, role)
    VALUES (
      new_org_id,
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'admin'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger to handle both roles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Student signup
  IF NEW.raw_user_meta_data->>'role' = 'student' THEN
    INSERT INTO public.students (id, email, full_name, college)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'college', '')
    );

  -- Org admin signup
  ELSIF NEW.raw_user_meta_data->>'role' = 'org_admin' THEN
    INSERT INTO public.organizations (name, domain)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization'),
      COALESCE(NEW.raw_user_meta_data->>'org_domain', '')
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.org_members (org_id, user_id, email, full_name, role)
    VALUES (
      new_org_id,
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'admin'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
