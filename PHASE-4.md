# PropertyHub Phase 4 - Insurance & Tasks Management

## What's New in Phase 4

This phase adds comprehensive insurance policy tracking and task management capabilities to PropertyHub. Insurance policies are critical for property protection and require regular renewal monitoring. Tasks help organize maintenance, inspections, and other important property-related work.

## New Features

### 1. Insurance Policy Management 📋

**Track all insurance policies for each property:**
- Policy type: property, liability, umbrella, or other
- Provider name and policy number
- Coverage amount
- Annual premium tracking
- Expiry date with automatic renewal alerts

**How it works:**
1. Go to **Insurance** tab
2. Click "New Policy"
3. Enter:
   - Property, policy type, provider name
   - Policy number and coverage amount
   - Annual premium
   - Expiry date
4. Save

**Key Features:**
- Policies grouped by property and type
- Automatic renewal alerts:
  - Green: > 90 days until expiry
  - Yellow: 30-90 days until expiry
  - Red: < 30 days or expired
- Annual premium totals per property
- Visual warnings for policies expiring soon

### 2. Task Management ✅

**Track and manage property tasks:**
- Task title and description
- Property assignment
- Due dates with overdue tracking
- Category: maintenance, inspection, lease renewal, insurance, rent collection, other
- Assigned-to tracking (optional)
- Status: pending or completed

**How it works:**
1. Go to **Tasks** tab
2. Click "New Task"
3. Enter:
   - Property, title, category
   - Due date
   - Optional: assigned to person
   - Status (pending/completed)
4. Save

**Key Features:**
- Pending tasks sorted by due date
- Completed tasks section (collapsed)
- Overdue task alerts with visual warnings
- Quick-complete button (toggle without editing)
- Category color-coding
- Tasks grouped by status

### 3. Smart Renewal Tracking

**Automatic alerts for policy renewals:**
- 30-day countdown to expiry (urgent)
- 90-day countdown to expiry (warning)
- Expired policy indicators
- Annual premium summaries per property

**Task integration:**
- Create tasks for insurance renewals
- Set task due dates to policy expiry dates
- Track maintenance schedules
- Coordinate with lease renewal dates

### 4. Dashboard Summaries

**Quick overview on dashboard:**
- Total annual insurance premium across portfolio
- Number of policies expiring soon (< 90 days)
- Count of pending tasks
- Count of overdue tasks
- Urgent indicators if critical items need attention

## Implementation Details

### Backend (appsscript.js)

**Existing Endpoints:**
- `getInsurance()` - Returns all insurance policies
- `addInsurance(params)` - Creates new policy with UUID
- `updateInsurance(params)` - Updates existing policy
- `deleteInsurance(id)` - Removes policy
- `getTasks()` - Returns all tasks
- `addTasks(params)` - Creates new task with UUID
- `updateTask(params)` - Updates task status/dates
- `deleteTask(id)` - Removes task

**Status:** All backend already implemented - NO CHANGES NEEDED

### Frontend Modules

#### insurance.js (285 lines)

**Module structure:**
```javascript
Insurance.init() → load all insurance policies
Insurance.loadInsurance() → display grouped by property/type
Insurance.editInsurance(id) → load form for editing
Insurance.saveInsurance() → validate and save
Insurance.deleteInsurance(id) → remove policy
```

**Key functions:**
- `populatePropertySelect()` - Dropdown for property selection
- `editInsurance()` - Pre-fills form from existing data
- `saveInsurance()` - Validates and saves policy
- `deleteInsurance()` - Asks confirmation before deletion

#### tasks.js (310 lines)

**Module structure:**
```javascript
Tasks.init() → load all tasks
Tasks.loadTasks() → display pending/completed sections
Tasks.editTask(id) → load task form
Tasks.saveTask() → validate and save
Tasks.completeTask(id) → mark as completed
Tasks.deleteTask(id) → remove task
```

**Key functions:**
- `populatePropertySelect()` - Gets properties for dropdown
- `populateCategorySelect()` - Standard categories
- `editTask()` - Loads task for editing
- `completeTask()` - Quick-complete without modal
- `saveTask()` - Validates and saves task

### API Layer (js/api.js)

**New endpoints:**
- `API.getInsurance()` - Gets all policies (60s cache)
- `API.addInsurance(data)` - Adds new policy
- `API.updateInsurance(id, data)` - Updates policy
- `API.deleteInsurance(id)` - Deletes policy
- `API.getTasks()` - Gets all tasks (60s cache)
- `API.addTask(data)` - Adds new task
- `API.updateTask(id, data)` - Updates task
- `API.deleteTask(id)` - Deletes task

**Cache strategy:**
- Insurance: 60-second TTL
- Tasks: 60-second TTL
- Cache cleared on add/update/delete

### UI/UX

#### Insurance View
- **List**: Policies grouped by property, then by type
- **Cards**: Provider, policy number, coverage, annual premium, expiry date
- **Warnings**: Color-coded expiry status (green/yellow/red)
- **Actions**: Edit/Delete buttons on each policy

#### Tasks View
- **Sections**: Pending tasks (sorted by due date) / Completed tasks
- **Cards**: Title, property, category, due date, assigned-to, status
- **Warnings**: Overdue indicators with exact days overdue
- **Actions**: Complete (quick toggle), Edit, Delete buttons
- **Colors**: Category-specific color badges

## Using Insurance & Tasks

### Example: Add Insurance Policy

