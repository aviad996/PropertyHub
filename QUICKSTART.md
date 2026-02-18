# PropertyHub - Quick Start Guide

Get PropertyHub running in 15 minutes!

## What is PropertyHub?

PropertyHub is a free, web-based real estate portfolio management platform that combines:
- 📊 Investment tracking (purchase price, current value, equity)
- 💰 Mortgage management (principal vs interest breakdown)
- 💸 Expense tracking
- 🏠 Property management
- 📈 Performance analytics

All in ONE place with automatic data synchronization.

## Quick Setup (5 Steps)

### 1️⃣ Create Google Sheet
- Go to [sheets.google.com](https://sheets.google.com)
- Create new sheet named "PropertyHub"
- Keep it open

### 2️⃣ Setup Google Apps Script
- In the sheet, go to **Extensions → Apps Script**
- Delete any existing code
- Copy-paste entire `appsscript.js` file
- **Save**

### 3️⃣ Initialize Sheets
- In Apps Script editor, click function `initializeSheets`
- Click Play button ▶️
- Grant permissions when prompted
- Done! ✓

### 4️⃣ Deploy as Web App
- Click **Deploy → New Deployment**
- Type: **Web app**
- Execute as: Your account
- Access: **Anyone**
- Click **Deploy**
- **COPY the URL** (looks like `https://script.google.com/macros/d/ABC123.../usercallback`)

### 5️⃣ Configure Frontend
- Open `js/config.js`
- Find: `const GAS_DEPLOYMENT_URL = 'YOUR_DEPLOYMENT_ID'`
- Replace with your copied URL
- Save file

## Deploy to Web (Optional but Recommended)

### Option A: GitHub Pages (FREE, Recommended)

1. **Create GitHub repo**
   - Go to [github.com](https://github.com)
   - Click **New Repository**
   - Name: PropertyHub
   - Make it **Public**
   - Create

2. **Push code**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/PropertyHub.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable Pages**
   - Repo Settings → Pages
   - Branch: main, Folder: / (root)
   - Save

4. **Your URL**: `https://YOUR_USERNAME.github.io/PropertyHub`

### Option B: Local Only

- Just open `index.html` in your browser
- Works offline, syncs when online

## Add Your First Property

1. Open PropertyHub
2. Click **Properties** in sidebar
3. Click **+ New Property**
4. Fill in:
   - Address: "Your address"
   - City/State/Zip
   - Purchase Price: amount you paid
   - Purchase Date: when you bought it
   - Current Value: what it's worth now
5. Click **Save**
6. Check your Google Sheet - the property appears there! ✓

## Add Your First Mortgage

1. Click **Mortgages**
2. Click **+ New Mortgage**
3. Fill in:
   - Property: (select from dropdown)
   - Lender: bank name
   - Current Balance: what you owe now
   - Interest Rate: 3.5, 4.5, etc.
   - Monthly Payment: total payment amount
   - Remaining Term (months): e.g., 300 for 25 years
4. Click **Save**
5. See the **P&I breakdown** instantly! ✓

## View Dashboard

1. Click **Dashboard**
2. See your portfolio metrics:
   - 💵 Total Portfolio Value
   - 💳 Total Debt
   - 📈 Total Equity
   - 📊 Per-property breakdown

## Key Features

### Dashboard
- Real-time portfolio metrics
- Property cards with key data
- Quick action buttons
- One-click refresh

### Properties
- Add/edit/delete properties
- Track purchase price vs current value
- See appreciation
- Full address details

### Mortgages
- **Principal vs Interest breakdown** for each payment
- Interest rate tracking
- Remaining term display
- Refinance eligibility dates
- Escrow payment tracking

### Expenses
- Category tracking (taxes, insurance, HOA, maintenance)
- Monthly/yearly views
- Property-specific expenses

### Sync
- Real-time data updates
- Changes appear instantly in Google Sheet
- Automatic sync every 30 seconds
- Manual sync button

## Data Storage

Your data lives in **Google Sheets** (your Google Drive):
- ✓ Automatic backups
- ✓ Version history
- ✓ Easy to access anytime
- ✓ Share with partners
- ✓ Download as CSV/Excel

## Sharing with Partners

1. Share your Google Sheet with partners
2. Give them GitHub Pages URL
3. They can see all data in PropertyHub
4. Updates sync automatically for everyone

## Common Questions

**Q: Is my data secure?**
A: Yes. Data stays in your Google Drive. The app only reads/writes to your Sheets.

**Q: Can I use offline?**
A: Yes. App caches data. Works offline, syncs when you go online.

**Q: Can I export my data?**
A: Yes. Open Google Sheet and download as CSV/Excel anytime.

**Q: Will this work on mobile?**
A: Yes. GitHub Pages link works on iPhone/Android browsers.

**Q: Can multiple people use it?**
A: Yes. Share Google Sheet with them. Data syncs for everyone.

**Q: Is it really free?**
A: Yes. 100% free (Google Sheet + GitHub Pages + Apps Script free tier).

## What's Next?

After MVP, you can add:
- 👥 Tenant management
- 🔔 Rent payment tracking
- 📋 Insurance policy tracking
- ✅ Task/reminder system
- 📊 Advanced analytics
- 🎯 Strategic decision logging

## Troubleshooting

**Problem: "App not configured"**
- Double-check your Google Apps Script URL in `js/config.js`
- Hard refresh browser (Ctrl+Shift+R)

**Problem: Can't add data**
- Make sure Google Apps Script is deployed as Web App
- Verify URL is correct
- Check browser console (F12)

**Problem: Data not appearing**
- Click Sync button
- Check Google Sheet tabs have correct names

**Problem: "Authorization required"**
- This is normal first time
- Click through permission prompts
- Grant access

## Get More Help

- 📖 Read full setup: See `SETUP.md`
- 📚 Full documentation: See `README.md`
- 🐛 Report issues: Create GitHub issue
- 💡 Feature requests: Add to GitHub discussions

## Pro Tips

1. **Bookmark your URL** - easy access anytime
2. **Use properties with mortgages** - see full equity picture
3. **Track all expenses** - accurate ROI calculations
4. **Sync regularly** - keep dashboard fresh
5. **Share with partner** - collaborative investing

## License

MIT License - Use freely, modify as needed

---

**Ready to go?** Start with Step 1: Create Google Sheet above! 🚀

Questions? Check SETUP.md for detailed instructions.
