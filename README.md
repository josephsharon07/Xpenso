# Company Expenses Tracker

A modern, responsive web application for managing company expenses with file upload capabilities, built with HTML, JavaScript, Tailwind CSS, and Supabase.

## 🚀 Features

- **Dashboard**: View all expenses with filtering and search capabilities
- **Add/Edit Expenses**: Dynamic forms based on expense category (Bus, Petrol, Food, Others)
- **File Upload**: Upload bill images/PDFs to Supabase Storage
- **Authentication**: Optional login system using Supabase Auth
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Real-time Updates**: Direct database integration with Supabase

## 📁 Project Structure

```
company-expenses/
├── index.html          # Main dashboard
├── add.html            # Add/Edit expense form
├── login.html          # Authentication page
├── js/
│   ├── supabase.js     # Supabase client configuration
│   ├── main.js         # Dashboard functionality
│   ├── form.js         # Form handling and file upload
│   └── auth.js         # Authentication management
└── README.md           # This file
```

## 🛠️ Setup Instructions

### 1. Supabase Setup

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and anon key

2. **Create the Database Table**:
   Run this SQL in your Supabase SQL editor:

   ```sql
   -- Create expenses table
   CREATE TABLE expenses (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       date DATE NOT NULL,
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

   -- Enable Row Level Security
   ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

   -- Create policies for public read access and authenticated write access
   CREATE POLICY "Allow read for anon" ON expenses FOR SELECT USING (true);
   CREATE POLICY "Allow insert/update/delete for authenticated users" ON expenses FOR ALL USING (auth.uid() IS NOT NULL);
   ```

3. **Create Storage Bucket**:
   - Go to Storage in your Supabase dashboard
   - Create a new bucket named `bills`
   - Set it as public
   - Create the following folder structure: `bills/{year}/{month}/`

### 2. Configure the Application

1. **Update Supabase Credentials**:
   Open `js/supabase.js` and replace the placeholder values:

   ```javascript
   const SUPABASE_URL = "YOUR_SUPABASE_URL";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
   ```

   Replace with your actual Supabase project URL and anon key.

2. **Optional: Set up Authentication**:
   - In Supabase dashboard, go to Authentication > Settings
   - Configure your preferred authentication providers
   - For email/password auth, ensure it's enabled

### 3. Deploy the Application

#### Option A: Static Hosting (Recommended)

**Vercel**:
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts to deploy

**Netlify**:
1. Drag and drop the project folder to [netlify.com](https://netlify.com)
2. Or connect your Git repository

**GitHub Pages**:
1. Push to a GitHub repository
2. Enable GitHub Pages in repository settings

#### Option B: Local Development

1. **Using a Local Server**:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

2. **Open in Browser**:
   Navigate to `http://localhost:8000`

## 🎯 Usage

### Adding Expenses

1. Click "Add Expense" on the dashboard
2. Select a category (Bus, Petrol, Food, Others)
3. Fill in the relevant fields that appear
4. Optionally upload a bill/receipt
5. Click "Save Expense"

### Expense Categories

- **Bus**: From/To places, ticket count, unit price
- **Petrol**: From/To places, distance (km), price per km
- **Food**: Number of persons, price per person
- **Others**: Item name, total price

### Filtering and Search

- Use the search box to find expenses by description
- Filter by category using the dropdown
- Set date ranges to view expenses within specific periods
- View summary totals for claimed and pending amounts

### File Management

- Supported formats: JPG, PNG, PDF
- Maximum file size: 10MB
- Files are automatically organized by year/month in Supabase Storage

## 🔒 Security Features

- **Row Level Security (RLS)**: Database policies control access
- **Public Read Access**: Anyone can view expenses (for transparency)
- **Authenticated Write Access**: Only logged-in users can add/edit/delete
- **File Upload Security**: File type and size validation

## 🎨 Customization

### Styling
- The app uses Tailwind CSS via CDN
- Modify classes in HTML files to change appearance
- Colors and spacing can be customized through Tailwind utilities

### Database Schema
- Add new expense categories by modifying the CHECK constraint
- Add new fields by altering the table structure
- Update the form handling in `js/form.js` accordingly

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to load expenses"**:
   - Check your Supabase URL and anon key
   - Verify the table exists and has the correct structure
   - Check browser console for detailed error messages

2. **File upload fails**:
   - Ensure the `bills` storage bucket exists and is public
   - Check file size (must be under 10MB)
   - Verify file type is supported (JPG, PNG, PDF)

3. **Authentication not working**:
   - Verify authentication is enabled in Supabase
   - Check that RLS policies are correctly set up
   - Ensure users are created in Supabase Auth

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features required
- Local storage for session management

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Supabase documentation
3. Check browser console for error messages
4. Create an issue in the project repository

---

**Note**: Remember to replace the placeholder Supabase credentials in `js/supabase.js` before deploying!
# Xpenso
