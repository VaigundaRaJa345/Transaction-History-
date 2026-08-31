const { FinancialSmsAgent, FinancialCalculationEngine, calculateSaving } = require('./app.js');

console.log('====================================================');
console.log('🧪 RUNNING FINANCIAL SMS AI AGENT COMPREHENSIVE TESTS 🧪');
console.log('====================================================\n');

let testsPassed = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  testsPassed++;
  console.log(`✅ [PASS] ${message}`);
}

// 1. SALARY CREDIT
{
  let sms = 'Your A/c XX1234 has been credited by Rs. 65,000.00 on 28-Aug-26 towards Monthly Salary from ACME CORP. Avl Bal: Rs. 85,000.';
  let res = FinancialSmsAgent.classify(sms, 'SBI-INB');
  assert(res.level1 === 'FINANCIAL' && res.level3 === 'SALARY', 'Salary Credit Classified correctly as FINANCIAL -> SALARY');
}

// 2. UPI DEBIT
{
  let sms = 'Dear SBI UPI User, Rs. 420.00 debited from A/c XX1234 on 29-Aug-26 to SWIGGY UPI Ref 623412345678. Avl Bal Rs. 64,580.';
  let res = FinancialSmsAgent.classify(sms, 'SBIUPI');
  assert(res.level1 === 'FINANCIAL' && res.level3 === 'UPI_DEBIT', 'UPI Debit Classified as FINANCIAL -> UPI_DEBIT');
}

// 3. UPI CREDIT
{
  let sms = 'Dear Customer, your A/c XX5678 has received Rs. 2,000.00 via UPI from Rahul Sharma Ref 623498765432.';
  let res = FinancialSmsAgent.classify(sms, 'HDFCBK');
  assert(res.level1 === 'FINANCIAL' && res.level3 === 'UPI_CREDIT', 'UPI Credit Classified as FINANCIAL -> UPI_CREDIT');
}

// 4. FD OPENING
{
  let sms = 'Fixed Deposit of INR 1,00,000.00 opened for 365 days at 7.10% in SBI A/c XX1234. Ref: FD987654. Matures on 29-Aug-2027.';
  let res = FinancialSmsAgent.classify(sms, 'SBI-FD');
  assert(res.level1 === 'FINANCIAL' && res.level2 === 'SAVINGS_PRODUCT' && res.level3 === 'FD_OPENED', 'FD Opened Classified as SAVINGS_PRODUCT -> FD_OPENED');
  let amt = FinancialSmsAgent.extractAmount(sms);
  let rate = FinancialSmsAgent.extractInterestRate(sms);
  let tenure = FinancialSmsAgent.extractTenure(sms);
  assert(amt === 100000 && rate === 7.1 && tenure === 12, 'FD parameters extracted accurately (Amount ₹1,00,000, Rate 7.1%, Tenure 12m)');
}

// 5. FD MATURITY
{
  let sms = 'Your Fixed Deposit FD987654 of Rs. 1,00,000 has matured. Maturity proceeds credited to A/c XX1234.';
  let res = FinancialSmsAgent.classify(sms, 'SBI-FD');
  assert(res.level3 === 'FD_MATURED', 'FD Maturity Classified as FD_MATURED');
}

// 6. FD RENEWAL
{
  let sms = 'Your Fixed Deposit FD987654 has been auto-renewed for 12 months at 7.00% p.a.';
  let res = FinancialSmsAgent.classify(sms, 'HDFCBK');
  assert(res.level3 === 'FD_RENEWED', 'FD Renewal Classified as FD_RENEWED');
}

// 7. FD INTEREST
{
  let sms = 'Interest of Rs. 1,750 credited to A/c XX1234 towards Term Deposit FD987654.';
  let res = FinancialSmsAgent.classify(sms, 'SBI-FD');
  assert(res.level3 === 'FD_INTEREST', 'FD Interest Classified as FD_INTEREST');
}

// 8. RD INSTALLMENT
{
  let sms = 'Recurring Deposit installment of Rs 5,000.00 received for RD A/c XX4321 on 10-Aug-26.';
  let res = FinancialSmsAgent.classify(sms, 'ICICIB');
  assert(res.level2 === 'SAVINGS_PRODUCT' && res.level3 === 'RD_INSTALLMENT', 'RD Installment Classified as SAVINGS_PRODUCT -> RD_INSTALLMENT');
}

// 9. RD MATURITY
{
  let sms = 'Your Recurring Deposit RD4321 has matured. Amount Rs. 64,500 credited to A/c XX1234.';
  let res = FinancialSmsAgent.classify(sms, 'SBI-RD');
  assert(res.level3 === 'RD_MATURED', 'RD Maturity Classified as RD_MATURED');
}

// 10. LOAN EMI DEBIT
{
  let sms = 'Dear Customer, Home Loan EMI of Rs. 18,500 debited from A/c XX1234 for Loan A/c HL9988.';
  let res = FinancialSmsAgent.classify(sms, 'HDFCBK');
  assert(res.level2 === 'LOAN' && res.level3 === 'EMI_DEBITED', 'Loan EMI Debited Classified as LOAN -> EMI_DEBITED');
}

// 11. CREDIT CARD BILL PAYMENT
{
  let sms = 'Payment of Rs. 12,450 received towards your Credit Card ending 8899 on 25-Aug-26.';
  let res = FinancialSmsAgent.classify(sms, 'AXISBK');
  assert(res.level2 === 'CREDIT_CARD' && res.level3 === 'CARD_PAYMENT', 'Credit Card Payment Classified as CREDIT_CARD -> CARD_PAYMENT');
}

