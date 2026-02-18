# PropertyHub Phase 3 - Tenants & Rent Payments

## What's New in Phase 3

This phase adds complete tenant management and rent collection tracking capabilities, bridging the gap between property management and financial operations.

## New Features

### 1. Tenant Management 👤

**Track all your tenants across properties:**
- Name, email, phone, address
- Lease dates (start and end)
- Monthly rent amount
- Security deposit tracking
- Tenant status (active/vacant/past)
- **Lease expiry warnings** (when lease ending in < 60 days)

**How it works:**
1. Go to **Tenants** tab
2. Click "New Tenant"
3. Select property
4. Enter tenant info:
   - Name, contact info
   - Monthly rent amount
   - Lease start and end dates
   - Current status
5. Save

**Key features:**
- Tenants grouped by property for easy viewing
- Color-coded status badges (green=active, yellow=vacant, red=past)
- Automatic lease expiry warnings
- Full edit/delete capabilities

### 2. Rent Payment Tracking 💵

**Record and track monthly rent payments:**
- Monthly rent payment grid
- Track which tenants have paid
- Payment status: pending, paid, or late
- Paid date tracking
- **Monthly summaries:**
  - Expected rent (all active tenants)
  - Received rent (paid payments)
  - Outstanding rent (pending/late)
  - Late payment alerts

