# PropertyHub Phase 2.5 - Infrastructure & Contacts Enhancement

## What's New in Phase 2.5

This phase adds critical infrastructure management (utilities) and contact directory capabilities that were missing from the MVP.

## New Features

### 1. Utilities Management ⚡💧🔥

**Track all utilities for each property:**
- Electricity, water, and gas
- Provider name and account number for each
- **Smart billing responsibility** for each utility:
  - **Direct**: Tenant pays utility company directly
  - **Owner**: You pay, included in monthly rent
  - **Reimburse**: You pay, tenant reimburses you

**How it works:**
1. Go to **Utilities** tab
2. Click Edit next to a property
3. Enter provider info and select responsibility level
4. Save

**Bill Back Logic:**
When you add an expense for a "Reimburse" utility:
- System automatically creates a **Tenant Charge** entry
- Tenant's balance increases by the amount
- You can track what they owe you

### 2. Contacts Directory 👥

**Centralized place for all your contacts:**
- Utility companies (electric, water, gas providers)
- Contractors (plumbers, electricians, roofers, etc.)
- HOA and property management
- Tenants and property managers

**For each contact:**
- Name, phone, email, address
- Service type (what they provide)
- Link to specific property
- Notes and additional info

**Use cases:**
- Need an electrician? Open Contacts, find contractors for this property
- Utility bill issue? Contact info is right there
- Renew insurance? Contact HOA manager instantly

### 3. Smart Billing Responsibility

**The "Reimburse" feature auto-bills tenants:**

Example: Tenant pays for their own electricity (Direct), but water is on your account

1. You get water bill: $150
2. Add expense in Expenses module
3. Check "Bill Tenant" box
4. System auto-creates tenant charge: $150
5. Your tenant sees $150 on their balance
6. They pay you when they pay rent

**Why this matters:**
- No more manual tracking of "what does the tenant owe"
- Everything is in the system
- Easy to see totals at a glance
- Clear audit trail

### 4. Strategic Property Metrics

**New fields for each property:**
- **Market Rent**: What the property would rent for in current market
  - Used to calculate realistic ROI
  - Compare to actual rent you're charging

- **Equity Percentage**: If you own property with partners
  - Track how much is yours (e.g., 50%, 75%)
  - Important for multi-owner scenarios

- **Property Condition**: 1-5 rating
  - 1 = Poor (needs major work)
  - 3 = Average (normal maintenance)
  - 5 = Excellent (mint condition)
  - Use for capital expenditure planning

### 5. Google Drive Integration

**Each property automatically gets a Drive folder:**
- Folder automatically created when you add property
- Link stored in Property record
- Use for documents:
  - Lease agreements
  - Inspection reports
  - Maintenance receipts
  - Insurance documents
  - Tax records

**Access your folders:**
1. Click property address → documents_folder_id shows the link
2. Or open Google Drive and search for "PropertyHub - [address]"

### 6. Daily Automation & Triggers

**System automatically checks for:**
- Rent not received (if tenant missed payment)
- Insurance expiring in 30 days
- Lease ending in 60 days
- Mortgage payment dates

**Email notification:**
- Every day at 11 PM (Eastern Time)
- Summary of all pending issues
- Actionable list of what needs attention

**How to set up:**
1. In Google Apps Script editor, find `checkTriggers()` function
2. Click Play button to run once
3. Then set up trigger: Click Triggers (clock icon)
4. Create new trigger:
   - Function: `checkTriggers`
   - Deployment: Head
   - Event source: Time-driven
   - Type of time based trigger: Day timer
   - Time of day: 11 PM

### 7. Runtime P&I Calculations

**No more pre-calculated amortization tables:**
- P&I breakdown calculated in real-time
- Exact amount goes to principal each month
- Exact amount goes to interest
- Updates automatically if you change mortgage terms

**Why better:**
- Flexible (can update anytime)
- Accurate (uses current balance)
- Efficient (no mega spreadsheet)
- Easy to verify (standard amortization formula)

## Data Structure Changes

