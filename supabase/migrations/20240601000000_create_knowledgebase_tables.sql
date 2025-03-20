-- Create Documentation Table
CREATE TABLE IF NOT EXISTS documentation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  author TEXT NOT NULL,
  version TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  parent_id UUID REFERENCES documentation(id),
  is_version_history BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Troubleshooting Guide Table
CREATE TABLE IF NOT EXISTS troubleshooting_guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  equipment_type TEXT NOT NULL,
  fault_type TEXT NOT NULL,
  solutions JSONB DEFAULT '[]',
  author TEXT NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Best Practices Table
CREATE TABLE IF NOT EXISTS best_practices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  benefits_and_outcomes TEXT[] NOT NULL DEFAULT '{}',
  author TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Storage Bucket for Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up public access for the images bucket
DROP POLICY IF EXISTS "Public Access Images" ON storage.objects;
CREATE POLICY "Public Access Images" ON storage.objects FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Public Upload Images" ON storage.objects;
CREATE POLICY "Public Upload Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE troubleshooting_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_practices ENABLE ROW LEVEL SECURITY;

-- Create Policies for Documentation
DROP POLICY IF EXISTS "Allow public read access to documentation" ON documentation;
CREATE POLICY "Allow public read access to documentation" ON documentation 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to documentation" ON documentation;
CREATE POLICY "Allow public insert to documentation" ON documentation 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to documentation" ON documentation;
CREATE POLICY "Allow public update to documentation" ON documentation 
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete from documentation" ON documentation;
CREATE POLICY "Allow public delete from documentation" ON documentation 
  FOR DELETE USING (true);

-- Create Policies for Troubleshooting Guides
DROP POLICY IF EXISTS "Allow public read access to troubleshooting_guides" ON troubleshooting_guides;
CREATE POLICY "Allow public read access to troubleshooting_guides" ON troubleshooting_guides
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to troubleshooting_guides" ON troubleshooting_guides;
CREATE POLICY "Allow public insert to troubleshooting_guides" ON troubleshooting_guides
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to troubleshooting_guides" ON troubleshooting_guides;
CREATE POLICY "Allow public update to troubleshooting_guides" ON troubleshooting_guides
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete from troubleshooting_guides" ON troubleshooting_guides;
CREATE POLICY "Allow public delete from troubleshooting_guides" ON troubleshooting_guides
  FOR DELETE USING (true);

-- Create Policies for Best Practices
DROP POLICY IF EXISTS "Allow public read access to best_practices" ON best_practices;
CREATE POLICY "Allow public read access to best_practices" ON best_practices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to best_practices" ON best_practices;
CREATE POLICY "Allow public insert to best_practices" ON best_practices
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to best_practices" ON best_practices;
CREATE POLICY "Allow public update to best_practices" ON best_practices
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete from best_practices" ON best_practices;
CREATE POLICY "Allow public delete from best_practices" ON best_practices
  FOR DELETE USING (true);

-- Create Functions for Automatic Timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Triggers for Automatic Updated At Timestamps
DROP TRIGGER IF EXISTS documentation_updated_at ON documentation;
CREATE TRIGGER documentation_updated_at
BEFORE UPDATE ON documentation
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS troubleshooting_guides_updated_at ON troubleshooting_guides;
CREATE TRIGGER troubleshooting_guides_updated_at
BEFORE UPDATE ON troubleshooting_guides
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS best_practices_updated_at ON best_practices;
CREATE TRIGGER best_practices_updated_at
BEFORE UPDATE ON best_practices
FOR EACH ROW EXECUTE PROCEDURE update_updated_at(); 