-- Company Expenses Tracker - Complete Supabase Setup
-- This includes both database and storage setup
-- Run these commands in your Supabase SQL Editor

-- ===========================================
-- 1. DATABASE SETUP
-- ===========================================

-- Drop existing table if it exists (for fresh start)
DROP TABLE IF EXISTS expenses CASCADE;

-- Create the expenses table
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

-- Create permissive policies for testing (allows all operations without auth)
-- Allow everyone to read expenses
CREATE POLICY "Allow read for everyone" ON expenses FOR SELECT USING (true);

-- Allow everyone to insert expenses
CREATE POLICY "Allow insert for everyone" ON expenses FOR INSERT WITH CHECK (true);

-- Allow everyone to update expenses
CREATE POLICY "Allow update for everyone" ON expenses FOR UPDATE USING (true);

-- Allow everyone to delete expenses
CREATE POLICY "Allow delete for everyone" ON expenses FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_claimed ON expenses(claimed);

-- Create a function to automatically update the total field
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

-- Create a view for expense summaries
CREATE VIEW expense_summary AS
SELECT 
    category,
    COUNT(*) as total_count,
    SUM(total) as total_amount,
    SUM(CASE WHEN claimed THEN total ELSE 0 END) as claimed_amount,
    SUM(CASE WHEN NOT claimed THEN total ELSE 0 END) as pending_amount
FROM expenses
GROUP BY category;

-- Grant permissions for the view
GRANT SELECT ON expense_summary TO anon, authenticated;

-- ===========================================
-- 2. STORAGE SETUP
-- ===========================================

-- Drop existing storage policies (if any)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow update in bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from bills" ON storage.objects;

-- Create new permissive storage policies for the bills bucket
-- Allow public read access to bills
CREATE POLICY "Allow public read access to bills" ON storage.objects
FOR SELECT USING (bucket_id = 'bills');

-- Allow anyone to upload to bills bucket
CREATE POLICY "Allow upload to bills" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'bills');

-- Allow anyone to update files in bills bucket
CREATE POLICY "Allow update in bills" ON storage.objects
FOR UPDATE USING (bucket_id = 'bills');

-- Allow anyone to delete files in bills bucket
CREATE POLICY "Allow delete from bills" ON storage.objects
FOR DELETE USING (bucket_id = 'bills');

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



