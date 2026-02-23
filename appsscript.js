// PropertyHub - Google Apps Script Backend (ENHANCED)
// Copy this entire file into your Google Apps Script editor

const SHEET_NAMES = {
    PROPERTIES: 'Properties',
    MORTGAGES: 'Mortgages',
    TENANTS: 'Tenants',
    RENT_PAYMENTS: 'Rent Payments',
    EXPENSES: 'Expenses',
    INSURANCE: 'Insurance',
    TASKS: 'Tasks',
    DECISIONS: 'Decisions',
    CONTACTS: 'Contacts',
    TENANT_CHARGES: 'Tenant Charges',
    TRIGGERS: 'Triggers',
    MORTGAGE_PAYMENTS: 'Mortgage Payments',
    AUDIT: 'Audit',
    CONFIG: 'Config'
};

/**
 * Main entry point for web app requests
 */
function doPost(e) {
    return doGet(e);
}

function doGet(e) {
    try {
        const action = e.parameter.action;
        let result;

        switch (action) {
            case 'getProperties':
                result = getProperties();
                break;
            case 'addProperty':
                result = addProperty(e.parameter);
                break;
            case 'updateProperty':
                result = updateProperty(e.parameter);
                break;
            case 'deleteProperty':
                result = deleteProperty(e.parameter.id);
                break;

            case 'getMortgages':
                result = getMortgages();
                break;
            case 'addMortgage':
                result = addMortgage(e.parameter);
                break;
            case 'updateMortgage':
                result = updateMortgage(e.parameter);
                break;
            case 'deleteMortgage':
                result = deleteMortgage(e.parameter.id);
                break;

            case 'getExpenses':
                result = getExpenses();
                break;
            case 'addExpense':
                result = addExpense(e.parameter);
                break;
            case 'updateExpense':
                result = updateExpense(e.parameter);
                break;

            case 'getContacts':
                result = getContacts();
                break;
            case 'addContact':
                result = addContact(e.parameter);
                break;
            case 'updateContact':
                result = updateContact(e.parameter);
                break;
            case 'deleteContact':
                result = deleteContact(e.parameter.id);
                break;

            case 'getTenantCharges':
                result = getTenantCharges();
                break;
            case 'addTenantCharge':
                result = addTenantCharge(e.parameter);
                break;

            case 'getTriggers':
                result = getTriggers();
                break;

            case 'getTenants':
                result = getTenants();
                break;
            case 'addTenant':
                result = addTenant(e.parameter);
                break;
            case 'updateTenant':
                result = updateTenant(e.parameter);
                break;
            case 'deleteTenant':
                result = deleteTenant(e.parameter.id);
                break;

            case 'getRentPayments':
                result = getRentPayments();
                break;
            case 'addRentPayment':
                result = addRentPayment(e.parameter);
                break;
            case 'updateRentPayment':
                result = updateRentPayment(e.parameter);
                break;
            case 'deleteRentPayment':
                result = deleteRentPayment(e.parameter.id);
                break;

            case 'getMortgagePayments':
                result = getMortgagePayments();
                break;
            case 'addMortgagePayment':
                result = addMortgagePayment(e.parameter);
                break;
            case 'updateMortgagePayment':
                result = updateMortgagePayment(e.parameter);
                break;
            case 'deleteMortgagePayment':
                result = deleteMortgagePayment(e.parameter.id);
                break;

            case 'getPortfolioMetrics':
                result = getPortfolioMetrics();
                break;

            case 'getUserEmail':
                result = { email: Session.getActiveUser().getEmail() };
                break;

            default:
                result = { error: 'Unknown action' };
        }

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            error: error.message,
            stack: error.stack
        }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Initialize sheets (run this once manually)
 */
function initializeSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Create Properties sheet (ENHANCED)
    createSheetIfNotExists(ss, SHEET_NAMES.PROPERTIES, [
        'id', 'address', 'city', 'state', 'zip', 'type', 'units',
        'purchase_price', 'purchase_date', 'current_value',
        'market_rent', 'equity_percentage', 'property_condition',
        'closing_costs', 'annual_taxes', 'annual_insurance', 'cash_to_close',
        'electricity_provider', 'electricity_account_num', 'electricity_responsibility',
        'water_provider', 'water_account_num', 'water_responsibility',
        'gas_provider', 'gas_account_num', 'gas_responsibility',
        'documents_folder_id', 'created_date',
        'cc_appraisal', 'cc_inspection', 'cc_title', 'cc_escrow',
        'cc_loan_fees', 'cc_survey', 'cc_insurance', 'cc_prepaid_interest',
        'cc_taxes', 'cc_other',
        'rehab_costs', 'rehab_items', 'holding_costs'
    ]);

    // Create Mortgages sheet
    createSheetIfNotExists(ss, SHEET_NAMES.MORTGAGES, [
        'id', 'property_id', 'lender', 'original_balance', 'current_balance',
        'interest_rate', 'monthly_payment', 'escrow_payment', 'remaining_term_months',
        'refinance_eligible_date', 'start_date', 'last_payment_date', 'created_date'
    ]);

    // Create Tenants sheet
    createSheetIfNotExists(ss, SHEET_NAMES.TENANTS, [
        'id', 'property_id', 'name', 'email', 'phone',
        'lease_start_date', 'lease_end_date', 'monthly_rent', 'security_deposit',
        'status', 'created_date'
    ]);

    // Create Rent Payments sheet
    createSheetIfNotExists(ss, SHEET_NAMES.RENT_PAYMENTS, [
        'id', 'tenant_id', 'property_id', 'month', 'amount', 'paid_date', 'status', 'created_date'
    ]);

    // Create Mortgage Payments sheet (payment tracking per month)
    createSheetIfNotExists(ss, SHEET_NAMES.MORTGAGE_PAYMENTS, [
        'id', 'mortgage_id', 'property_id', 'month', 'amount', 'amount_paid',
        'paid_date', 'status', 'created_date'
    ]);

    // Create Expenses sheet (ENHANCED)
    createSheetIfNotExists(ss, SHEET_NAMES.EXPENSES, [
        'id', 'property_id', 'category', 'amount', 'date', 'description',
        'tenant_charge_id', 'should_bill_tenant', 'created_date'
    ]);

    // Create Insurance sheet
    createSheetIfNotExists(ss, SHEET_NAMES.INSURANCE, [
        'id', 'property_id', 'policy_type', 'provider', 'policy_number',
        'coverage_amount', 'expiry_date', 'annual_premium', 'created_date'
    ]);

    // Create Tasks sheet
    createSheetIfNotExists(ss, SHEET_NAMES.TASKS, [
        'id', 'property_id', 'title', 'due_date', 'category',
        'status', 'assigned_to', 'created_date'
    ]);

    // Create Decisions sheet
    createSheetIfNotExists(ss, SHEET_NAMES.DECISIONS, [
        'id', 'property_id', 'decision_type', 'decision_date', 'notes', 'status', 'created_date'
    ]);

    // Create Contacts sheet (NEW)
    createSheetIfNotExists(ss, SHEET_NAMES.CONTACTS, [
        'id', 'property_id', 'contact_type', 'name', 'phone', 'email',
        'address', 'service_type', 'notes', 'created_date'
    ]);

    // Create Tenant Charges sheet (NEW)
    createSheetIfNotExists(ss, SHEET_NAMES.TENANT_CHARGES, [
        'id', 'tenant_id', 'expense_id', 'category', 'amount', 'date',
        'status', 'description', 'created_date'
    ]);

    // Create Triggers sheet (NEW)
    createSheetIfNotExists(ss, SHEET_NAMES.TRIGGERS, [
        'id', 'property_id', 'trigger_type', 'due_date', 'status',
        'notification_sent_date', 'description', 'assigned_to', 'created_date'
    ]);

    // Create Audit sheet
    createSheetIfNotExists(ss, SHEET_NAMES.AUDIT, [
        'timestamp', 'user', 'action', 'record_id', 'changes'
    ]);

    Logger.log('Sheets initialized successfully');
}