**How it works:**
1. Go to **Rent Payments** tab
2. Click "Record Payment"
3. Select month
4. Choose tenant (auto-fills monthly rent amount)
5. Enter amount (usually matches tenant's monthly rent)
6. Select status: pending/paid/late
7. If paid, enter paid date
8. Save

**Monthly View:**
- Payments organized by month (newest first)
- Monthly totals show expected vs. received
- Color-coded status badges
- Easy to see collection status at a glance

### 3. Smart Payment Status Tracking

**Three status options:**

| Status | Meaning | Used for |
|--------|---------|----------|
| Pending | Rent due but not yet received | Current month, awaiting payment |
| Paid | Rent received | Paid payments with date recorded |
| Late | Rent overdue | Past due payments |

**Why this matters:**
- See immediately who hasn't paid
- Track payment history per tenant
- Identify problematic payers
- Calculate average collection rate

### 4. Data Relationships

**Complete data flow:**
```
Property (1) ← → (*) Tenant (1) ← → (*) Rent Payment
```

**Example:**
- Property: "123 Main St"
  - Tenant 1: John (active, $1200/month)
    - Jan 2026: Paid ($1200)
    - Feb 2026: Pending ($1200)
    - Mar 2026: Late ($1200)
  - Tenant 2: Jane (active, $1100/month)
    - Jan 2026: Paid ($1100)
    - Feb 2026: Paid ($1100)

## Implementation Details

### Backend (appsscript.js)

**New Endpoints:**

1. **getTenants()** - Returns all tenants with data joined
2. **addTenant(params)** - Creates tenant with UUID
3. **updateTenant(params)** - Updates existing tenant
4. **deleteTenant(id)** - Removes tenant (keeps related payments)
5. **getRentPayments()** - Returns all rent payments
6. **addRentPayment(params)** - Creates payment entry
7. **updateRentPayment(params)** - Updates payment status/date
8. **deleteRentPayment(id)** - Removes payment

**Data Validation:**
- Tenant name required
- Monthly rent must be positive
- Lease start must be before lease end
- Payment amount must be positive

**Audit Logging:**
- All operations logged to Audit tab
- Timestamp + user + action recorded

### Frontend Modules

#### tenants.js (230 lines)

**Module structure:**
```javascript
Tenants.init() → load all tenants by property
Tenants.loadTenants() → display grouped by property
Tenants.editTenant(id) → load form for editing
Tenants.saveTenant() → validate and save
Tenants.deleteTenant(id) → remove with confirmation
```

**Key functions:**
- `populatePropertySelect()` - Dropdown for property selection
- `editTenant()` - Pre-fills form from existing data
- `saveTenant()` - Validates dates and amounts before saving
- `deleteTenant()` - Asks confirmation before deletion

#### rent_payments.js (280 lines)

**Module structure:**
```javascript
RentPayments.init() → load all payments
RentPayments.loadRentPayments() → display by month
RentPayments.editPayment(id) → load payment form
RentPayments.savePayment() → validate and save
RentPayments.deletePayment(id) → remove payment
```

**Key functions:**
- `populateTenantSelect()` - Gets tenants for property
- `editPayment()` - Loads existing payment for editing
- `savePayment()` - Auto-fills property from tenant
- `deletePayment()` - Removes payment record

### API Layer (js/api.js)

**New endpoints:**
- `API.getTenants()` - Gets all tenants (60s cache)
- `API.addTenant(data)` - Adds new tenant
- `API.updateTenant(id, data)` - Updates tenant
- `API.deleteTenant(id)` - Deletes tenant
- `API.getRentPayments()` - Gets all payments (60s cache)
- `API.addRentPayment(data)` - Records payment
- `API.updateRentPayment(id, data)` - Updates payment
- `API.deleteRentPayment(id)` - Deletes payment

**Cache strategy:**
- 60-second TTL for both tenants and rent payments
- Cache cleared on add/update/delete
- Portfolio metrics cache also cleared (affects income calc)

### UI/UX

#### Tenants View
- **List**: Tenants grouped by property
- **Cards**: Name, phone, email, rent amount, lease dates
- **Status**: Color-coded badge (active/vacant/past)
- **Warnings**: "Lease ending in X days" if < 60 days left
- **Actions**: Edit/Delete buttons on each card

#### Rent Payments View
- **Monthly sections**: Organized by month (newest first)
- **Header**: Month name with stats (expected/received/outstanding)
- **Table**: Tenant, property, amount, status, paid date
- **Status colors**: Green (paid), gray (pending), red (late)
- **Quick add**: "Record Payment" button

## Using Tenants & Rent Payments

### Example: Set Up Tenants

**Step 1: Add your first tenant**
1. Go to **Tenants** tab
2. Click "New Tenant"
3. Enter:
   - Property: "123 Main St"
   - Name: "John Smith"
   - Phone: "(555) 123-4567"
   - Email: "john@email.com"
   - Monthly Rent: $1,200
   - Lease Start: 2025-01-15
   - Lease End: 2028-01-15
   - Status: Active
4. Save

**Step 2: Add another tenant (different property)**
1. Repeat for "456 Oak Ave"
   - Name: "Jane Doe"
   - Monthly Rent: $950
   - Lease dates: 2024-06-01 to 2027-06-01

### Example: Track Rent Payments

**Scenario: January rent received**

1. Go to **Rent Payments** tab
2. Click "Record Payment"
3. Fill form:
   - Month: January 2026
   - Tenant: John Smith (selects 123 Main St, auto-fills $1,200)
   - Amount: $1,200
   - Status: Paid
   - Paid Date: 2026-01-02
4. Save

**Then: February rent not yet received**

1. Record Payment again
2. Month: February 2026
3. Tenant: John Smith
4. Amount: $1,200
5. Status: Pending
6. (Leave Paid Date empty)
7. Save

**Then: Late fee applies (March)**

1. Record Payment
2. Month: March 2026
3. Tenant: John Smith
4. Amount: $1,200
5. Status: Late
6. (Paid Date can be added when received)
7. Save

**View Result:**
- Dashboard shows: "Monthly Income: $2,150" (expected from both tenants)
- Rent tab shows monthly totals:
  - January: ✓ Paid ($2,150)
  - February: ⏳ Pending ($2,150)
  - March: ⚠️ Late ($2,150)

### Example: Update Tenant Info

**Scenario: Rent increase**

1. Go to **Tenants** tab
2. Find tenant card for "John Smith"
3. Click "Edit"
4. Change "Monthly Rent" from $1,200 to $1,250
5. Save

**Next rent payment will use new amount ($1,250)**

### Example: Lease Expiry Alert

**Scenario: Lease expiring soon**

1. Tenant "John Smith" has lease ending 2026-03-15
2. Go to **Tenants** on 2026-01-20
3. Card shows: "⚠️ Lease ending in 54 days"
4. You know to:
   - Reach out about renewal
   - Plan for potential vacancy
   - Update lease terms if renewing

## Data Structure

### Tenants Table
```
| id | property_id | name | email | phone | lease_start_date | lease_end_date | monthly_rent | security_deposit | status | created_date |
```

### Rent Payments Table
```
| id | tenant_id | property_id | month | amount | paid_date | status | created_date |
```

**Notes:**
- `month` format: YYYY-MM (e.g., "2026-01")
- `status` values: "active", "vacant", "past"
- `payment_status` values: "pending", "paid", "late"

## Integration with Dashboard

### Dashboard Impact

The Dashboard will show:
- **Monthly Income**: Calculated from active tenants' monthly rent
- **Outstanding Rent**: Sum of pending/late payments
- **Collection Rate**: Percentage of expected rent that was paid
- **Late Payments**: Count of overdue rent payments

(Dashboard integration in future update)

## Troubleshooting Phase 3

**Q: I don't see the Tenants or Rent tabs**
- Deploy updated `appsscript.js` to Google Apps Script
- Run `initializeSheets()` in Google Apps Script to create tabs
- Clear browser cache (Ctrl+Shift+Delete)
- Reload app

**Q: Can't add a tenant**
- Make sure you've selected a property
- Lease start date must be before lease end date
- Monthly rent must be > 0
- All required fields (*) must be filled

**Q: Can't record a payment**
- Select a tenant first (populates monthly rent)
- Enter an amount > 0
- If status is "Paid", you must enter a paid date
- Make sure month is in YYYY-MM format

**Q: Tenant shows "Lease ending in X days" but should renew**
- Update the lease end date in tenant edit form
- Go to Tenants > Find tenant > Edit > Update lease_end_date

**Q: Payment amount doesn't match tenant's rent**
- This is allowed (partial payment, late fee added, etc.)
- Just enter the actual amount received

**Q: Can I delete a tenant with payments?**
- Yes, but we keep the payments
- This preserves payment history even if tenant is gone
- Payments become "orphaned" but still tracked

## What's Next?

### Phase 4 (Future)
- Insurance policy management with renewal reminders
- Task management system (maintenance, inspections)
- Automated late payment notifications
- Custom rent amount per property (if tenant moves)

### Integration Ideas
- Link Tenant Charges to rent payments (utility bills)
- Automatic 1099 generation from rent received
- Late fee calculations and tracking
- Tenant communication templates

## Files Modified/Added

### Backend
- `appsscript.js`: +300 lines for tenant/payment endpoints

### Frontend
- `js/modules/tenants.js`: NEW (230 lines)
- `js/modules/rent_payments.js`: NEW (280 lines)
- `index.html`: +200 lines (nav items, views, forms)
- `css/styles.css`: +200 lines (tenant/payment styling)
- `js/api.js`: +110 lines (tenant/payment endpoints)
- `js/app.js`: Updated to initialize new modules

### Database
- New sheets auto-created by `initializeSheets()`:
  - Tenants
  - Rent Payments

## Verification Checklist

- [x] getTenants() endpoint working
- [x] addTenant() creates with UUID
- [x] Tenants module loads/displays correctly
- [x] Rent payment grid displays monthly
- [x] Payment status tracking (paid/pending/late)
- [x] Tenant-property linkage working
- [x] Lease expiry warnings showing
- [x] All data syncs to Sheets
- [x] CSS styling responsive
- [x] Forms validate correctly
- [x] Cache management working

## Version

**Version**: Phase 3 Release
**Status**: Production Ready
**Last Updated**: 2026-02-18
**Next Phase**: Phase 4 (Insurance & Tasks)

---

See **SETUP.md** for installation or **QUICKSTART.md** for quick 5-minute setup.
