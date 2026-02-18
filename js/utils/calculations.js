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
    }
};