### New Sheets Created
1. **Contacts**: Directory of utilities, contractors, HOA, managers
2. **Tenant Charges**: Auto-created from "Reimburse" expenses
3. **Triggers**: Daily pending issue tracking
4. Additional sheets: Tenants, Rent Payments, Insurance, Tasks, Decisions

### Enhanced Sheets
- **Properties**: +9 new fields (utilities, strategic metrics, folder ID)
- **Expenses**: +2 new fields (tenant_charge_id, should_bill_tenant)

### New ID System
- All IDs are now **UUIDs** (not auto-incrementing)
- Prevents sync conflicts if multiple users edit
- Format: `timestamp+random` (globally unique)

## Using the Bill Back Feature

### Step-by-Step Example

**Scenario**: You pay for tenant's electricity (Reimburse responsibility), tenant pays you back

1. **Setup once**:
   - Go to Utilities tab for the property
   - Set Electricity Responsibility = "Reimburse"
   - Save

2. **When bill arrives**:
   - Go to Expenses
   - Click "+ New Expense"
   - Category: "electricity"
   - Amount: $125
   - Check "Bill Tenant" box
   - Choose tenant from dropdown
   - Save

3. **System automatically**:
   - Records $125 expense
   - Creates Tenant Charge for $125
   - Adds to tenant's balance (they owe you)

4. **Tenant repayment**:
   - Tenant pays you $125 (separately or with rent)
   - You mark Tenant Charge as "paid"
   - Balance clears

## Implementation Steps

### For Your First Use

1. **Enable Phase 2.5 in your setup**:
   - Deploy updated `appsscript.js` to Google Apps Script
   - Run `initializeSheets()` to create new tabs
   - Clear browser cache (Ctrl+Shift+Delete)
   - Reload app

2. **Add utilities for your properties**:
   - Go to Utilities tab
   - Click Edit on each property
   - Enter provider info
   - Set responsibility level
   - Save

3. **Build contact list**:
   - Go to Contacts tab
   - Add your utilities companies (get account numbers from bills)
   - Add contractors you use
   - Add HOA contact
   - Add property managers

4. **Set up daily triggers** (optional but recommended):
   - In Google Apps Script, set trigger for `checkTriggers()`
   - You'll get email every night with pending issues

5. **Try bill back**:
   - Add a test expense for a "Reimburse" utility
   - Check "Bill Tenant" box
   - See Tenant Charge auto-created

## Troubleshooting Phase 2.5

**Q: I don't see Utilities or Contacts tabs**
- You need to run `initializeSheets()` in Google Apps Script
- Or manually add these tabs in Sheets with the columns listed in README

**Q: Bill tenant option not showing**
- Make sure Utility Responsibility is set to "Reimburse"
- You need to have Tenants added to the property first

**Q: Email notifications not working**
- Make sure you set up the trigger in Google Apps Script
- Check that notification_sent_date is blank (means pending)
- Triggers run at 11 PM Eastern Time

**Q: Drive folder not created**
- Your Google account needs to own the Drive
- Run property creation again to trigger folder creation
- Or manually create folder named "PropertyHub - [address]" and paste the link

## What's Next?

Future phases will add:
- Advanced analytics and reporting
- Tenants & rent payment tracking integration
- Insurance policy management with auto-renewal reminders
- Task management system with notifications
- Tax optimization features (depreciation, cost segregation)
- Multi-user roles and permissions

## Files Modified/Added

### Backend (Google Apps Script)
- `appsscript.js`: +250 lines for new CRUD endpoints, Drive integration, triggers

### Frontend
- `js/modules/utilities.js`: New utilities management module
- `js/modules/contacts.js`: New contacts directory module
- `js/utils/calculations.js`: Runtime amortization calculations
- `index.html`: Added Utilities and Contacts views and forms
- `css/styles.css`: Added utility and contact card styling
- `js/api.js`: Added new API endpoints for utilities, contacts, tenant charges

### Database
- All new sheets automatically created by `initializeSheets()`

## Questions or Issues?

See the detailed setup guide in `SETUP.md` or quick start in `QUICKSTART.md`.

---

**Version**: Phase 2.5 Enhancement
**Status**: Production Ready
**Last Updated**: 2026-02-18
