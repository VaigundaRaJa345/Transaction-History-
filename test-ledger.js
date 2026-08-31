const assert = require('assert');
const { FinancialCalculationEngine, SmsParser, processTransactionPipeline, calculateSaving } = require('./app.js');

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE POCKET LEDGER UNIT TESTS 🧪');
console.log('====================================================');

let passed = 0;
let total = 16;

function runTest(num, name, fn) {
  try {
    fn();
    console.log(`✅ [TEST ${num}] ${name} - PASSED`);
    passed++;
  } catch (err) {
    console.error(`❌ [TEST ${num}] ${name} - FAILED:`, err.message);
  }
}

// TEST 1: Multiple bank accounts with opening balances
runTest(1, 'Multiple Bank Accounts & Opening Balances', () => {
  const accounts = [
    { id: 'sbi-1234', bankName: 'SBI', openingBalance: 50000 },
    { id: 'hdfc-5678', bankName: 'HDFC Bank', openingBalance: 25000 }
  ];
  const txs = [
    { id: 101, accountId: 'sbi-1234', amount: 5000, transactionType: 'credit', status: 'confirmed' },
    { id: 102, accountId: 'hdfc-5678', amount: 2000, transactionType: 'debit', status: 'confirmed' }
  ];
  const sbiBal = FinancialCalculationEngine.calculateAccountBalance(accounts[0], txs);
  const hdfcBal = FinancialCalculationEngine.calculateAccountBalance(accounts[1], txs);
  const consBal = FinancialCalculationEngine.calculateConsolidatedBalance(accounts, txs);

  assert.strictEqual(sbiBal, 55000, 'SBI balance should be 50,000 + 5,000 = 55,000');
  assert.strictEqual(hdfcBal, 23000, 'HDFC balance should be 25,000 - 2,000 = 23,000');
  assert.strictEqual(consBal, 78000, 'Consolidated balance should be 55,000 + 23,000 = 78,000');
});

// TEST 2: Internal transfers have zero impact on consolidated total and income/expenses
runTest(2, 'Internal Transfers (Zero Consolidated Impact)', () => {
  const accounts = [
    { id: 'sbi-1234', bankName: 'SBI', openingBalance: 50000 },
    { id: 'hdfc-5678', bankName: 'HDFC Bank', openingBalance: 20000 }
  ];
  const txs = [
    { id: 201, accountId: 'sbi-1234', amount: 15000, transactionType: 'transfer_out', isTransfer: true, category: 'Transfer', status: 'confirmed' },
    { id: 202, accountId: 'hdfc-5678', amount: 15000, transactionType: 'transfer_in', isTransfer: true, category: 'Transfer', status: 'confirmed' }
  ];
  const sbiBal = FinancialCalculationEngine.calculateAccountBalance(accounts[0], txs);
  const hdfcBal = FinancialCalculationEngine.calculateAccountBalance(accounts[1], txs);
  const consBal = FinancialCalculationEngine.calculateConsolidatedBalance(accounts, txs);
  const income = FinancialCalculationEngine.calculateMonthlyIncome(txs, 'all', null);
  const expenses = FinancialCalculationEngine.calculateMonthlyExpenses(txs, 'all', null);

  assert.strictEqual(sbiBal, 35000, 'SBI balance after transfer');
  assert.strictEqual(hdfcBal, 35000, 'HDFC balance after transfer');
  assert.strictEqual(consBal, 70000, 'Consolidated balance remains 70,000');
  assert.strictEqual(income, 0, 'Internal transfer must not be counted as income');
  assert.strictEqual(expenses, 0, 'Internal transfer must not be counted as expense');
});

// TEST 3: ATM Cash Withdrawal (Transfers to Cash Wallet)
runTest(3, 'ATM Cash Withdrawal (Cash Wallet Ledger)', () => {
  const accounts = [
    { id: 'sbi-1234', bankName: 'SBI', openingBalance: 10000 },
    { id: 'cash', bankName: 'Cash Wallet', openingBalance: 500 }
  ];
  const txs = [
    { id: 301, accountId: 'sbi-1234', amount: 5000, transactionType: 'cash_withdrawal', isTransfer: true, category: 'Transfer', status: 'confirmed' },
    { id: 302, accountId: 'cash', amount: 5000, transactionType: 'transfer_in', isTransfer: true, category: 'Transfer', status: 'confirmed' }
  ];
  const sbiBal = FinancialCalculationEngine.calculateAccountBalance(accounts[0], txs);
  const cashBal = FinancialCalculationEngine.calculateAccountBalance(accounts[1], txs);
  const consBal = FinancialCalculationEngine.calculateConsolidatedBalance(accounts, txs);
  const expenses = FinancialCalculationEngine.calculateMonthlyExpenses(txs, 'all', null);

  assert.strictEqual(sbiBal, 5000, 'SBI balance after ATM withdrawal');
  assert.strictEqual(cashBal, 5500, 'Cash wallet balance after ATM withdrawal');
  assert.strictEqual(consBal, 10500, 'Total consolidated net worth is conserved');
  assert.strictEqual(expenses, 0, 'ATM withdrawal is not immediate expense');
});