function createSheetIfNotExists(ss, sheetName, headers) {
    try {
        ss.getSheetByName(sheetName);
    } catch (e) {
        const sheet = ss.insertSheet(sheetName);
        sheet.appendRow(headers);
    }
}

// ====== UTILITY FUNCTIONS ======

function generateUUID() {
    const timestamp = new Date().getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return timestamp + random;
}

function createPropertyFolder(propertyAddress) {
    try {
        const parentFolder = DriveApp.getRootFolder();
        const folderName = `PropertyHub - ${propertyAddress} - ${new Date().toISOString().split('T')[0]}`;
        const folder = parentFolder.createFolder(folderName);
        return folder.getId();
    } catch (e) {
        Logger.log('Error creating folder: ' + e);
        return '';
    }
}

// ====== PROPERTIES OPERATIONS ======

function getProperties() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROPERTIES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const properties = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    }).filter(p => p.id);

    return { success: true, data: properties };
}

function addProperty(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROPERTIES);
    const id = generateUUID();
    const folderID = createPropertyFolder(params.address);

    sheet.appendRow([
        id,
        params.address || '',
        params.city || '',
        params.state || '',
        params.zip || '',
        params.type || 'single_family',
        parseFloat(params.purchase_price) || 0,
        params.purchase_date || '',
        parseFloat(params.current_value) || 0,
        parseFloat(params.market_rent) || 0,
        parseFloat(params.equity_percentage) || 100,
        parseInt(params.property_condition) || 3,
        params.electricity_provider || '',
        params.electricity_account_num || '',
        params.electricity_responsibility || 'Owner',
        params.water_provider || '',
        params.water_account_num || '',
        params.water_responsibility || 'Owner',
        params.gas_provider || '',
        params.gas_account_num || '',
        params.gas_responsibility || 'Owner',
        folderID,
        new Date()
    ]);

    logAudit('CREATE', id, 'Added property: ' + params.address);
    return { success: true, data: { id: id, folderID: folderID } };
}

