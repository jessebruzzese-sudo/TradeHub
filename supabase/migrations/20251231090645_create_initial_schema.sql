/*
  # Initial Database Schema for Job Marketplace Platform

  ## Overview
  Complete database schema for a contractor/subcontractor job marketplace platform with messaging,
  applications, reviews, and admin functionality.

  ## New Tables Created

  ### 1. users
  Core user table storing contractors, subcontractors, and admins
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email address
  - `name` (text) - User's full name
  - `role` (text) - User role: contractor, subcontractor, or admin
  - `trust_status` (text) - Verification status: pending, approved, verified
  - `avatar` (text) - Profile image URL
  - `bio` (text) - User biography
  - `rating` (numeric) - Overall rating score
  - `reliability_rating` (numeric) - Reliability-specific rating
  - `completed_jobs` (integer) - Count of completed jobs
  - `member_since` (timestamptz) - Account creation date
  - `business_name` (text) - Business name for contractors
  - `abn` (text) - Australian Business Number
  - `trades` (jsonb) - Array of trade skills
  - `location` (text) - User location/suburb
  - `radius` (integer) - Service radius in km
  - `availability` (jsonb) - Weekly availability schedule
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. jobs
  Job postings from contractors
  - `id` (uuid, primary key) - Unique job identifier
  - `contractor_id` (uuid, foreign key) - References users table
  - `title` (text) - Job title
  - `description` (text) - Detailed job description
  - `trade_category` (text) - Trade type (Electrical, Plumbing, etc.)
  - `location` (text) - Job location/suburb
  - `postcode` (text) - Job postcode
  - `dates` (jsonb) - Array of job dates
  - `start_time` (text) - Start time
  - `duration` (integer) - Duration in days
  - `pay_type` (text) - Payment type: fixed, hourly, quote_required
  - `rate` (numeric) - Payment rate/amount
  - `attachments` (jsonb) - Array of attachment URLs
  - `status` (text) - Job status workflow state
  - `selected_subcontractor` (uuid) - Selected subcontractor ID
  - `confirmed_subcontractor` (uuid) - Confirmed subcontractor ID
  - `start_date` (timestamptz) - Actual start date
  - `cancelled_at` (timestamptz) - Cancellation timestamp
  - `cancelled_by` (uuid) - User who cancelled
  - `cancellation_reason` (text) - Reason for cancellation
  - `was_accepted_or_confirmed_before_cancellation` (boolean) - Cancellation tracking
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. applications
  Subcontractor applications to jobs
  - `id` (uuid, primary key) - Unique application identifier
  - `job_id` (uuid, foreign key) - References jobs table
  - `subcontractor_id` (uuid, foreign key) - References users table
  - `status` (text) - Application status
  - `message` (text) - Application message
  - `selected_dates` (jsonb) - Selected dates for availability
  - `applied_at` (timestamptz) - Application timestamp
  - `responded_at` (timestamptz) - Response timestamp
  - `withdrawn_at` (timestamptz) - Withdrawal timestamp
  - `withdrawn_reason` (text) - Reason for withdrawal
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. conversations
  Messaging conversations between contractors and subcontractors
  - `id` (uuid, primary key) - Unique conversation identifier
  - `job_id` (uuid, foreign key) - References jobs table
  - `contractor_id` (uuid, foreign key) - References users table
  - `subcontractor_id` (uuid, foreign key) - References users table
  - `created_at` (timestamptz) - Conversation creation timestamp
  - `updated_at` (timestamptz) - Last message timestamp

  ### 5. messages
  Individual messages within conversations
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, foreign key) - References conversations table
  - `sender_id` (uuid, foreign key) - References users table
  - `text` (text) - Message content
  - `attachments` (jsonb) - Array of attachment URLs
  - `is_system_message` (boolean) - Flag for automated messages
  - `created_at` (timestamptz) - Message timestamp

  ### 6. reviews
  User reviews with moderation and reliability tracking
  - `id` (uuid, primary key) - Unique review identifier
  - `job_id` (uuid, foreign key) - References jobs table
  - `author_id` (uuid, foreign key) - References users table (reviewer)
  - `recipient_id` (uuid, foreign key) - References users table (reviewee)
  - `rating` (integer) - Overall rating (1-5)
  - `text` (text) - Review text
  - `is_reliability_review` (boolean) - Flag for reliability reviews
  - `reliability_score` (integer) - Reliability rating (1-5)
  - `communication_score` (integer) - Communication rating (1-5)
  - `moderation_status` (text) - pending, approved, rejected
  - `reply` (jsonb) - Reply object with text and timestamp
  - `created_at` (timestamptz) - Review creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 7. audit_logs
  Admin action tracking
  - `id` (uuid, primary key) - Unique audit log identifier
  - `admin_id` (uuid, foreign key) - References users table
  - `action_type` (text) - Type of admin action
  - `target_user_id` (uuid) - Target user for action
  - `target_job_id` (uuid) - Target job for action
  - `target_review_id` (uuid) - Target review for action
  - `details` (text) - Action details description
  - `metadata` (jsonb) - Additional metadata
  - `created_at` (timestamptz) - Action timestamp

  ### 8. admin_notes
  Internal admin notes about users
  - `id` (uuid, primary key) - Unique note identifier
  - `admin_id` (uuid, foreign key) - References users table (admin who created note)
  - `user_id` (uuid, foreign key) - References users table (subject of note)
  - `note` (text) - Note content
  - `created_at` (timestamptz) - Note creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 9. notifications
  User notifications for platform events
  - `id` (uuid, primary key) - Unique notification identifier
  - `user_id` (uuid, foreign key) - References users table
  - `type` (text) - Notification type
  - `title` (text) - Notification title
  - `description` (text) - Notification description
  - `job_id` (uuid) - Related job ID
  - `conversation_id` (uuid) - Related conversation ID
  - `link` (text) - Deep link URL
  - `read` (boolean) - Read status
  - `created_at` (timestamptz) - Notification timestamp

  ## Security (Row Level Security)

  - RLS enabled on all tables
  - Users can read/update their own profiles
  - Contractors can create/manage their jobs
  - Subcontractors can apply to jobs and view their applications
  - Both parties can access conversations they're part of
  - Messages are accessible to conversation participants
  - Reviews are public for reading, restricted for writing
  - Admin tables restricted to admin users only
  - Notifications are private to each user

  ## Indexes

  - Foreign key indexes for optimal join performance
  - User email index for login lookups
  - Job status and contractor indexes for dashboard queries
  - Application status and subcontractor indexes
  - Conversation participant indexes
  - Message conversation index with timestamp ordering
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('contractor', 'subcontractor', 'admin')),
  trust_status text NOT NULL DEFAULT 'pending' CHECK (trust_status IN ('pending', 'approved', 'verified')),
  avatar text,
  bio text,
  rating numeric DEFAULT 0,
  reliability_rating numeric,
  completed_jobs integer DEFAULT 0,
  member_since timestamptz DEFAULT now(),
  business_name text,
  abn text,
  trades jsonb DEFAULT '[]'::jsonb,
  location text,
  radius integer,
  availability jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  trade_category text NOT NULL,
  location text NOT NULL,
  postcode text NOT NULL,
  dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_time text,
  duration integer,
  pay_type text NOT NULL CHECK (pay_type IN ('fixed', 'hourly', 'quote_required')),
  rate numeric NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_approval', 'accepted', 'confirmed', 'completed', 'cancelled', 'closed')),
  selected_subcontractor uuid REFERENCES users(id),
  confirmed_subcontractor uuid REFERENCES users(id),
  start_date timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id),
  cancellation_reason text,
  was_accepted_or_confirmed_before_cancellation boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'selected', 'accepted', 'declined', 'confirmed', 'completed')),
  message text,
  selected_dates jsonb DEFAULT '[]'::jsonb,
  applied_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_reason text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, subcontractor_id)
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, contractor_id, subcontractor_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_system_message boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text NOT NULL,
  is_reliability_review boolean DEFAULT false,
  reliability_score integer CHECK (reliability_score >= 1 AND reliability_score <= 5),
  communication_score integer CHECK (communication_score >= 1 AND communication_score <= 5),
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  reply jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, author_id, recipient_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  target_review_id uuid REFERENCES reviews(id) ON DELETE SET NULL,
  details text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Admin notes table
CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_subcontractor_id ON applications(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_conversations_job_id ON conversations(job_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contractor_id ON conversations(contractor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_subcontractor_id ON conversations(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_recipient_id ON reviews(recipient_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user_id ON admin_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for jobs table
CREATE POLICY "Anyone can view open jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Contractors can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = contractor_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'contractor')
  );

CREATE POLICY "Contractors can update own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

CREATE POLICY "Contractors can delete own jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = contractor_id);

-- RLS Policies for applications table
CREATE POLICY "Users can view applications for their jobs or their own applications"
  ON applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = subcontractor_id OR
    auth.uid() IN (SELECT contractor_id FROM jobs WHERE jobs.id = applications.job_id)
  );

CREATE POLICY "Subcontractors can create applications"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = subcontractor_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'subcontractor')
  );

CREATE POLICY "Subcontractors can update own applications"
  ON applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = subcontractor_id)
  WITH CHECK (auth.uid() = subcontractor_id);

CREATE POLICY "Contractors can update applications for their jobs"
  ON applications FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT contractor_id FROM jobs WHERE jobs.id = applications.job_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT contractor_id FROM jobs WHERE jobs.id = applications.job_id)
  );

-- RLS Policies for conversations table
CREATE POLICY "Participants can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = contractor_id OR auth.uid() = subcontractor_id);

CREATE POLICY "Participants can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = contractor_id OR auth.uid() = subcontractor_id);

-- RLS Policies for messages table
CREATE POLICY "Participants can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.contractor_id = auth.uid() OR conversations.subcontractor_id = auth.uid())
    )
  );

CREATE POLICY "Participants can create messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.contractor_id = auth.uid() OR conversations.subcontractor_id = auth.uid())
    )
  );

-- RLS Policies for reviews table
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (moderation_status = 'approved' OR author_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create reviews for jobs they participated in"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = reviews.job_id
      AND (jobs.contractor_id = auth.uid() OR jobs.confirmed_subcontractor = auth.uid())
    )
  );

CREATE POLICY "Recipients can reply to reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- RLS Policies for audit_logs table
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for admin_notes table
CREATE POLICY "Admins can view admin notes"
  ON admin_notes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can create admin notes"
  ON admin_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update admin notes"
  ON admin_notes FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for notifications table
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