**Scenario: Property liability insurance**

1. Go to **Insurance** tab
2. Click "New Policy"
3. Enter:
   - Property: "123 Main St"
   - Type: "Liability Insurance"
   - Provider: "State Farm"
   - Policy #: "LIA-2025-123456"
   - Coverage: $300,000
   - Annual Premium: $450
   - Expiry: 2026-12-31
4. Save

**View Result:**
- Policy card shows under "123 Main St" → "⚖️ Liability Insurance"
- Annual premium for property updates to show new total
- Expiry date shows green status (> 90 days away)

### Example: Track Overdue Task

**Scenario: Roof inspection overdue**

1. Go to **Tasks** tab
2. Pending tasks shows:
   - "Roof Inspection" - 📍 "123 Main St"
   - Category: "🔍 Inspection"
   - "⚠️ OVERDUE (5 days ago)"
   - Assigned to: "John Smith"
3. Click "✓ Complete" to mark done
4. Task moves to Completed section

### Example: Create Insurance Renewal Task

**Scenario: Policy expires in 45 days**

1. View Insurance policy expiring
2. Create related task:
   - Go to Tasks
   - Click "New Task"
   - Title: "Renew Property Insurance"
   - Property: "123 Main St"
   - Category: "Insurance"
   - Due Date: [same as policy expiry]
   - Assigned To: "Insurance Agent"
3. Save

**Result:**
- Task shows with yellow warning (45 days)
- Can track renewal progress separately from policy record

## Data Schema

### Insurance Table
```
| id | property_id | policy_type | provider | policy_number |
| coverage_amount | annual_premium | expiry_date | created_date |
```

### Tasks Table
```
| id | property_id | title | due_date | category |
| status | assigned_to | created_date |
```

**Notes:**
- `policy_type` values: "property", "liability", "umbrella", "other"
- `category` values: "maintenance", "inspection", "lease_renewal", "insurance", "rent_collection", "other"
- `status` values: "pending", "completed"

## Integration with Dashboard

### Dashboard Updates

New summary cards show:
- **Insurance Summary**:
  - Total annual premium for all properties
  - Count of policies expiring in < 90 days
  - Urgent indicator if any expire < 30 days

- **Tasks Summary**:
  - Count of pending tasks
  - Count of overdue tasks
  - Urgent indicator if any overdue

**Example Display:**
```
Insurance: $3,200/year | 2 Renewing Soon | ⚠️ 1 URGENT
Tasks: 5 Pending | ⚠️ 2 Overdue
```

## Troubleshooting Phase 4

**Q: I don't see the Insurance or Tasks tabs**
- Deploy updated `appsscript.js` to Google Apps Script
- Clear browser cache (Ctrl+Shift+Delete)
- Reload app

**Q: Can't add a policy**
- Select property and policy type (both required)
- Enter provider name (required)
- Enter expiry date (required)
- Coverage and premium are optional

**Q: Can't add a task**
- Select property (required)
- Enter task title (required)
- Select category (required)
- Enter due date (required)

**Q: Expiry warnings not showing**
- Check expiry date is entered as a valid date
- Green: > 90 days away
- Yellow: 30-90 days away
- Red: < 30 days or expired

**Q: Task won't mark as complete**
- Use "✓ Complete" button on pending tasks
- Or edit task and change status to "completed"

**Q: Premium total incorrect**
- Verify annual_premium is entered correctly
- Clear cache (manual sync button)
- Reload app

## What's Next?

### Phase 4.5 Enhancements (Future)
- Automated renewal reminders via Triggers
- Email notifications for expiring policies
- Task assignment notifications
- Recurring tasks for annual maintenance
- Task templates for common maintenance checklists
- Expense linkage (task → maintenance expense)
- Insurance cost analysis per property type

### Phase 5 (Future)
- Advanced analytics and reporting
- Comparative insurance cost analysis
- Policy history tracking
- Task completion analytics
- Maintenance trend analysis

## Files Created/Modified

### Backend
- appsscript.js: NO CHANGES (endpoints already exist)

### Frontend
- `js/modules/insurance.js`: NEW (285 lines)
- `js/modules/tasks.js`: NEW (310 lines)
- `index.html`: +250 lines (nav items, views, modals, forms)
- `css/styles.css`: +350 lines (insurance/task styling)
- `js/api.js`: +90 lines (insurance/task wrappers)
- `js/app.js`: +10 lines (module initialization and routing)

### Documentation
- `PHASE-4.md`: NEW (this file)
- `README.md`: Updated with Phase 4

## Verification Checklist

- [x] Insurance sheet data loads correctly
- [x] Insurance cards display grouped by property/type
- [x] Expiry date warnings show correctly (30/90 day thresholds)
- [x] Add/Edit/Delete insurance policies works
- [x] Tasks sheet data loads correctly
- [x] Pending tasks sorted by due date
- [x] Completed tasks section collapsible
- [x] Overdue tasks show warning badge
- [x] Add/Edit/Delete/Complete tasks works
- [x] Dashboard shows insurance + task summaries
- [x] All data syncs to Google Sheets
- [x] Cache invalidation works properly
- [x] Mobile responsive design

## Version

**Version**: Phase 4 Release
**Status**: Production Ready
**Last Updated**: 2026-02-18
**Next Phase**: Phase 5 (Advanced Analytics & Reports)

---

See **SETUP.md** for installation or **QUICKSTART.md** for quick 5-minute setup.