function updateProperty(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROPERTIES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) {
            sheet.getRange(i + 1, 2, 1, headers.length - 1).setValues([[
                params.address || data[i][1],
                params.city || data[i][2],
                params.state || data[i][3],
                params.zip || data[i][4],
                params.type || data[i][5],
                parseFloat(params.purchase_price) || data[i][6],
                params.purchase_date || data[i][7],
                parseFloat(params.current_value) || data[i][8],
                parseFloat(params.market_rent) || data[i][9],
                parseFloat(params.equity_percentage) || data[i][10],
                parseInt(params.property_condition) || data[i][11],
                params.electricity_provider || data[i][12],
                params.electricity_account_num || data[i][13],
                params.electricity_responsibility || data[i][14],
                params.water_provider || data[i][15],
                params.water_account_num || data[i][16],
                params.water_responsibility || data[i][17],
                params.gas_provider || data[i][18],
                params.gas_account_num || data[i][19],
                params.gas_responsibility || data[i][20],
                data[i][21],
                data[i][22]
            ]]);

            logAudit('UPDATE', params.id, 'Updated property');
            return { success: true, data: { id: params.id } };
        }
    }

    return { error: 'Property not found' };
}

function deleteProperty(propertyId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROPERTIES);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === propertyId) {
            sheet.deleteRow(i + 1);
            logAudit('DELETE', propertyId, 'Deleted property');
            return { success: true };
        }
    }

    return { error: 'Property not found' };
}

// ====== MORTGAGES OPERATIONS ======

function getMortgages() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MORTGAGES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const mortgages = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        obj.original_balance = parseFloat(obj.original_balance) || 0;
        obj.current_balance = parseFloat(obj.current_balance) || 0;
        obj.interest_rate = parseFloat(obj.interest_rate) || 0;
        obj.monthly_payment = parseFloat(obj.monthly_payment) || 0;
        obj.escrow_payment = parseFloat(obj.escrow_payment) || 0;
        obj.remaining_term_months = parseInt(obj.remaining_term_months) || 0;
        return obj;
    }).filter(m => m.id);

    return { success: true, data: mortgages };
}

function addMortgage(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MORTGAGES);
    const id = generateUUID();

    sheet.appendRow([
        id,
        params.property_id || '',
        params.lender || '',
        parseFloat(params.original_balance) || 0,
        parseFloat(params.current_balance) || 0,
        parseFloat(params.interest_rate) || 0,
        parseFloat(params.monthly_payment) || 0,
        parseFloat(params.escrow_payment) || 0,
        parseInt(params.remaining_term_months) || 0,
        params.refinance_eligible_date || '',
        params.last_payment_date || '',
        new Date()
    ]);

    logAudit('CREATE', id, 'Added mortgage');
    return { success: true, data: { id: id } };
}

function updateMortgage(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MORTGAGES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) {
            sheet.getRange(i + 1, 2, 1, headers.length - 1).setValues([[
                params.property_id || data[i][1],
                params.lender || data[i][2],
                parseFloat(params.original_balance) || data[i][3],
                parseFloat(params.current_balance) || data[i][4],
                parseFloat(params.interest_rate) || data[i][5],
                parseFloat(params.monthly_payment) || data[i][6],
                parseFloat(params.escrow_payment) || data[i][7],
                parseInt(params.remaining_term_months) || data[i][8],
                params.refinance_eligible_date || data[i][9],
                params.last_payment_date || data[i][10],
                data[i][11]
            ]]);

            logAudit('UPDATE', params.id, 'Updated mortgage');
            return { success: true, data: { id: params.id } };
        }
    }

    return { error: 'Mortgage not found' };
}

