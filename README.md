# PropertyHub - Real Estate Portfolio Management Platform

A centralized web application for managing and tracking residential real estate investments. Combines investment metrics, daily operations, strategic planning, and comprehensive analytics in one place.

## Features (MVP + Phase 2.5 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7A + Phase 7B + Phase 7C + Phase 7D)

### Core Features
- **Dashboard**: Portfolio overview with key metrics (total equity, income, debt, cash flow)
- **Properties Management**: Track all property details, values, strategic metrics, and utilities
- **Mortgage Tracking**: View complete mortgage breakdown including principal vs. interest (calculated at runtime)
- **Expenses**: Category tracking with smart bill-back logic for tenant charges
- **Data Synchronization**: On-demand sync (page load + manual refresh, no polling)
- **Multi-user Support**: Share portfolio with partners (Phase 7A)
- **Role-Based Access Control**: Owner, Manager, Accountant, and Tenant roles (Phase 7A)

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

### Phase 5 - Advanced Analytics & Reports
- **Portfolio Analytics Dashboard**: Period-filtered analysis (today/month/quarter/year/custom)
- **Portfolio Performance Metrics**: ROI, cash flow, equity, LTV, expense ratios with visual cards
- **Property Comparison Table**: Side-by-side metrics for all properties (value, debt, income, expenses, ROI, cap rate)
- **Expense Analysis**: Category breakdown with visual trends and percentage distribution
- **Income vs Expenses Trend**: Monthly chart showing cash flow trends over time
- **Tax Optimization Report**: Depreciation schedules, deduction tracking, tax savings estimates
- **Cost Segregation Analysis**: Identify properties eligible for accelerated depreciation
- **Performance Ranking**: Top and bottom performing properties by ROI, equity, or cash flow
- **CSV Export**: Download analytics data for external analysis or accounting software
- **Print-Friendly Reports**: Optimized report generation for printing and distribution

### Phase 6 - Refinance Calculator & Financial Analysis
- **Refinance Calculator**: Analyze refinancing scenarios with break-even analysis
- **Scenario Modeling**: Compare multiple refinance options side-by-side
- **Amortization Schedules**: Full payment breakdown for each scenario
- **Financial Calculations**: IRR, NPV, and total interest savings
- **Decision Tracking**: Record refinance, sale, repair, and hold decisions
- **Outcome Analytics**: Track projected vs. actual decision outcomes
- **Decision History**: Learn from past financial decisions
- **CSV Export**: Export refinance analyses and decision logs

### Phase 7A - Multi-User Roles & Permissions
- **User Management**: Invite users and manage team access
- **Role-Based Access Control**: 4 role types with granular permissions
  - **Owner**: Full system access, manage users and settings
  - **Manager**: Day-to-day operations (properties, rent, expenses, tasks)
  - **Accountant**: Financial reports and auditing (read-only)
  - **Tenant**: View own lease and payment history
- **User Permissions Matrix**: Customized view and actions per role
- **Activity Audit Log**: Track all user actions with timestamp and details
- **Session Management**: View and terminate active user sessions
- **Permission Enforcement**: Client-side UI filtering + server-side validation
- **Data Isolation**: Users see only data they have permission to access

### Phase 7B - Predictive Analytics & Forecasting
- **Cash Flow Forecasting**: Project monthly cash flow 12-60 months using exponential smoothing
- **Expense Forecasting**: Predict expenses by category with seasonal adjustment
- **Property Appreciation**: Calculate and project future property values
- **Time-Series Analysis**: Linear regression trend detection and analysis
- **Confidence Metrics**: Declining confidence over longer forecast horizons
- **Comprehensive Analysis**: Combined forecast view with all three models
- **Seasonal Adjustment**: Automatic detection of seasonal patterns (±5% monthly variation)
- **Recommendation Engine**: Actionable insights based on forecast trends
- **Multiple Forecast Horizons**: 12/24/36/60 month forecasts or 1-5 year appreciation
- **Export to CSV**: Share forecasts with accountants and partners

