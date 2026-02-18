# PropertyHub - Real Estate Portfolio Management Platform

A centralized web application for managing and tracking residential real estate investments. Combines investment metrics, daily operations, and strategic planning in one place.

## Features (MVP + Phase 2.5 + Phase 3 + Phase 4)

### Core Features
- **Dashboard**: Portfolio overview with key metrics (total equity, income, debt, cash flow)
- **Properties Management**: Track all property details, values, strategic metrics, and utilities
- **Mortgage Tracking**: View complete mortgage breakdown including principal vs. interest (calculated at runtime)
- **Expenses**: Category tracking with smart bill-back logic for tenant charges
- **Data Synchronization**: On-demand sync (page load + manual refresh, no polling)
- **Multi-user Support**: Share portfolio with partners

### Phase 2.5 Enhancements
- **Utilities Management**: Track electricity, water, and gas providers with smart billing responsibility (Direct/Owner/Reimburse)
- **Bill Back System**: Automatically create tenant charges for "Reimburse" category expenses
- **Contacts Directory**: Centralized directory for utilities, contractors, HOA, property managers
- **Strategic Metrics**: Market rent, equity percentage, property condition rating (1-5)
- **Drive Integration**: Auto-create Google Drive folder for each property for document storage
- **Daily Triggers**: Automated checks for pending issues (rent, insurance, leases, payments)
- **Email Alerts**: Daily email summary of pending issues
- **Runtime Calculations**: P&I amortization, Cap Rate, Cash-on-Cash, and portfolio metrics calculated in real-time
- **UUID IDs**: All IDs are unique strings (prevents sync conflicts)

### Phase 3 - Tenants & Rent Payments
- **Tenant Management**: Track all tenants by property with lease dates and contact info
- **Lease Tracking**: Automatic warnings when lease expiring in < 60 days
- **Rent Payment Recording**: Monthly rent payment tracking with status (pending/paid/late)
- **Payment Status Visibility**: Color-coded status badges for quick payment status overview
- **Monthly Summaries**: Expected rent vs. received rent per month with outstanding alerts
- **Tenant Status**: Track active/vacant/past tenants
- **Security Deposits**: Track security deposit amounts per tenant
- **Monthly Organization**: Rent payments grouped by month with aggregated totals