function deleteMortgage(mortgageId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MORTGAGES);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === mortgageId) {
            sheet.deleteRow(i + 1);
            logAudit('DELETE', mortgageId, 'Deleted mortgage');
            return { success: true };
        }
    }

    return { error: 'Mortgage not found' };
}

// ====== EXPENSES OPERATIONS (ENHANCED) ======

function getExpenses() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EXPENSES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const expenses = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        obj.amount = parseFloat(obj.amount) || 0;
        return obj;
    }).filter(e => e.id);

    return { success: true, data: expenses };
}

function addExpense(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EXPENSES);
    const id = generateUUID();

    sheet.appendRow([
        id,
        params.property_id || '',
        params.category || 'other',
        parseFloat(params.amount) || 0,
        params.date || new Date().toISOString().split('T')[0],
        params.description || '',
        params.tenant_charge_id || '',
        params.should_bill_tenant || false,
        new Date()
    ]);

    // If should_bill_tenant is true and there's a tenant_id, create tenant charge
    if (params.should_bill_tenant && params.tenant_id) {
        addTenantCharge({
            tenant_id: params.tenant_id,
            expense_id: id,
            category: params.category,
            amount: params.amount,
            date: params.date,
            description: params.description
        });
    }

    logAudit('CREATE', id, 'Added expense');
    return { success: true, data: { id: id } };
}

function updateExpense(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EXPENSES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) {
            sheet.getRange(i + 1, 2, 1, headers.length - 1).setValues([[
                params.property_id || data[i][1],
                params.category || data[i][2],
                parseFloat(params.amount) || data[i][3],
                params.date || data[i][4],
                params.description || data[i][5],
                params.tenant_charge_id || data[i][6],
                params.should_bill_tenant || data[i][7],
                data[i][8]
            ]]);

            logAudit('UPDATE', params.id, 'Updated expense');
            return { success: true, data: { id: params.id } };
        }
    }

    return { error: 'Expense not found' };
}

// ====== CONTACTS OPERATIONS (NEW) ======

function getContacts() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CONTACTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const contacts = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    }).filter(c => c.id);

    return { success: true, data: contacts };
}

function addContact(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CONTACTS);
    const id = generateUUID();

    sheet.appendRow([
        id,
        params.property_id || '',
        params.contact_type || 'other',
        params.name || '',
        params.phone || '',
        params.email || '',
        params.address || '',
        params.service_type || '',
        params.notes || '',
        new Date()
    ]);

    logAudit('CREATE', id, 'Added contact: ' + params.name);
    return { success: true, data: { id: id } };
}

function updateContact(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CONTACTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) {
            sheet.getRange(i + 1, 2, 1, headers.length - 1).setValues([[
                params.property_id || data[i][1],
                params.contact_type || data[i][2],
                params.name || data[i][3],
                params.phone || data[i][4],
                params.email || data[i][5],
                params.address || data[i][6],
                params.service_type || data[i][7],
                params.notes || data[i][8],
                data[i][9]
            ]]);

            logAudit('UPDATE', params.id, 'Updated contact');
            return { success: true, data: { id: params.id } };
        }
    }

    return { error: 'Contact not found' };
}

function deleteContact(contactId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CONTACTS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === contactId) {
            sheet.deleteRow(i + 1);
            logAudit('DELETE', contactId, 'Deleted contact');
            return { success: true };
        }
    }

    return { error: 'Contact not found' };
}

// ====== TENANT CHARGES OPERATIONS (NEW) ======

function getTenantCharges() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TENANT_CHARGES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const charges = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        obj.amount = parseFloat(obj.amount) || 0;
        return obj;
    }).filter(c => c.id);

    return { success: true, data: charges };
}

function addTenantCharge(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TENANT_CHARGES);
    const id = generateUUID();

    sheet.appendRow([
        id,
        params.tenant_id || '',
        params.expense_id || '',
        params.category || 'other',
        parseFloat(params.amount) || 0,
        params.date || new Date().toISOString().split('T')[0],
        params.status || 'pending',
        params.description || '',
        new Date()
    ]);

    logAudit('CREATE', id, 'Added tenant charge');
    return { success: true, data: { id: id } };
}

