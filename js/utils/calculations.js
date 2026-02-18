// Calculation utilities - runtime math for PropertyHub

const Calculations = {
    /**
     * Calculate principal and interest payment breakdown
     * Uses standard amortization formula
     */
    calculateAmortization: (balance, annualRate, months) => {
        if (!balance || !annualRate || !months) return { principal: 0, interest: 0 };

        const monthlyRate = annualRate / 100 / 12;
        const payment = Calculations.calculateMonthlyPayment(balance, monthlyRate, months);

        const interest = balance * monthlyRate;
        const principal = payment - interest;

        return {
            principal: Math.max(0, principal),
            interest: Math.max(0, interest),
            totalPayment: payment
        };
    },

    /**
     * Calculate monthly payment using standard mortgage formula
     * P * [r(1+r)^n] / [(1+r)^n - 1]
     */
    calculateMonthlyPayment: (principal, monthlyRate, months) => {
        if (!principal || !monthlyRate || !months) return 0;
        if (monthlyRate === 0) return principal / months;

        const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, months);
        const denominator = Math.pow(1 + monthlyRate, months) - 1;

        return numerator / denominator;
    },

    /**
     * Calculate remaining balance after N payments
     */
    calculateRemainingBalance: (originalBalance, monthlyRate, totalMonths, paymentsMade) => {
        if (monthlyRate === 0) {
            return originalBalance - (originalBalance / totalMonths) * paymentsMade;
        }

        const payment = Calculations.calculateMonthlyPayment(originalBalance, monthlyRate, totalMonths);
        const power = Math.pow(1 + monthlyRate, totalMonths - paymentsMade);

        return payment * ((power - 1) / (monthlyRate * power));
    },

    /**
     * Calculate portfolio metrics
     */
    calculatePortfolioMetrics: (properties, mortgages, expenses) => {
        let totalValue = 0;
        let totalDebt = 0;
        let totalMonthlyIncome = 0;
        let totalMonthlyExpenses = 0;

        // Sum property values and rent
        properties.forEach(prop => {
            totalValue += parseFloat(prop.current_value) || 0;
            totalMonthlyIncome += parseFloat(prop.market_rent) || 0;
        });

        // Sum mortgage balances
        mortgages.forEach(mort => {
            totalDebt += parseFloat(mort.current_balance) || 0;
        });

        // Sum current month expenses
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        expenses.forEach(exp => {
            const expDate = new Date(exp.date);
            if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
                totalMonthlyExpenses += parseFloat(exp.amount) || 0;
            }
        });

        const totalEquity = totalValue - totalDebt;
        const ltv = totalValue > 0 ? (totalDebt / totalValue * 100).toFixed(1) : 0;
        const netCashFlow = totalMonthlyIncome - totalMonthlyExpenses;

        return {
            totalValue,
            totalDebt,
            totalEquity,
            ltv,
            totalMonthlyIncome,
            totalMonthlyExpenses,
            netCashFlow,
            propertyCount: properties.length,
            mortgageCount: mortgages.length
        };
    },

    /**
     * Calculate annual NOI (Net Operating Income) for a property
     */
    calculateNOI: (monthlyRent, monthlyExpenses) => {
        return (monthlyRent - monthlyExpenses) * 12;
    },

    /**
     * Calculate Cap Rate
     */
    calculateCapRate: (annualNOI, purchasePrice) => {
        if (!purchasePrice || purchasePrice === 0) return 0;
        return (annualNOI / purchasePrice * 100).toFixed(2);
    },

    /**
     * Calculate Cash-on-Cash Return
     */
    calculateCashOnCash: (annualCashFlow, cashInvested) => {
        if (!cashInvested || cashInvested === 0) return 0;
        return (annualCashFlow / cashInvested * 100).toFixed(2);
    },

    /**
     * Calculate equity percentage
     */
    calculateEquityPercentage: (currentValue, mortgageBalance) => {
        if (!currentValue || currentValue === 0) return 0;
        return ((currentValue - mortgageBalance) / currentValue * 100).toFixed(1);
    },

    /**
     * Calculate property appreciation
     */
    calculateAppreciation: (currentValue, purchasePrice) => {
        if (!purchasePrice) return 0;
        return currentValue - purchasePrice;
    },

    /**
     * Calculate appreciation percentage
     */
    calculateAppreciationPercentage: (currentValue, purchasePrice) => {
        if (!purchasePrice || purchasePrice === 0) return 0;
        return ((currentValue - purchasePrice) / purchasePrice * 100).toFixed(2);
    },

    /**
     * Calculate ROI for a property in a given period
     */
    calculateROI: (property, mortgages, expenses, rentPayments, startDate, endDate) => {
        if (!property || !property.current_value || property.current_value === 0) return 0;

        const mortgage = mortgages?.find(m => String(m.property_id) === String(property.id));
        const propExpenses = (expenses || []).filter(e => String(e.property_id) === String(property.id));
        const propRentPayments = (rentPayments || []).filter(r => String(r.property_id) === String(property.id));

        // Filter by period
        const periodExpenses = propExpenses.filter(e => {
            const expDate = new Date(e.date);
            return expDate >= startDate && expDate <= endDate;
        });
        const periodRentPayments = propRentPayments.filter(r => {
            const payDate = new Date(r.paid_date);
            return payDate >= startDate && payDate <= endDate;
        });

        const totalIncome = periodRentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const totalExpenses = periodExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const netCashFlow = totalIncome - totalExpenses;

        // Annualize for comparison
        const daysInPeriod = (endDate - startDate) / (1000 * 60 * 60 * 24) || 1;
        const annualizedCashFlow = (netCashFlow / daysInPeriod) * 365;

        return (annualizedCashFlow / property.current_value * 100).toFixed(2);
    },

    /**
     * Calculate cash flow for a property
     */
    calculateCashFlow: (property, mortgages, expenses, rentPayments, startDate, endDate) => {
        const mortgage = mortgages?.find(m => String(m.property_id) === String(property.id));
        const propExpenses = (expenses || []).filter(e => String(e.property_id) === String(property.id));
        const propRentPayments = (rentPayments || []).filter(r => String(r.property_id) === String(property.id));

        // Filter by period
        const periodExpenses = propExpenses.filter(e => {
            const expDate = new Date(e.date);
            return expDate >= startDate && expDate <= endDate;
        });
        const periodRentPayments = propRentPayments.filter(r => {
            const payDate = new Date(r.paid_date);
            return payDate >= startDate && payDate <= endDate;
        });

        const totalIncome = periodRentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const totalExpenses = periodExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const mortgagePayments = (mortgage?.monthly_payment || 0) * 12; // Approximate for period

        return totalIncome - totalExpenses - mortgagePayments;
    },

    /**
     * Calculate expense ratio for a property
     */
    calculateExpenseRatio: (property, expenses, rentPayments, startDate, endDate) => {
        const propExpenses = (expenses || []).filter(e => String(e.property_id) === String(property.id));
        const propRentPayments = (rentPayments || []).filter(r => String(r.property_id) === String(property.id));

        // Filter by period
        const periodExpenses = propExpenses.filter(e => {
            const expDate = new Date(e.date);
            return expDate >= startDate && expDate <= endDate;
        });
        const periodRentPayments = propRentPayments.filter(r => {
            const payDate = new Date(r.paid_date);
            return payDate >= startDate && payDate <= endDate;
        });

        const totalIncome = periodRentPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const totalExpenses = periodExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        if (totalIncome === 0) return 0;
        return (totalExpenses / totalIncome * 100).toFixed(1);
    },

    /**
     * Get top performing properties by metric
     */
    getTopPerformers: (properties, mortgages, expenses, rentPayments, metric = 'roi', limit = 5, startDate, endDate) => {
        return properties
            .map(prop => {
                let score = 0;
                if (metric === 'roi') {
                    score = parseFloat(Calculations.calculateROI(prop, mortgages, expenses, rentPayments, startDate, endDate)) || 0;
                } else if (metric === 'equity') {
                    const mortgage = mortgages?.find(m => String(m.property_id) === String(prop.id));
                    score = (prop.current_value || 0) - (mortgage?.current_balance || 0);
                } else if (metric === 'cashflow') {
                    score = parseFloat(Calculations.calculateCashFlow(prop, mortgages, expenses, rentPayments, startDate, endDate)) || 0;
                }
                return { ...prop, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    },

    /**
     * Get underperforming properties by metric
     */
    getUnderperformers: (properties, mortgages, expenses, rentPayments, metric = 'roi', limit = 5, startDate, endDate) => {
        return properties
            .map(prop => {
                let score = 0;
                if (metric === 'roi') {
                    score = parseFloat(Calculations.calculateROI(prop, mortgages, expenses, rentPayments, startDate, endDate)) || 0;
                } else if (metric === 'equity') {
                    const mortgage = mortgages?.find(m => String(m.property_id) === String(prop.id));
                    score = (prop.current_value || 0) - (mortgage?.current_balance || 0);
                } else if (metric === 'cashflow') {
                    score = parseFloat(Calculations.calculateCashFlow(prop, mortgages, expenses, rentPayments, startDate, endDate)) || 0;
                }
                return { ...prop, score };
            })
            .sort((a, b) => a.score - b.score)
            .slice(0, limit);
    },

    /**
     * Calculate depreciation (simplified - not including land)
     * Standard: Building depreciated over 27.5 years for residential
     */
    calculateDepreciation: (property) => {
        if (!property || !property.current_value || !property.purchase_price) return 0;

        // Assume 80% of value is building, 20% is land (rough estimate)
        const buildingValue = property.purchase_price * 0.8;
        const depreciationPeriod = 27.5;
        const annualDepreciation = buildingValue / depreciationPeriod;

        return annualDepreciation.toFixed(2);
    },

    /**
     * Calculate capital gains
     */
    calculateCapGains: (property, salePrice) => {
        if (!property || !property.purchase_price) return 0;

        const costBasis = property.purchase_price;
        const gains = salePrice - costBasis;

        return {
            gains: gains.toFixed(2),
            gainsPercentage: (gains / costBasis * 100).toFixed(2),
            costBasis: costBasis,
            salePrice: salePrice
        };
    },

    /**
     * Calculate refinance ROI (return on investment for refinancing)
     */
    calculateRefinanceROI: (currentMortgage, newRate, loanAmount, closingCosts = 0, months = 60) => {
        if (!currentMortgage || !newRate || !loanAmount) return 0;

        const currentMonthlyRate = (currentMortgage.interest_rate || 0) / 100 / 12;
        const newMonthlyRate = newRate / 100 / 12;

        const currentPayment = Calculations.calculateMonthlyPayment(
            currentMortgage.current_balance || loanAmount,
            currentMonthlyRate,
            currentMortgage.remaining_term_months || months
        );

        const newPayment = Calculations.calculateMonthlyPayment(loanAmount, newMonthlyRate, months);
        const monthlySavings = currentPayment - newPayment;
        const breakEvenMonths = monthlySavings > 0 ? Math.ceil(closingCosts / monthlySavings) : Infinity;
        const totalSavings = (monthlySavings * months) - closingCosts;

        return {
            currentPayment: currentPayment.toFixed(2),
            newPayment: newPayment.toFixed(2),
            monthlyPaymentChange: (newPayment - currentPayment).toFixed(2),
            monthlyPaymentSavings: monthlySavings.toFixed(2),
            closingCosts: closingCosts,
            breakEvenMonths: breakEvenMonths,
            totalSavings: totalSavings.toFixed(2),
            worthRefinancing: breakEvenMonths < months
        };
    },

    /**
     * Calculate payback period
     */
    calculatePaybackPeriod: (investment, annualCashFlow) => {
        if (annualCashFlow <= 0) return Infinity;
        return (investment / annualCashFlow).toFixed(1);
    },

    /**
     * Calculate complete amortization schedule for a loan
     * Returns array of payments showing principal, interest, balance progression
     */
    generateAmortizationSchedule: (principal, annualRate, months) => {
        if (!principal || !annualRate || !months) return [];

        const monthlyRate = annualRate / 100 / 12;
        const monthlyPayment = Calculations.calculateMonthlyPayment(principal, monthlyRate, months);
        const schedule = [];

        let balance = principal;

        for (let month = 1; month <= months; month++) {
            const interestPayment = balance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            balance -= principalPayment;

            schedule.push({
                month: month,
                payment: monthlyPayment.toFixed(2),
                principal: principalPayment.toFixed(2),
                interest: interestPayment.toFixed(2),
                balance: Math.max(0, balance).toFixed(2)
            });
        }

        return schedule;
    },

    /**
     * Calculate IRR (Internal Rate of Return) using Newton-Raphson method
     * cashFlows: array of annual cash flows (first is negative investment)
     * Returns percentage IRR
     */
    calculateIRR: (cashFlows) => {
        if (!cashFlows || cashFlows.length < 2) return 0;

        // Initial guess for IRR (10%)
        let rate = 0.1;
        const maxIterations = 100;
        const tolerance = 0.0001;

        for (let i = 0; i < maxIterations; i++) {
            // Calculate NPV at current rate
            let npv = 0;
            let npvDerivative = 0;

            for (let t = 0; t < cashFlows.length; t++) {
                npv += cashFlows[t] / Math.pow(1 + rate, t);
                if (t > 0) {
                    npvDerivative -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
                }
            }

            // Guard against division by zero in Newton-Raphson
            if (npvDerivative === 0 || !isFinite(npvDerivative)) {
                return 0;
            }

            // Newton-Raphson iteration
            const newRate = rate - npv / npvDerivative;

            // Guard against NaN or Infinity
            if (!isFinite(newRate)) {
                return 0;
            }

            if (Math.abs(newRate - rate) < tolerance) {
                return parseFloat((rate * 100).toFixed(2));
            }

            rate = newRate;
        }

        const result = parseFloat((rate * 100).toFixed(2));
        return isFinite(result) ? result : 0;
    },

    /**
     * Calculate NPV (Net Present Value) at given discount rate
     * cashFlows: array of annual cash flows
     * discountRate: annual discount rate as decimal (0.05 for 5%)
     */
    calculateNPV: (cashFlows, discountRate) => {
        if (!cashFlows || cashFlows.length === 0) return 0;

        let npv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + discountRate, t);
        }

        return npv.toFixed(2);
    },

    /**
     * Generate refinance comparison scenarios
     * currentMortgage: existing mortgage details
     * newRateOptions: array of new rates to test
     * Returns array of scenarios with metrics
     */
    generateRefinanceScenarios: (currentMortgage, newRateOptions) => {
        if (!currentMortgage || !newRateOptions) return [];

        const scenarios = [];
        const currentMonthlyRate = (currentMortgage.interest_rate || 0) / 100 / 12;
        const currentPayment = Calculations.calculateMonthlyPayment(
            currentMortgage.current_balance || currentMortgage.original_balance,
            currentMonthlyRate,
            currentMortgage.remaining_term_months || (currentMortgage.term_months || 360)
        );

        // Add "Keep Current" scenario
        scenarios.push({
            name: 'Keep Current Loan',
            rate: currentMortgage.interest_rate,
            term: currentMortgage.remaining_term_months || (currentMortgage.term_months || 360),
            monthlyPayment: currentPayment.toFixed(2),
            closingCosts: 0,
            breakEven: 'N/A',
            monthlySavings: 0,
            recommendation: 'Baseline'
        });

        // Generate scenarios for each new rate
        newRateOptions.forEach(option => {
            const newMonthlyRate = option.rate / 100 / 12;
            const newTermMonths = (option.term ? option.term * 12 : null) || currentMortgage.remaining_term_months || 360;
            const newPayment = Calculations.calculateMonthlyPayment(
                currentMortgage.current_balance || currentMortgage.original_balance,
                newMonthlyRate,
                newTermMonths
            );

            const monthlySavings = currentPayment - newPayment;
            const breakEvenMonths = monthlySavings > 0 ? Math.ceil((option.closingCosts || 0) / monthlySavings) : Infinity;
            const remainingMonths = currentMortgage.remaining_term_months || (currentMortgage.term_months || 360);
            const worthIt = breakEvenMonths < remainingMonths;

            scenarios.push({
                name: `${option.rate}% for ${option.term || 30} years`,
                rate: option.rate,
                term: option.term || 30,
                monthlyPayment: newPayment.toFixed(2),
                closingCosts: (option.closingCosts || 0).toFixed(2),
                breakEven: breakEvenMonths === Infinity ? 'Never' : `${breakEvenMonths} months`,
                monthlySavings: monthlySavings.toFixed(2),
                totalSavings: ((monthlySavings * remainingMonths) - (option.closingCosts || 0)).toFixed(2),
                recommendation: worthIt ? 'Good' : (monthlySavings > 0 ? 'Marginal' : 'Not Recommended')
            });
        });

        return scenarios;
    },

    /**
     * Calculate total interest paid for loan term
     */
    calculateTotalInterest: (monthlyPayment, months) => {
        return (monthlyPayment * months).toFixed(2);
    },

    /**
     * Calculate weighted average interest rate across multiple mortgages
     */
    calculateWeightedAverageRate: (mortgages) => {
        if (!mortgages || mortgages.length === 0) return 0;

        let totalBalance = 0;
        let weightedRate = 0;

        mortgages.forEach(mort => {
            const balance = parseFloat(mort.current_balance) || 0;
            totalBalance += balance;
            weightedRate += balance * (parseFloat(mort.interest_rate) || 0);
        });

        if (totalBalance === 0) return 0;
        return (weightedRate / totalBalance).toFixed(2);
    }
};
