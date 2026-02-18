# Sharing PropertyHub with Partners

Guide to sharing your PropertyHub with business partners and co-owners.

## Ways to Share

### Option 1: Share Google Sheet (DATA)
Partners see the raw data in Google Sheets

**Steps:**
1. Go to your PropertyHub Google Sheet
2. Click **Share** button (top right)
3. Enter partner email
4. Choose access level:
   - **Viewer** - Read-only, can't change data
   - **Editor** - Can add/edit data (recommended)
5. Click **Share**

**Pros:**
- Real-time collaboration
- Can edit directly in Sheets
- Full version history

**Cons:**
- They see raw data format
- No nice dashboard

### Option 2: Share GitHub Pages URL (RECOMMENDED)
Partners see the beautiful PropertyHub interface

**Steps:**
1. Make sure you deployed to GitHub Pages (see SETUP.md)
2. Share this URL: `https://YOUR_USERNAME.github.io/PropertyHub`
3. Partners can view without login

**Pros:**
- Beautiful dashboard
- Easy to use
- Real-time updates
- No extra setup needed

**Cons:**
- Read-only access (if you want them to edit, combine with Option 1)

### Option 3: Combination (BEST)
Partners get both interface AND can edit data

**Steps:**
1. Share GitHub Pages URL (for viewing)
2. Share Google Sheet (for editing)
3. Keep Google Apps Script private

**Result:**
- Partners see the dashboard
- Partners can add/edit data
- Everything syncs automatically

## Access Levels

### Viewer
- ✓ See all data
- ✓ View dashboard
- ✗ Cannot add/edit data
- ✗ Cannot delete data

**Good for:** Partners who just want to review

### Editor
- ✓ See all data
- ✓ View dashboard
- ✓ Add properties/mortgages/expenses
- ✓ Edit existing data
- ✓ Delete data

**Good for:** Co-owners, property managers

## Real-Time Collaboration

When both you and your partner are updating PropertyHub:

1. Partner adds a property in the web app
2. Property appears in Google Sheet immediately
3. Your dashboard refreshes automatically
4. You see the new property in the app
5. Everything syncs without any manual work

**How it works:**
- Web app → Google Apps Script → Google Sheet
- Sheet is the single source of truth
- App always pulls latest data

## Sharing Specific Properties

Want to share only certain properties with certain people?

**Method 1: Create separate Sheets**
- Duplicate the PropertyHub Sheet
- Keep only relevant properties
- Share the duplicate sheet

**Method 2: Create separate GitHub repos**
- Create a new repo with only their properties
- Deploy to their own GitHub Pages
- Give them their own login

**Method 3: Future - Role-based access (Coming soon)**
- Different access levels per property
- Partner A sees properties 1-5
- Partner B sees properties 6-10

## Permission Guidelines

### For Co-Owners
- Give **Editor** access to Sheet
- Share GitHub Pages URL
- They can fully manage properties

### For Property Managers
- Give **Editor** access to Sheet
- Share GitHub Pages URL
- Limit to specific properties (future feature)

### For Accountants
- Give **Viewer** access to Sheet
- Share GitHub Pages URL
- Can see all data but not change it

### For Investors (Limited Partners)
- Only share GitHub Pages URL
- Give **Viewer** access to Sheet (optional)
- Read-only access to all data

## Security & Privacy

### What NOT to share:
- ❌ Google Apps Script code
- ❌ Deployment URL
- ❌ .env files or credentials

### What's safe to share:
- ✅ GitHub Pages URL
- ✅ Google Sheet (with appropriate permissions)
- ✅ Property details, mortgage info, expenses

### Best practices:
1. Use Viewer access by default
2. Upgrade to Editor only when needed
3. Revoke access if someone leaves
4. Review who has access monthly

## Removing Access

### Remove from Google Sheet
1. Go to Google Sheet
2. Click **Share**
3. Find person's name
4. Click the "X" next to their name
5. Confirm

### Remove from GitHub Pages
- Anyone with the URL can access
- To restrict: Change repo to Private
- Share only with specific people

## Troubleshooting Shared Access

**Problem: Partner can't see my data**
- Confirm they're logged into correct Google account
- Check they have Viewer/Editor access
- Try signing out and back in

**Problem: Partner made changes I can't see**
- Click **Sync** button to refresh
- Wait 30 seconds for auto-sync
- Hard refresh browser (Ctrl+Shift+R)

**Problem: Want to revoke access**
- Go to Google Sheet → Share → Remove person
- If they have the GitHub URL, they can still see dashboard
- To fully block: Make repo Private

**Problem: Partner needs Editor access**
- Go to Google Sheet → Share
- Find their name
- Click the dropdown, change to **Editor**

## Collaboration Workflow

### Daily Workflow
```
You add property → Share updates → Partner sees it → Partner adds mortgage → You see it
```

### Example: Adding a New Property with Partner
1. You: Click "Add Property" in PropertyHub
2. You: Fill in property details
3. You: Click Save
4. Partner: Sees property appear in dashboard automatically
5. Partner: Clicks "Add Mortgage" for that property
6. Partner: Fills in mortgage details
7. You: Sees mortgage appear in dashboard automatically
8. Both: Can see complete property with full P&I breakdown

### Managing Expenses Together
1. Partner: Adds maintenance expense
2. You: See expense in dashboard
3. Partner: Adds insurance expense
4. You: Dashboard updates automatically

## Comments & Notes

**Want to leave notes for your partner?**

In Google Sheet:
1. Right-click on a cell
2. Click "Insert note"
3. Type your message
4. Partner sees note when they click on that cell

## Exporting Shared Data

Partners can export data from the Google Sheet:
1. Open Google Sheet
2. File → Download
3. Choose format: Excel, CSV, PDF

## Tips for Successful Collaboration

1. **Establish roles** - Who manages which properties?
2. **Regular sync meetings** - Review dashboard together
3. **Use consistent naming** - Keep property addresses standard
4. **Agree on categories** - Same expense categories for all
5. **Document changes** - Use Sheet notes for important updates
6. **Version control** - Google Sheets keeps full history

## Future Sharing Features

Coming soon:
- [ ] Role-based permissions (Partner A, Partner B, Manager A, etc.)
- [ ] Property-specific access (Partner sees only their properties)
- [ ] Audit trail (see who changed what, when)
- [ ] Comments & collaboration features
- [ ] Notification system
- [ ] API access for accounting software

## Need Help?

- **Access questions:** Check "Permission Guidelines" above
- **Technical issues:** See SETUP.md
- **Feature requests:** Add to GitHub Issues

---

**Remember:** PropertyHub stores everything in YOUR Google Drive. You control who sees what!