// ====== TRIGGERS OPERATIONS (NEW) ======

function getTriggers() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TRIGGERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const triggers = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    }).filter(t => t.id);

    return { success: true, data: triggers };
}

// ====== DAILY TRIGGER CHECK (Run at 11 PM) ======

function checkTriggers() {
    const alerts = [];
    const userEmail = Session.getActiveUser().getEmail();

    // Get all data
    const properties = getProperties().data || [];
    const mortgages = getMortgages().data || [];
    const expenses = getExpenses().data || [];

    // Check for pending triggers
    const triggerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TRIGGERS);
    const triggerData = triggerSheet.getDataRange().getValues();

    for (let i = 1; i < triggerData.length; i++) {
        const trigger = triggerData[i];
        if (trigger[4] === 'pending') { // status column
            const dueDate = new Date(trigger[3]); // due_date column
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            if (daysUntilDue <= 0) {
                alerts.push(`⚠️ ${trigger[2]}: ${trigger[6]}`); // trigger_type and description
            }
        }
    }

    // Send email if there are alerts
    if (alerts.length > 0) {
        sendDailyNotificationEmail(userEmail, alerts);
    }

    Logger.log(`Triggers checked. Found ${alerts.length} pending issues.`);
}

function sendDailyNotificationEmail(userEmail, alerts) {
    const subject = `PropertyHub Daily Alert - ${new Date().toLocaleDateString()}`;
    const body = `
PropertyHub Daily Notification
=============================

You have ${alerts.length} pending issue(s):

${alerts.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Please log into PropertyHub to take action.

---
PropertyHub System
`;

    MailApp.sendEmail(userEmail, subject, body);
    Logger.log('Daily notification email sent to: ' + userEmail);
}

// ====== PORTFOLIO METRICS ======

function getPortfolioMetrics() {
    const properties = getProperties().data || [];
    const mortgages = getMortgages().data || [];
    const expenses = getExpenses().data || [];

    let totalValue = 0;
    let totalDebt = 0;
    let monthlyIncome = 0;

    properties.forEach(prop => {
        totalValue += parseFloat(prop.current_value) || 0;
    });

    mortgages.forEach(mort => {
        totalDebt += parseFloat(mort.current_balance) || 0;
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyExpenses = 0;
    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            monthlyExpenses += parseFloat(exp.amount) || 0;
        }
    });

    const totalEquity = totalValue - totalDebt;
    const netCashFlow = monthlyIncome - monthlyExpenses;

    return {
        success: true,
        data: {
            totalValue: totalValue,
            totalDebt: totalDebt,
            totalEquity: totalEquity,
            monthlyIncome: monthlyIncome,
            monthlyExpenses: monthlyExpenses,
            netCashFlow: netCashFlow,
            propertyCount: properties.length,
            mortgageCount: mortgages.length,
            ltv: totalValue > 0 ? (totalDebt / totalValue * 100).toFixed(1) : 0
        }
    };
}

// ====== TENANTS OPERATIONS ======

function getTenants() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TENANTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const tenants = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        obj.monthly_rent = parseFloat(obj.monthly_rent) || 0;
        obj.security_deposit = parseFloat(obj.security_deposit) || 0;
        return obj;
    }).filter(t => t.id);

    return { success: true, data: tenants };
}

function addTenant(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TENANTS);
    const id = generateUUID();

    sheet.appendRow([
        id,
        params.property_id || '',
        params.name || '',
        params.email || '',
        params.phone || '',
        params.lease_start_date || '',
        params.lease_end_date || '',
        parseFloat(params.monthly_rent) || 0,
        parseFloat(params.security_deposit) || 0,
        params.status || 'active',
        new Date()
    ]);

    logAudit('CREATE', id, 'Added tenant: ' + params.name);
    return { success: true, data: { id: id } };
}

function updateTenant(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TENANTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) {
            sheet.getRange(i + 1, 2, 1, headers.length - 1).setValues([[
                params.property_id || data[i][1],
                params.name || data[i][2],
                params.email || data[i][3],
                params.phone || data[i][4],
                params.lease_start_date || data[i][5],
                params.lease_end_date || data[i][6],
                parseFloat(params.monthly_rent) || data[i][7],
                parseFloat(params.security_deposit) || data[i][8],
                params.status || data[i][9]
            ]]);

            logAudit('UPDATE', params.id, 'Updated tenant: ' + params.name);
            return { success: true, data: { id: params.id } };
        }
    }

    return { error: 'Tenant not found' };
}

