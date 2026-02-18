# PropertyHub Setup Guide

Follow these steps to get PropertyHub running with your data.

## Step 1: Create Google Sheets Database

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet and name it "PropertyHub"
3. Copy the URL of the spreadsheet (you'll need this later)

## Step 2: Setup Google Apps Script Backend

1. In your PropertyHub Google Sheet, go to **Extensions → Apps Script**
2. A new tab will open with the Google Apps Script editor
3. Clear any existing code and paste the entire content of `appsscript.js` (from this repository)
4. Save the script

### Initialize the Sheets

1. In the Apps Script editor, find the function `initializeSheets` in the left sidebar
2. Click on it and then click the play button (▶) to run it
3. You'll see "Authorization required" - click "Review Permissions"
4. Select your Google account and click "Allow"
5. The script will run and create all necessary sheet tabs

### Deploy as Web App

1. Click **Deploy → New Deployment**
2. Choose type: **Web app**
3. Configure:
   - Execute as: *Your Google account*
   - Who has access: *Anyone*
4. Click **Deploy**
5. Copy the **Deployment URL** (looks like: `https://script.google.com/macros/d/ABC123.../usercallback`)
6. **SAVE THIS URL** - you'll need it in the next step

## Step 3: Configure Frontend

1. Open `js/config.js` in a text editor
2. Find this line:
   ```javascript
   const GAS_DEPLOYMENT_URL = 'https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercallback';
   ```
3. Replace `YOUR_DEPLOYMENT_ID` with your actual deployment URL from Step 2
   - Example: `const GAS_DEPLOYMENT_URL = 'https://script.google.com/macros/d/1a2b3c4d5e6f7g8h9i0j/usercallback';`
4. Save the file

## Step 4: Deploy to GitHub Pages

### Create a GitHub Repository

1. Go to [GitHub](https://github.com) and log in
2. Click **Create a new repository**
3. Name it: `PropertyHub` (or any name you prefer)
4. Choose: **Public** (so you can use GitHub Pages)
5. Click **Create repository**

### Push Code to GitHub

1. Open Terminal/Command Prompt in your PropertyHub folder
2. Run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/PropertyHub.git
git branch -M main
git push -u origin main
```

(Replace `YOUR_USERNAME` with your actual GitHub username)

### Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages** (left sidebar)
3. Under "Source", select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**
5. Wait a few seconds, then refresh
6. You'll see: "Your site is published at https://YOUR_USERNAME.github.io/PropertyHub"

**Copy this URL** - this is where your app will be hosted!

## Step 5: Test Your Setup

1. Open your GitHub Pages URL in a browser
2. You should see the PropertyHub interface load
3. The sync button should show "Last sync: never"

### Add Test Data

1. Click **Properties** in the sidebar
2. Click **+ New Property**
3. Fill in:
   - Address: "123 Main St"
   - City: "New York"
   - State: "NY"
   - Purchase Price: "500000"
   - Purchase Date: "2023-01-15"
   - Current Value: "550000"
4. Click **Save Property**

### Verify Data Sync

1. Go back to your **Google Sheet** (PropertyHub spreadsheet)
2. Look at the "Properties" tab
3. You should see your test property there!
4. Go to your **Dashboard** in PropertyHub
5. You should see the metrics updated

## Step 6: Add Your Real Data

Now that everything is working, you can add your real property data:

### Add Properties

1. In PropertyHub, go to **Properties**
2. Click **+ New Property** for each property
3. Fill in all details (address, city, state, purchase price, purchase date, current value)
4. Click **Save Property**

### Add Mortgages

1. In PropertyHub, go to **Mortgages**
2. Click **+ New Mortgage**
3. For each mortgage, fill in:
   - Property: (select from dropdown)
   - Lender: (bank name)
   - Original Balance: (what you originally borrowed)
   - Current Balance: (what you owe today)
   - Interest Rate: (annual % - e.g., 4.5)
   - Monthly Payment: (total monthly payment)
   - Remaining Term: (months left - e.g., 300 for 25 years)
   - Refinance Eligible Date: (when you can refinance)
   - Escrow Amount: (monthly escrow for taxes/insurance, if any)
4. Click **Save Mortgage**

### Verify Everything

1. Go to **Dashboard**
2. Check that metrics show correctly:
   - Total Portfolio Value
   - Total Debt
   - Total Equity
   - Monthly Income (will be $0 until you add tenants/rent data)

## Troubleshooting

### "App not configured" error

- Make sure you updated `js/config.js` with your Google Apps Script URL
- Save the file
- Hard refresh your browser (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)

### Can't add properties

- Check that Google Apps Script is deployed as a web app
- Verify the deployment URL in `js/config.js` is correct
- Check browser console for errors (F12 → Console tab)

### Data not showing up

- Click the **Sync** button to manually refresh
- Check that your Google Sheet has the correct tab names: Properties, Mortgages, Expenses
- Verify you're logged into the correct Google account

### "Authorization required" when testing

- This is normal the first time
- Click "Review Permissions" and select your account
- Grant permission to the script

## Next Steps

After MVP works, you can add:

1. **Tenants & Rent Tracking**
   - Track tenant information
   - Monitor rent payment status
   - Automate rent reminders

2. **Insurance Management**
   - Centralize all insurance policies
   - Set renewal reminders
   - Track coverage by property

3. **Task Management**
   - Create reminders for:
     - Maintenance tasks
     - Lease expirations
     - Insurance renewals
     - Refinance opportunities

4. **Advanced Analytics**
   - Per-property performance dashboard
   - Portfolio comparisons
   - Tax reporting
   - ROI calculations

5. **Multi-User Access**
   - Role-based permissions
   - Partner access
   - Property manager collaboration

## Support

For issues or questions:
1. Check the browser console (F12 → Console tab)
2. Look at Google Apps Script logs (Extensions → Apps Script → View logs)
3. Review this guide again
4. Check the README.md for more information

## Tips

- **Backup your data**: Google Sheets automatically backs up. You can view version history anytime.
- **Share with partners**: Simply share the Google Sheet with them (read-only or edit access)
- **Mobile access**: PropertyHub works on mobile browsers too - just bookmark the GitHub Pages URL
- **Offline access**: The app caches data for offline viewing, but syncs when you go online

Happy investing! 🏠📊
