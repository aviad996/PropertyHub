# PropertyHub - Real Estate Portfolio Management Platform

A centralized web application for managing and tracking residential real estate investments. Combines investment metrics, daily operations, and strategic planning in one place.

## Features (MVP)

- **Dashboard**: Portfolio overview with key metrics (total equity, income, debt, cash flow)
- **Properties Management**: Track all property details, values, and metrics
- **Mortgage Tracking**: View complete mortgage breakdown including principal vs. interest
- **Data Synchronization**: Real-time updates across all modules
- **Multi-user Support**: Share portfolio with partners

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
│   └── modules/
│       ├── dashboard.js   # Dashboard view
│       ├── properties.js  # Properties management
│       └── mortgages.js   # Mortgage tracking
├── appsscript.js          # Google Apps Script backend (copy to GAS editor)
├── appsscript.json        # Google Apps Script config
├── .gitignore
└── README.md
```

## Data Schema

### Properties Tab
- id, address, type, purchase_price, purchase_date, current_value, city, state

### Mortgages Tab
- id, property_id, lender, current_balance, interest_rate, monthly_payment, refinance_eligible_date

### Expenses Tab
- id, property_id, category, amount, date, description

### Audit Tab
- timestamp, user, action, record_id, changes

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

## Future Features

- Tenant management and rent tracking
- Insurance policy tracking with renewal reminders
- Task and reminder system
- Strategic decision logging
- Advanced analytics and comparative reporting
- Multi-user roles and permissions

## Support

For issues or questions, please create an issue in the repository.

## License

MIT License - feel free to use and modify