### Phase 4 - Insurance & Tasks
- **Insurance Policy Tracking**: Monitor all property insurance with coverage amounts and premiums
- **Renewal Alerts**: Automatic warnings for policies expiring (30/90 day thresholds with color coding)
- **Task Management**: Create and track maintenance, inspections, and renewal tasks
- **Overdue Task Alerts**: Visual indicators for overdue tasks with exact days overdue
- **Task Categories**: Organized by maintenance, inspection, lease renewal, insurance, rent collection
- **Quick-Complete**: Mark tasks as done without editing modal
- **Assigned-To Tracking**: Optional assignment for task delegation
- **Dashboard Summaries**: Insurance premiums, renewal status, pending and overdue tasks

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Hosting**: GitHub Pages
- **Data Storage**: Google Drive

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/PropertyHub.git
cd PropertyHub
```

### 2. Setup Google Sheets Database
1. Create a new Google Sheets document
2. Set up tabs: Properties, Mortgages, Expenses, Audit, Config
3. Customize headers and formulas as needed

### 3. Setup Google Apps Script Backend
1. Open the Sheets document
2. Go to Extensions > Apps Script
3. Copy the code from `appsscript.js` into the editor
4. Deploy as web app (Share > Deploy > Web app)
5. Copy the deployment URL

### 4. Configure Frontend
1. Update `js/config.js` with your Google Apps Script URL
2. Save the file

### 5. Deploy to GitHub Pages
```bash
git add .
git commit -m "Initial commit"
git push origin main
```
Enable GitHub Pages in repository settings (main branch)

## File Structure

```
PropertyHub/
├── index.html              # Main application shell
├── css/
│   └── styles.css         # All styling
├── js/
│   ├── config.js          # Configuration (update with your GAS URL)
│   ├── app.js             # Main controller
│   ├── api.js             # Google Apps Script API calls
│   ├── formatting.js      # Date and currency formatting
│   ├── storage.js         # LocalStorage utilities
│   ├── utils/
│   │   └── calculations.js # Runtime math (P&I, ROI, metrics)
│   └── modules/
│       ├── dashboard.js   # Dashboard view
│       ├── properties.js  # Properties management
│       ├── mortgages.js   # Mortgage tracking
│       ├── utilities.js   # Utilities management (Phase 2.5)
│       ├── contacts.js    # Contacts directory (Phase 2.5)
│       ├── tenants.js     # Tenant management (Phase 3)
│       ├── rent_payments.js # Rent payment tracking (Phase 3)
│       ├── insurance.js   # Insurance policy tracking (Phase 4)
│       └── tasks.js       # Task management & reminders (Phase 4)
├── appsscript.js          # Google Apps Script backend (copy to GAS editor)
├── appsscript.json        # Google Apps Script config
├── .gitignore
├── README.md
├── SETUP.md
├── QUICKSTART.md
├── SHARING.md
├── PHASE-2.5.md          # Phase 2.5 features documentation
├── PHASE-3.md            # Phase 3 features documentation
└── PHASE-4.md            # Phase 4 features documentation
```

## Data Schema (Enhanced)

### Properties Tab (ENHANCED)
- id (UUID), address, type, purchase_price, purchase_date, current_value, city, state
- **NEW**: market_rent, equity_percentage, property_condition (1-5)
- **NEW**: electricity_provider, electricity_account_num, electricity_responsibility
- **NEW**: water_provider, water_account_num, water_responsibility
- **NEW**: gas_provider, gas_account_num, gas_responsibility
- **NEW**: documents_folder_id (Google Drive folder ID)

### Mortgages Tab
- id (UUID), property_id, lender, current_balance, interest_rate, monthly_payment, refinance_eligible_date

### Expenses Tab (ENHANCED)
- id (UUID), property_id, category, amount, date, description
- **NEW**: tenant_charge_id, should_bill_tenant

### Tenants Tab (NEW - Phase 3)
- id (UUID), property_id, name, email, phone
- lease_start_date, lease_end_date, monthly_rent, security_deposit
- status (active/vacant/past)

### Rent Payments Tab (NEW - Phase 3)
- id (UUID), tenant_id, property_id, month, amount, paid_date, status

### NEW Sheets
- **Contacts**: utility companies, contractors, HOA, property managers
- **Tenant Charges**: auto-created from "Reimburse" expenses
- **Triggers**: daily checks for rent, insurance, lease, payment issues
- **Audit**: timestamp, user, action, record_id, changes

## Usage

1. Navigate to your GitHub Pages URL
2. Click "Add Property" to start entering data
3. Dashboard automatically updates with calculations
4. Share the URL with partners for collaborative access

## Key Calculations

- **Equity** = Current Value - Mortgage Balance
- **LTV** = Mortgage Balance / Current Value
- **Cap Rate** = Annual NOI / Purchase Price
- **Cash-on-Cash** = Annual NOI / Cash Invested

## Roadmap

### Completed ✅
- [x] Core portfolio tracking (Phase 1-2)
- [x] Utilities and bill-back system (Phase 2.5)
- [x] Tenant management and rent tracking (Phase 3)
- [x] Insurance policy tracking and task management (Phase 4)

### Coming Soon 🚀
- Advanced analytics and reporting (Phase 5)
- Strategic decision logging and tax optimization (Phase 5)
- Refinance calculator and break-even analysis (Phase 6)
- Multi-user roles and advanced features (Phase 6)
- Recurring tasks and automation (Phase 4.5 enhancement)
- Task templates and maintenance checklists (Phase 4.5 enhancement)

## Support

For issues or questions, please create an issue in the repository.

## License

MIT License - feel free to use and modify