// 12. REFUND
{
  let sms = 'Refund of Rs. 1,299.00 credited to A/c XX1234 from Amazon India on 27-Aug-26.';
  let res = FinancialSmsAgent.classify(sms, 'SBI-INB');
  assert(res.level2 === 'REFUND' && res.level3 === 'REFUND', 'Merchant Refund Classified as REFUND');
}

// 13. REVERSAL
{
  let sms = 'Failed transaction reversal of Rs. 500.00 credited back to A/c XX1234.';
  let res = FinancialSmsAgent.classify(sms, 'HDFCBK');
  assert(res.level2 === 'REVERSAL' && res.level3 === 'REVERSAL', 'Transaction Reversal Classified as REVERSAL');
}

// 14. BANK FEE
{
  let sms = 'Annual Maintenance Fee of Rs. 236.00 debited from A/c XX1234 on 15-Aug-26.';
  let res = FinancialSmsAgent.classify(sms, 'SBI-INB');
  assert(res.level3 === 'FEE', 'Bank Fee Classified as FEE');
}

// 15. SECURITY / OTP (MUST NOT INGEST INTO LEDGER)
{
  let sms = '483921 is your OTP for transaction of Rs 500.00 at Swiggy. Do not share with anyone.';
  let res = FinancialSmsAgent.classify(sms, 'SBIOTP');
  assert(res.level1 === 'SECURITY' && res.isFinancial === false, 'OTP Classified as SECURITY and flagged isFinancial: false');
}

// 16. PROMOTIONAL MESSAGE (MUST NOT INGEST INTO LEDGER)
{
  let sms = 'Special offer! You are pre-approved for a Personal Loan of Rs. 5,00,000 at 10.5% interest. Apply now!';
  let res = FinancialSmsAgent.classify(sms, 'HDFCBK');
  assert(res.level1 === 'PROMOTIONAL' && res.isFinancial === false, 'Promotional Offer Classified as PROMOTIONAL and flagged isFinancial: false');
}

// 17. TELECOM RECHARGE REMINDER (MUST BE IGNORED)
{
  let sms = 'Your daily 1.5GB high speed data pack validity expires tomorrow. Recharge with Rs 299.';
  let res = FinancialSmsAgent.classify(sms, 'JIO');
  assert(res.level1 === 'NON_FINANCIAL' && res.isFinancial === false, 'Telecom Reminder Classified as NON_FINANCIAL');
}

// 18. SAVINGS PORTFOLIO MATH ACCURACY
{
  let products = [
    { productType: 'FD', principalAmount: 100000, currentValue: 100000, status: 'ACTIVE' },
    { productType: 'RD', totalContributed: 60000, currentValue: 60000, status: 'ACTIVE' },
    { productType: 'FD', principalAmount: 50000, currentValue: 50000, status: 'MATURED' }
  ];
  let portfolio = FinancialCalculationEngine.calculateSavingsPortfolio(products, []);
  assert(portfolio.total === 160000, 'Savings Portfolio excludes matured products and accurately sums ₹1,60,000');
  assert(portfolio.activeFdCount === 1 && portfolio.activeRdCount === 1, 'Active FD and RD counts matched');
}

// 19. SORTING ORDER VERIFICATION
{
  let txs = [
    { id: 1, transactionDateTime: new Date('2026-08-25T10:00:00').getTime(), amount: 100 },
    { id: 2, transactionDateTime: new Date('2026-08-31T10:00:00').getTime(), amount: 200 },
    { id: 3, transactionDateTime: new Date('2026-08-28T10:00:00').getTime(), amount: 300 }
  ];

  let newToOld = txs.slice().sort((a, b) => b.transactionDateTime - a.transactionDateTime);
  assert(newToOld[0].id === 2 && newToOld[1].id === 3 && newToOld[2].id === 1, 'New to Old Sorting orders 31 Aug -> 28 Aug -> 25 Aug');

  let oldToNew = txs.slice().sort((a, b) => a.transactionDateTime - b.transactionDateTime);
  assert(oldToNew[0].id === 1 && oldToNew[1].id === 3 && oldToNew[2].id === 2, 'Old to New Sorting orders 25 Aug -> 28 Aug -> 31 Aug');
}

// 20. TRANSFER NEUTRALITY ON CONSOLIDATED BALANCE
{
  let accounts = [
    { id: 'sbi', bankName: 'SBI', openingBalance: 50000 },
    { id: 'hdfc', bankName: 'HDFC', openingBalance: 20000 }
  ];
  let transactions = [
    { id: 1, accountId: 'sbi', amount: 15000, transactionType: 'transfer_out', isTransfer: true, status: 'confirmed' },
    { id: 2, accountId: 'hdfc', amount: 15000, transactionType: 'transfer_in', isTransfer: true, status: 'confirmed' }
  ];
  let consolidated = FinancialCalculationEngine.calculateConsolidatedBalance(accounts, transactions);
  let income = FinancialCalculationEngine.calculateMonthlyIncome(transactions, 'all', null);
  let expenses = FinancialCalculationEngine.calculateMonthlyExpenses(transactions, 'all', null);

  assert(consolidated === 70000, 'Consolidated balance remains strictly ₹70,000 across transfer');
  assert(income === 0 && expenses === 0, 'Internal transfer creates ₹0 Income and ₹0 Expense');
}

console.log('\n====================================================');
console.log(`📊 SUMMARY: ${testsPassed}/${totalTests} TESTS PASSED`);
console.log('====================================================\n');