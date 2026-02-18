// PropertyHub - Google Apps Script Backend
// Copy this entire file into your Google Apps Script editor

const SHEET_NAMES = {
    PROPERTIES: 'Properties',
    MORTGAGES: 'Mortgages',
    EXPENSES: 'Expenses',
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

    // Create Properties sheet
    createSheetIfNotExists(ss, SHEET_NAMES.PROPERTIES, [
        'id', 'address', 'city', 'state', 'zip', 'type',
        'purchase_price', 'purchase_date', 'current_value', 'created_date'
    ]);

    // Create Mortgages sheet
    createSheetIfNotExists(ss, SHEET_NAMES.MORTGAGES, [
        'id', 'property_id', 'lender', 'original_balance', 'current_balance',
        'interest_rate', 'monthly_payment', 'escrow_payment', 'remaining_term_months',
        'refinance_eligible_date', 'last_payment_date', 'created_date'
    ]);

    // Create Expenses sheet
    createSheetIfNotExists(ss, SHEET_NAMES.EXPENSES, [
        'id', 'property_id', 'category', 'amount', 'date', 'description', 'created_date'
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
    }).filter(p => p.id); // Filter out empty rows

    return { success: true, data: properties };
}

function addProperty(params) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROPERTIES);
    const id = 'prop_' + Date.now();

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
        new Date()
    ]);

    logAudit('CREATE', id, 'Added property: ' + params.address);
    return { success: true, data: { id: id } };
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
                data[i][9]
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
        // Convert to numbers
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
    const id = 'mort_' + Date.now();

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

// ====== EXPENSES OPERATIONS ======

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
    const id = 'exp_' + Date.now();

    sheet.appendRow([
        id,
        params.property_id || '',
        params.category || 'other',
        parseFloat(params.amount) || 0,
        params.date || new Date().toISOString().split('T')[0],
        params.description || '',
        new Date()
    ]);

    logAudit('CREATE', id, 'Added expense');
    return { success: true, data: { id: id } };
}

// ====== PORTFOLIO METRICS ======

function getPortfolioMetrics() {
    const properties = getProperties().data || [];
    const mortgages = getMortgages().data || [];
    const expenses = getExpenses().data || [];

    let totalValue = 0;
    let totalDebt = 0;
    let monthlyIncome = 0;

    // Calculate total value and debt
    properties.forEach(prop => {
        totalValue += parseFloat(prop.current_value) || 0;
    });

    mortgages.forEach(mort => {
        totalDebt += parseFloat(mort.current_balance) || 0;
    });

    // Calculate monthly income (placeholder - would need tenant data)
    monthlyIncome = 0;

    // Calculate monthly expenses
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
