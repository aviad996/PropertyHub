// Reports utility - Data aggregation, formatting, and export functions

const Reports = {
    /**
     * Generate summary statistics
     */
    generateSummaryStats: (properties, mortgages, expenses, rentPayments) => {
        let totalValue = 0;
        let totalDebt = 0;
        let totalIncome = 0;
        let totalExpenses = 0;

        properties.forEach(prop => {
            totalValue += parseFloat(prop.current_value) || 0;
            const mortgage = mortgages?.find(m => m.property_id === prop.id);
            if (mortgage) {
                totalDebt += parseFloat(mortgage.current_balance) || 0;
            }
        });

        (expenses || []).forEach(exp => {
            totalExpenses += parseFloat(exp.amount) || 0;
        });

        (rentPayments || []).forEach(payment => {
            totalIncome += parseFloat(payment.amount) || 0;
        });

        return {
            totalValue,
            totalDebt,
            totalEquity: totalValue - totalDebt,
            totalIncome,
            totalExpenses,
            netCashFlow: totalIncome - totalExpenses,
            propertyCount: properties.length,
            ltv: totalValue > 0 ? ((totalDebt / totalValue) * 100).toFixed(2) : 0
        };
    },

    /**
     * Generate property report with all metrics
     */
    generatePropertyReport: (property, mortgages, expenses, rentPayments) => {
        const mortgage = mortgages?.find(m => m.property_id === property.id);
        const propExpenses = (expenses || []).filter(e => e.property_id === property.id);
        const propRentPayments = (rentPayments || []).filter(r => r.property_id === property.id);

        const totalExpenses = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const totalIncome = propRentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const equity = (property.current_value || 0) - (mortgage?.current_balance || 0);

        return {
            address: property.address,
            city: property.city,
            state: property.state,
            purchasePrice: property.purchase_price || 0,
            purchaseDate: property.purchase_date || 'N/A',
            currentValue: property.current_value || 0,
            mortgageBalance: mortgage?.current_balance || 0,
            mortgageLender: mortgage?.lender || 'N/A',
            mortgageRate: mortgage?.interest_rate || 0,
            mortgagePayment: mortgage?.monthly_payment || 0,
            equity: equity,
            equityPercentage: property.current_value > 0 ? ((equity / property.current_value) * 100).toFixed(1) : 0,
            marketRent: property.market_rent || 0,
            totalIncome: totalIncome,
            totalExpenses: totalExpenses,
            noi: totalIncome - totalExpenses,
            capRate: property.purchase_price > 0 ? (((totalIncome - totalExpenses) * 12 / property.purchase_price) * 100).toFixed(2) : 0,
            propertyCondition: property.property_condition || 'N/A'
        };
    },

    /**
     * Export data to CSV format
     */
    exportToCSV: (data, filename = 'report.csv') => {
        let csv = '';

        if (typeof data === 'string') {
            csv = data;
        } else if (Array.isArray(data)) {
            if (data.length === 0) return;

            // Add headers
            const headers = Object.keys(data[0]);
            csv = headers.map(h => `"${h}"`).join(',') + '\n';

            // Add rows
            data.forEach(row => {
                const values = headers.map(h => {
                    const value = row[h];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
                    return value;
                });
                csv += values.join(',') + '\n';
            });
        }

        // Trigger download
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    },

    /**
     * Export data to JSON format
     */
    exportToJSON: (data, filename = 'report.json') => {
        const json = JSON.stringify(data, null, 2);

        const element = document.createElement('a');
        element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(json));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    },

    /**
     * Generate tax deduction report
     */
    generateTaxDeductionReport: (expenses, properties) => {
        const deductionsByCategory = {};
        const deductionsByProperty = {};

        expenses.forEach(expense => {
            const category = expense.category || 'other';
            const propId = expense.property_id;

            // By category
            if (!deductionsByCategory[category]) {
                deductionsByCategory[category] = 0;
            }
            deductionsByCategory[category] += parseFloat(expense.amount) || 0;

            // By property
            if (!deductionsByProperty[propId]) {
                deductionsByProperty[propId] = {};
            }
            if (!deductionsByProperty[propId][category]) {
                deductionsByProperty[propId][category] = 0;
            }
            deductionsByProperty[propId][category] += parseFloat(expense.amount) || 0;
        });

        // Enhance with property names
        const propertyDeductions = Object.entries(deductionsByProperty).map(([propId, categories]) => {
            const property = properties?.find(p => String(p.id) === String(propId));
            return {
                propertyId: propId,
                address: property?.address || 'Unknown',
                deductions: categories,
                total: Object.values(categories).reduce((sum, val) => sum + val, 0)
            };
        });

        return {
            byCategory: deductionsByCategory,
            byProperty: propertyDeductions,
            totalDeductions: expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
        };
    },

    /**
     * Generate depreciation schedule
     */
    generateDepreciationSchedule: (properties, mortgages) => {
        return properties.map(prop => {
            const depreciation = Calculations.calculateDepreciation(prop);
            const mortgageData = mortgages?.find(m => m.property_id === prop.id);

            return {
                address: prop.address,
                purchasePrice: prop.purchase_price || 0,
                currentValue: prop.current_value || 0,
                buildingValue: (prop.purchase_price || 0) * 0.8,
                landValue: (prop.purchase_price || 0) * 0.2,
                annualDepreciation: depreciation,
                totalDepreciationMonths: ((prop.purchase_price || 0) * 0.8 / depreciation * 12).toFixed(1)
            };
        });
    },

    /**
     * Generate expense trend report
     */
    generateExpenseTrendReport: (expenses, startDate, endDate) => {
        const months = {};
        const categories = new Set();

        expenses.forEach(expense => {
            const expDate = new Date(expense.date);
            if (expDate >= startDate && expDate <= endDate) {
                const monthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
                const category = expense.category || 'other';

                if (!months[monthKey]) {
                    months[monthKey] = {};
                }
                if (!months[monthKey][category]) {
                    months[monthKey][category] = 0;
                }

                months[monthKey][category] += parseFloat(expense.amount) || 0;
                categories.add(category);
            }
        });

        // Convert to array format
        const trend = Object.entries(months).map(([month, categories]) => ({
            month,
            ...categories
        }));

        return {
            trend,
            categories: Array.from(categories)
        };
    },

    /**
     * Generate income trend report
     */
    generateIncomeTrendReport: (rentPayments, startDate, endDate) => {
        const months = {};

        (rentPayments || []).forEach(payment => {
            const payDate = new Date(payment.paid_date);
            if (payDate >= startDate && payDate <= endDate) {
                const monthKey = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;
                const status = payment.status || 'unknown';

                if (!months[monthKey]) {
                    months[monthKey] = {
                        total: 0,
                        paid: 0,
                        pending: 0,
                        late: 0
                    };
                }

                const amount = parseFloat(payment.amount) || 0;
                months[monthKey].total += amount;

                if (status === 'paid') {
                    months[monthKey].paid += amount;
                } else if (status === 'pending') {
                    months[monthKey].pending += amount;
                } else if (status === 'late') {
                    months[monthKey].late += amount;
                }
            }
        });

        // Convert to array format
        return Object.entries(months).map(([month, data]) => ({
            month,
            ...data
        }));
    },

    /**
     * Generate performance comparison (top vs bottom performers)
     */
    generatePerformanceComparison: (properties, mortgages, expenses, rentPayments, metric = 'roi') => {
        const propertyMetrics = properties.map(prop => {
            const mortgage = mortgages?.find(m => m.property_id === prop.id);
            const propExpenses = (expenses || []).filter(e => e.property_id === prop.id);
            const propRentPayments = (rentPayments || []).filter(r => r.property_id === prop.id);

            const totalExpenses = propExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            const totalIncome = propRentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

            let score = 0;
            if (metric === 'roi') {
                score = prop.current_value > 0 ? (((totalIncome - totalExpenses) / prop.current_value) * 100) : 0;
            } else if (metric === 'equity') {
                score = (prop.current_value || 0) - (mortgage?.current_balance || 0);
            } else if (metric === 'income') {
                score = totalIncome;
            }

            return {
                address: prop.address,
                score: score.toFixed(2),
                value: prop.current_value,
                income: totalIncome,
                expenses: totalExpenses
            };
        });

        propertyMetrics.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

        const half = Math.ceil(propertyMetrics.length / 2);
        return {
            topPerformers: propertyMetrics.slice(0, half),
            bottomPerformers: propertyMetrics.slice(half),
            metric: metric
        };
    },

    /**
     * Format table data for printing
     */
    generatePrintableHTML: (title, sections) => {
        let html = `
            <div class="print-report">
                <h1>${title}</h1>
                <p class="print-date">Generated: ${new Date().toLocaleDateString()}</p>
        `;

        sections.forEach(section => {
            html += `<h2>${section.title}</h2>`;
            if (section.content) {
                html += section.content;
            }
        });

        html += '</div>';
        return html;
    },

    /**
     * Aggregate expense data by time period
     */
    aggregateExpensesByPeriod: (expenses, periodType = 'month') => {
        const aggregated = {};

        expenses.forEach(expense => {
            const date = new Date(expense.date);
            let key;

            if (periodType === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (periodType === 'quarter') {
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                key = `${date.getFullYear()}-Q${quarter}`;
            } else if (periodType === 'year') {
                key = date.getFullYear().toString();
            }

            if (!aggregated[key]) {
                aggregated[key] = { count: 0, total: 0, categories: {} };
            }

            const amount = parseFloat(expense.amount) || 0;
            const category = expense.category || 'other';

            aggregated[key].count += 1;
            aggregated[key].total += amount;
            aggregated[key].categories[category] = (aggregated[key].categories[category] || 0) + amount;
        });

        return aggregated;
    }
};