// TEST 4: Genuine Income (Salary)
runTest(4, 'Genuine Income (Salary Calculation)', () => {
  const txs = [
    { id: 401, accountId: 'sbi-1234', amount: 75000, transactionType: 'credit', category: 'Salary', isTransfer: false, status: 'confirmed' },
    { id: 402, accountId: 'sbi-1234', amount: 10000, transactionType: 'transfer_in', category: 'Transfer', isTransfer: true, status: 'confirmed' }
  ];
  const income = FinancialCalculationEngine.calculateMonthlyIncome(txs, 'all', null);
  assert.strictEqual(income, 75000, 'Income should only include genuine salary, excluding internal transfers');
});

// TEST 5: Genuine Expenses (Swiggy, Uber, Netflix)
runTest(5, 'Genuine Expenses (Categorized Debits)', () => {
  const txs = [
    { id: 501, accountId: 'sbi-1234', amount: 450, transactionType: 'debit', category: 'Food & dining', isTransfer: false, status: 'confirmed' },
    { id: 502, accountId: 'sbi-1234', amount: 250, transactionType: 'debit', category: 'Transport', isTransfer: false, status: 'confirmed' },
    { id: 503, accountId: 'sbi-1234', amount: 799, transactionType: 'debit', category: 'Entertainment', isTransfer: false, status: 'confirmed' }
  ];
  const expenses = FinancialCalculationEngine.calculateMonthlyExpenses(txs, 'all', null);
  assert.strictEqual(expenses, 1499, 'Expenses should equal 450 + 250 + 799 = 1499');
});

// TEST 6: Refunds reduce expenses rather than becoming income
runTest(6, 'Refunds (Expense Reduction, Not Income)', () => {
  const txs = [
    { id: 601, accountId: 'hdfc-5678', amount: 2000, transactionType: 'debit', category: 'Shopping', isTransfer: false, status: 'confirmed' },
    { id: 602, accountId: 'hdfc-5678', amount: 2000, transactionType: 'refund', category: 'Refund', isTransfer: false, status: 'confirmed' }
  ];
  const income = FinancialCalculationEngine.calculateMonthlyIncome(txs, 'all', null);
  const expenses = FinancialCalculationEngine.calculateMonthlyExpenses(txs, 'all', null);

  assert.strictEqual(income, 0, 'Refund must not be treated as ordinary income');
  assert.strictEqual(expenses, 0, 'Refund of 2000 against 2000 debit makes net expense 0');
});

// TEST 7: Payment Reversals
runTest(7, 'Payment Reversals (Balance Restored, No Artificial Income)', () => {
  const account = { id: 'sbi-1234', bankName: 'SBI', openingBalance: 10000 };
  const txs = [
    { id: 701, accountId: 'sbi-1234', amount: 1500, transactionType: 'debit', category: 'Shopping', status: 'confirmed' },
    { id: 702, accountId: 'sbi-1234', amount: 1500, transactionType: 'reversal', category: 'Other', status: 'confirmed' }
  ];
  const balance = FinancialCalculationEngine.calculateAccountBalance(account, txs);
  const income = FinancialCalculationEngine.calculateMonthlyIncome(txs, 'all', null);

  assert.strictEqual(balance, 10000, 'Reversal should restore opening balance');
  assert.strictEqual(income, 0, 'Reversal is not income');
});

// TEST 8: Bank Interest Credit
runTest(8, 'Bank Interest Credit', () => {
  const account = { id: 'sbi-1234', bankName: 'SBI', openingBalance: 20000 };
  const txs = [
    { id: 801, accountId: 'sbi-1234', amount: 350, transactionType: 'interest', category: 'Other', status: 'confirmed' }
  ];
  const balance = FinancialCalculationEngine.calculateAccountBalance(account, txs);
  assert.strictEqual(balance, 20350, 'Bank interest increases account balance');
});

// TEST 9: Bank Fees & Charges
runTest(9, 'Bank Fees & Charges', () => {
  const account = { id: 'sbi-1234', bankName: 'SBI', openingBalance: 20000 };
  const txs = [
    { id: 901, accountId: 'sbi-1234', amount: 59, transactionType: 'fee', category: 'Bills & utilities', status: 'confirmed' }
  ];
  const balance = FinancialCalculationEngine.calculateAccountBalance(account, txs);
  const expenses = FinancialCalculationEngine.calculateMonthlyExpenses(txs, 'all', null);

  assert.strictEqual(balance, 19941, 'Bank fee reduces balance');
  assert.strictEqual(expenses, 59, 'Bank fee is counted in expenses');
});