function deleteTenant(id) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TENANTS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
            sheet.deleteRow(i + 1);
            logAudit('DELETE', id, 'Deleted tenant');
            return { success: true };
        }
    }

    return { error: 'Tenant not found' };
}

// ====== RENT PAYMENTS OPERATIONS ======

function getRentPayments() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.RENT_PAYMENTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const payments = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        obj.amount = parseFloat(obj.amount) || 0;
        return obj;
    }).filter(p => p.id);

    return { success: true, data: payments };
}

function addRentPayment(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.RENT_PAYMENTS);
    const id = generateUUID();

    sheet.appendRow([
        id,
        params.tenant_id || '',
        params.property_id || '',
        params.month || new Date().toISOString().split('T')[0].substring(0, 7),
        parseFloat(params.amount) || 0,
        params.paid_date || '',
        params.status || 'pending',
        new Date()
    ]);

    logAudit('CREATE', id, 'Added rent payment for tenant: ' + params.tenant_id);
    return { success: true, data: { id: id } };
}

function updateRentPayment(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.RENT_PAYMENTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) {
            sheet.getRange(i + 1, 2, 1, headers.length - 1).setValues([[
                params.tenant_id || data[i][1],
                params.property_id || data[i][2],
                params.month || data[i][3],
                parseFloat(params.amount) || data[i][4],
                params.paid_date || data[i][5],
                params.status || data[i][6]
            ]]);

            logAudit('UPDATE', params.id, 'Updated rent payment status: ' + params.status);
            return { success: true, data: { id: params.id } };
        }
    }

    return { error: 'Rent payment not found' };
}

function deleteRentPayment(id) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.RENT_PAYMENTS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
            sheet.deleteRow(i + 1);
            logAudit('DELETE', id, 'Deleted rent payment');
            return { success: true };
        }
    }

    return { error: 'Rent payment not found' };
}

// ====== MORTGAGE PAYMENTS OPERATIONS ======

function getMortgagePayments() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MORTGAGE_PAYMENTS);
    if (!sheet) return { success: true, data: [] };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, data: [] };
    const headers = data[0];
    const rows = data.slice(1);

    const payments = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        obj.amount = parseFloat(obj.amount) || 0;
        obj.amount_paid = parseFloat(obj.amount_paid) || 0;
        return obj;
    }).filter(p => p.id);

    return { success: true, data: payments };
}

function addMortgagePayment(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MORTGAGE_PAYMENTS);
    const id = generateUUID();

    sheet.appendRow([
        id,
        params.mortgage_id || '',
        params.property_id || '',
        params.month || new Date().toISOString().split('T')[0].substring(0, 7),
        parseFloat(params.amount) || 0,
        parseFloat(params.amount_paid) || 0,
        params.paid_date || '',
        params.status || 'pending',
        new Date()
    ]);

    logAudit('CREATE', id, 'Added mortgage payment for mortgage: ' + params.mortgage_id);
    return { success: true, data: { id: id } };
}

function updateMortgagePayment(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MORTGAGE_PAYMENTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) {
            sheet.getRange(i + 1, 2, 1, headers.length - 2).setValues([[
                params.mortgage_id || data[i][1],
                params.property_id || data[i][2],
                params.month || data[i][3],
                parseFloat(params.amount) || data[i][4],
                parseFloat(params.amount_paid) || data[i][5],
                params.paid_date || data[i][6],
                params.status || data[i][7]
            ]]);

            logAudit('UPDATE', params.id, 'Updated mortgage payment status: ' + params.status);
            return { success: true, data: { id: params.id } };
        }
    }

    return { error: 'Mortgage payment not found' };
}

function deleteMortgagePayment(id) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MORTGAGE_PAYMENTS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
            sheet.deleteRow(i + 1);
            logAudit('DELETE', id, 'Deleted mortgage payment');
            return { success: true };
        }
    }

    return { error: 'Mortgage payment not found' };
}

// ====== AUDIT LOGGING ======

function logAudit(action, recordId, changes) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.AUDIT);
        sheet.appendRow([
            new Date(),
            Session.getActiveUser().getEmail(),
            action,
            recordId,
            changes
        ]);
    } catch (e) {
        Logger.log('Audit logging error: ' + e);
    }
}