### Phase 7C - Advanced Tax Optimization & Deduction Tracking
- **Depreciation Calculator**: Residential property 27.5-year straight-line with 80/20 building/land split
- **Tax Deduction Summary**: Property-by-property operating expenses, interest, and depreciation
- **NOI Calculation**: Automated net operating income with all deductions
- **Taxable Income Reporting**: Shows passive activity losses and deduction impact
- **Tax Opportunities Engine**: Identifies cost segregation, bonus depreciation, 1031 exchanges
- **Cost Segregation Analysis**: Separate building components for accelerated depreciation
- **Bonus Depreciation Tracking**: Qualified property improvements with 100% deduction option
- **Comprehensive Tax Report**: Professional format with IRS forms (Schedule E, Form 4562, Form 8582)
- **Tax Year Selector**: Review multiple years for tax planning
- **Depreciation Methods**: MACRS (standard), Straight Line, and Accelerated options
- **CSV Export**: Download tax report for CPA submission
- **Actionable Recommendations**: Cost-benefit analysis for tax strategies

### Phase 7D - Automation & Recurring Tasks
- **Automation Engine**: Sophisticated rule-based automation platform
- **Five Automation Types**: Task creation, reminders, lease renewal alerts, insurance renewal alerts, rent collection reminders
- **Flexible Scheduling**: Daily, weekly, monthly, quarterly, annually, and custom (days before event)
- **Task Automation**: Auto-create recurring maintenance, inspection, and rent collection tasks
- **Smart Reminders**: Customizable notifications with flexible recurrence patterns
- **Lease Renewal Automation**: Automatic alerts before lease expiry with auto-task creation
- **Insurance Renewal Automation**: Policy tracking with renewal reminders (30/60/90 day thresholds)
- **Rent Collection Reminders**: Automatic reminders N days before rent due date
- **Execution History**: Complete log of all automation executions with success/failure tracking
- **Manual Execution**: Trigger automations manually to test before scheduling
- **Enable/Disable Toggle**: Quickly enable or disable automations without deletion
- **Success Rate Tracking**: Dashboard shows automation reliability metrics
- **Time Savings**: Eliminates 60%+ of routine manual operational work

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
│       ├── tasks.js       # Task management & reminders (Phase 4)
│       └── analytics.js   # Advanced analytics & reports (Phase 5)
│       └── tax_report.js  # Tax optimization reports (Phase 5)
├── utils/
│   ├── calculations.js    # Runtime math and analysis functions
│   └── reports.js         # Report generation & export utilities (Phase 5)
├── appsscript.js          # Google Apps Script backend (copy to GAS editor)
├── appsscript.json        # Google Apps Script config
├── .gitignore
├── README.md
├── SETUP.md
├── QUICKSTART.md
├── SHARING.md
├── PHASE-2.5.md          # Phase 2.5 features documentation
├── PHASE-3.md            # Phase 3 features documentation
├── PHASE-4.md            # Phase 4 features documentation
└── PHASE-5.md            # Phase 5 features documentation
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
- [x] Advanced analytics, reports, and tax optimization (Phase 5)
- [x] Refinance calculator with break-even analysis (Phase 6)
- [x] Financial decision tracking and analytics (Phase 6)
- [x] IRR and NPV calculations (Phase 6)

### Coming Soon 🚀
- Strategic decision logging with scenario modeling (Phase 6.5)
- Multi-user roles and advanced features (Phase 7)
- Recurring tasks and automation (Phase 4.5 enhancement)
- Task templates and maintenance checklists (Phase 4.5 enhancement)
- Predictive analytics and cash flow forecasting (Phase 7)
- 1031 exchange planning and analysis (Phase 7)
- Automated refinance recommendations (Phase 6.5)

## Support

For issues or questions, please create an issue in the repository.

## License

MIT License - feel free to use and modify