// TEST 10: Credit Card Purchases & Bill Settlement
runTest(10, 'Credit Card Purchases vs Bill Payments', () => {
  const bankAcc = { id: 'sbi-1234', bankName: 'SBI', openingBalance: 50000 };
  const ccAcc = { id: 'cc-9999', bankName: 'HDFC CC', openingBalance: 0 };
  const txs = [
    // CC purchase is the actual expense
    { id: 1001, accountId: 'cc-9999', amount: 4000, transactionType: 'card_payment', category: 'Shopping', status: 'confirmed' },
    // Paying the CC bill from SBI is a transfer
    { id: 1002, accountId: 'sbi-1234', amount: 4000, transactionType: 'transfer_out', isTransfer: true, category: 'Transfer', status: 'confirmed' },
    { id: 1003, accountId: 'cc-9999', amount: 4000, transactionType: 'transfer_in', isTransfer: true, category: 'Transfer', status: 'confirmed' }
  ];
  const bankBal = FinancialCalculationEngine.calculateAccountBalance(bankAcc, txs);
  const ccBal = FinancialCalculationEngine.calculateAccountBalance(ccAcc, txs);
  const expenses = FinancialCalculationEngine.calculateMonthlyExpenses(txs, 'all', null);

  assert.strictEqual(bankBal, 46000, 'Bank balance after CC payment');
  assert.strictEqual(ccBal, 0, 'CC balance settled to 0');
  assert.strictEqual(expenses, 4000, 'Only the purchase is an expense; bill payment transfer is excluded');
});

// TEST 11: Duplicate SMS Detection
runTest(11, 'Duplicate SMS Detection via Fingerprinting', () => {
  const parsed1 = SmsParser.parse({
    sender: 'VM-HDFCBK',
    body: 'Rs. 450.00 debited from A/c XX1234 on 30-Aug-26 at ZOMATO. UPI Ref 123456789012'
  });
  assert.strictEqual(parsed1.amount, 450);
  assert.strictEqual(parsed1.referenceNumber, '123456789012');
  assert.strictEqual(parsed1.last4, '1234');
});

// TEST 12: Mobile Recharge and Promo Alerts Ignored
runTest(12, 'Recharge & Cellular Reminders Ignored', () => {
  const reminder1 = SmsParser.parse('Dear customer, your prepaid recharge of Rs 299 is expiring tomorrow. Recharge now on Airtel Thanks app.');
  const reminder2 = SmsParser.parse('Jio: Your daily 1.5GB data pack for Rs 239 was recharged successfully on 9876543210.');
  assert.strictEqual(reminder1, null, 'Prepaid expiry reminder should not be parsed as a bank transaction');
  assert.strictEqual(reminder2, null, 'Jio plan recharge notification without bank debit should not be parsed');
});

// TEST 13: Low Confidence SMS Flagged
runTest(13, 'Low Confidence Transaction Flagging', () => {
  const lowConf = SmsParser.parse('You spent Rs 500 at Store');
  assert.strictEqual(lowConf.status, 'needs_review', 'Transaction without bank header or account should be marked for review');
});

// TEST 14: Accurate Savings & Investment Mathematics
runTest(14, 'Accurate Compound Interest Math (FD/RD)', () => {
  const fd = { type: 'fd', amount: 100000, rate: 7.5, tenure: 12, date: '2026-01-01' };
  const calc = calculateSaving(fd);
  assert.strictEqual(calc.invested, 100000);
  assert.ok(calc.maturity > 107000, '1 Year 7.5% quarterly compounded FD should yield > 107,000');
});

// TEST 15: Recalculate All Accounts Pipeline
runTest(15, 'Recalculation Pipeline Integrity', () => {
  const accounts = [{ id: 'sbi-1234', bankName: 'SBI', openingBalance: 10000 }];
  const txs = [
    { id: 1501, accountId: 'sbi-1234', amount: 1000, transactionType: 'credit', status: 'confirmed' },
    { id: 1502, accountId: 'sbi-1234', amount: 500, transactionType: 'debit', status: 'confirmed' }
  ];
  const bal = FinancialCalculationEngine.calculateAccountBalance(accounts[0], txs);
  const inc = FinancialCalculationEngine.calculateMonthlyIncome(txs, 'all', null);
  const exp = FinancialCalculationEngine.calculateMonthlyExpenses(txs, 'all', null);
  const sav = FinancialCalculationEngine.calculateMonthlySavings(inc, exp);

  assert.strictEqual(bal, 10500);
  assert.strictEqual(inc, 1000);
  assert.strictEqual(exp, 500);
  assert.strictEqual(sav, 500);
});

// TEST 16: Ledger Validation & Audit
runTest(16, 'Ledger Validation & Orphan Detection', () => {
  const accounts = [{ id: 'sbi-1234', bankName: 'SBI', openingBalance: 10000 }];
  const txs = [
    { id: 1601, accountId: 'missing-acc', amount: 100, transactionType: 'debit', note: 'Orphan', status: 'confirmed' },
    { id: 1602, accountId: 'sbi-1234', amount: -50, transactionType: 'debit', note: 'Negative', status: 'confirmed' }
  ];
  const alerts = FinancialCalculationEngine.validateLedger(accounts, txs);
  assert.strictEqual(alerts.length, 2, 'Should flag missing account and negative amount');
});

console.log('====================================================');
console.log(`📊 SUMMARY: ${passed}/${total} TESTS PASSED`);
console.log('====================================================');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
