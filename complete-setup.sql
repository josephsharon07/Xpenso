-- Company Expenses Tracker - Complete Supabase Setup
-- This includes both database and storage setup
-- Run these commands in your Supabase SQL Editor

-- ===========================================
-- 1. DATABASE SETUP
-- ===========================================

-- Drop existing table if it exists (for fresh start)
DROP TABLE IF EXISTS expenses CASCADE;

-- Create expenses table (keeping original structure)
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    time TIME,
    category TEXT NOT NULL CHECK (category IN ('Bus', 'Petrol', 'Food', 'Others')),
    from_place TEXT,
    to_place TEXT,
    count INTEGER,
    km DECIMAL(10,2),
    item_name TEXT,
    price DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    persons INTEGER,
    claimed BOOLEAN DEFAULT FALSE,
    bill_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read for everyone" ON expenses;
DROP POLICY IF EXISTS "Allow insert for everyone" ON expenses;
DROP POLICY IF EXISTS "Allow update for everyone" ON expenses;
DROP POLICY IF EXISTS "Allow delete for everyone" ON expenses;

-- Create strict authenticated-only policies
-- Only authenticated users can read expenses
CREATE POLICY "Allow read for authenticated users only" ON expenses
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can insert expenses
CREATE POLICY "Allow insert for authenticated users only" ON expenses
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        coalesce(auth.jwt()->>'email', '') != ''
    );

-- Only authenticated users can update expenses
CREATE POLICY "Allow update for authenticated users only" ON expenses
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        coalesce(auth.jwt()->>'email', '') != ''
    );

-- Only authenticated users can delete expenses
CREATE POLICY "Allow delete for authenticated users only" ON expenses
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        coalesce(auth.jwt()->>'email', '') != ''
    );

-- Create indexes for better performance (keeping existing indexes)
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_claimed ON expenses(claimed);

-- Create a function to automatically calculate total field (keeping existing function)
CREATE OR REPLACE FUNCTION calculate_expense_total()
RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.category
        WHEN 'Bus' THEN
            NEW.total := NEW.count * NEW.price;
        WHEN 'Petrol' THEN
            NEW.total := NEW.km * NEW.price;
        WHEN 'Food' THEN
            NEW.total := NEW.persons * NEW.price;
        WHEN 'Others' THEN
            NEW.total := NEW.price;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate total
CREATE TRIGGER trigger_calculate_total
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_total();

-- Create a view for expense summaries with enhanced security
CREATE OR REPLACE VIEW expense_summary AS
SELECT 
    category,
    COUNT(*) as total_count,
    SUM(total) as total_amount,
    SUM(CASE WHEN claimed THEN total ELSE 0 END) as claimed_amount,
    SUM(CASE WHEN NOT claimed THEN total ELSE 0 END) as pending_amount
FROM expenses
WHERE auth.role() = 'authenticated'  -- Only show data to authenticated users
GROUP BY category;

-- Secure the view
REVOKE ALL ON expense_summary FROM anon;
GRANT SELECT ON expense_summary TO authenticated;

-- ===========================================
-- 2. STORAGE SETUP
-- ===========================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow public read access to bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow update in bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from bills" ON storage.objects;

-- Create strict storage policies for bills
CREATE POLICY "Allow authenticated read access to bills" ON storage.objects
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        bucket_id = 'bills' AND 
        coalesce(auth.jwt()->>'email', '') != ''
    );

CREATE POLICY "Allow authenticated upload to bills" ON storage.objects
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        bucket_id = 'bills' AND 
        coalesce(auth.jwt()->>'email', '') != '' AND
        (
            name LIKE '%.jpg' OR 
            name LIKE '%.jpeg' OR 
            name LIKE '%.png' OR 
            name LIKE '%.pdf'
        )
    );

CREATE POLICY "Allow authenticated update in bills" ON storage.objects
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        bucket_id = 'bills' AND 
        coalesce(auth.jwt()->>'email', '') != ''
    );

CREATE POLICY "Allow authenticated delete from bills" ON storage.objects
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        bucket_id = 'bills' AND 
        coalesce(auth.jwt()->>'email', '') != ''
    );

-- ===========================================
-- 3. SAMPLE DATA (Optional)
-- ===========================================

-- Insert some sample data for testing
INSERT INTO expenses (date, time, category, from_place, to_place, count, price, claimed) VALUES
('2024-01-15', '09:30:00', 'Bus', 'Office', 'Client Site', 2, 5.50, false);

INSERT INTO expenses (date, time, category, from_place, to_place, km, price, claimed) VALUES
('2024-01-16', '14:15:00', 'Petrol', 'Home', 'Office', 15.5, 0.65, true);

INSERT INTO expenses (date, time, category, persons, price, claimed) VALUES
('2024-01-17', '12:45:00', 'Food', 3, 12.00, false);

INSERT INTO expenses (date, time, category, item_name, price, claimed) VALUES
('2024-01-18', '16:20:00', 'Others', 'Office Supplies', 25.99, true);

-- ===========================================
-- 4. VERIFICATION QUERIES
-- ===========================================

-- Check if table was created successfully
SELECT 'Expenses table created successfully' as status;

-- Check if policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'expenses';

-- Check if storage policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check sample data
SELECT * FROM expenses ORDER BY created_at DESC;

-- Check expense summary
SELECT * FROM expense_summary;



