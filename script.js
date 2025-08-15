class CurrencyConverter {
    constructor() {
        this.apiKey = 'demo'; // Using demo API - for production, get a real API key
        this.baseUrl = 'https://api.exchangerate-api.com/v4/latest/';
        
        // Fallback rates for when API is not available
        this.fallbackRates = {
            'USD': {'EUR': 0.85, 'GBP': 0.73, 'JPY': 110, 'INR': 83, 'AUD': 1.35, 'CAD': 1.25, 'CHF': 0.92, 'CNY': 7.2, 'KRW': 1200, 'SGD': 1.35, 'NOK': 8.5, 'MXN': 18, 'ZAR': 15, 'BRL': 5.2, 'RUB': 75},
            'EUR': {'USD': 1.18, 'GBP': 0.86, 'JPY': 129, 'INR': 98, 'AUD': 1.59, 'CAD': 1.47, 'CHF': 1.08, 'CNY': 8.5, 'KRW': 1415, 'SGD': 1.59, 'NOK': 10, 'MXN': 21, 'ZAR': 17.6, 'BRL': 6.1, 'RUB': 88},
            'GBP': {'USD': 1.37, 'EUR': 1.16, 'JPY': 150, 'INR': 114, 'AUD': 1.85, 'CAD': 1.71, 'CHF': 1.26, 'CNY': 9.9, 'KRW': 1645, 'SGD': 1.85, 'NOK': 11.6, 'MXN': 24.7, 'ZAR': 20.5, 'BRL': 7.1, 'RUB': 103},
            'JPY': {'USD': 0.0091, 'EUR': 0.0077, 'GBP': 0.0067, 'INR': 0.75, 'AUD': 0.012, 'CAD': 0.011, 'CHF': 0.0084, 'CNY': 0.066, 'KRW': 10.9, 'SGD': 0.012, 'NOK': 0.077, 'MXN': 0.16, 'ZAR': 0.14, 'BRL': 0.047, 'RUB': 0.68},
            'INR': {'USD': 0.012, 'EUR': 0.010, 'GBP': 0.0088, 'JPY': 1.33, 'AUD': 0.016, 'CAD': 0.015, 'CHF': 0.011, 'CNY': 0.087, 'KRW': 14.5, 'SGD': 0.016, 'NOK': 0.10, 'MXN': 0.22, 'ZAR': 0.18, 'BRL': 0.063, 'RUB': 0.90}
        };
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const form = document.getElementById('converterForm');
        const swapBtn = document.getElementById('swapBtn');
        
        form.addEventListener('submit', this.handleConvert.bind(this));
        swapBtn.addEventListener('click', this.swapCurrencies.bind(this));
        
        // Auto-convert when amount changes
        const amountInput = document.getElementById('fromAmount');
        amountInput.addEventListener('input', this.debounce(this.autoConvert.bind(this), 500));
    }

    // Debounce function to limit API calls while typing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async handleConvert(e) {
        e.preventDefault();
        await this.convertCurrency();
    }

    async autoConvert() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;
        const amount = document.getElementById('fromAmount').value;

        if (fromCurrency && toCurrency && amount) {
            await this.convertCurrency();
        }
    }

    async convertCurrency() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;
        const amount = parseFloat(document.getElementById('fromAmount').value);

        // Validation
        if (!fromCurrency || !toCurrency || !amount) {
            this.showError('Please fill in all fields');
            return;
        }

        if (fromCurrency === toCurrency) {
            this.showResult(amount, amount, fromCurrency, toCurrency, 1);
            return;
        }

        this.showLoading(true);
        this.hideError();
        this.hideResult();

        try {
            const rate = await this.getExchangeRate(fromCurrency, toCurrency);
            const convertedAmount = amount * rate;
            this.showResult(amount, convertedAmount, fromCurrency, toCurrency, rate);
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Failed to fetch exchange rates. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async getExchangeRate(from, to) {
        try {
            // Try the primary API
            const response = await fetch(`${this.baseUrl}${from}`);
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            return data.rates[to];
        } catch (error) {
            // Fallback to demo rates
            console.log('Using fallback rates');
            if (this.fallbackRates[from] && this.fallbackRates[from][to]) {
                return this.fallbackRates[from][to];
            }
            // If no direct rate, try inverse
            if (this.fallbackRates[to] && this.fallbackRates[to][from]) {
                return 1 / this.fallbackRates[to][from];
            }
            throw new Error('Exchange rate not available');
        }
    }

    swapCurrencies() {
        const fromCurrency = document.getElementById('fromCurrency');
        const toCurrency = document.getElementById('toCurrency');
        
        const temp = fromCurrency.value;
        fromCurrency.value = toCurrency.value;
        toCurrency.value = temp;

        // Auto-convert after swap if amount exists
        if (document.getElementById('fromAmount').value) {
            this.autoConvert();
        }
    }

    showResult(originalAmount, convertedAmount, fromCurrency, toCurrency, rate) {
        const resultDiv = document.getElementById('result');
        const resultAmount = document.getElementById('resultAmount');
        const resultText = document.getElementById('resultText');
        const rateInfo = document.getElementById('rateInfo');

        resultAmount.textContent = this.formatAmount(convertedAmount, toCurrency);
        resultText.textContent = `${this.formatAmount(originalAmount, fromCurrency)} = ${this.formatAmount(convertedAmount, toCurrency)}`;
        rateInfo.textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;

        resultDiv.style.display = 'block';
    }

    formatAmount(amount, currency) {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            // Fallback formatting if currency is not supported
            return `${amount.toFixed(2)} ${currency}`;
        }
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }

    hideResult() {
        document.getElementById('result').style.display = 'none';
    }
}

// Initialize the currency converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});