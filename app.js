const categories = ['Food & dining', 'Transport', 'Shopping', 'Bills & utilities', 'Health', 'Entertainment', 'Salary', 'Transfer', 'Refund', 'Other'];

const seed = [
  { id: 1, accountId: 'cash', amount: 420, transactionType: 'debit', note: 'Swiggy', merchant: 'Swiggy', category: 'Food & dining', date: '2026-08-29', transactionDateTime: new Date('2026-08-29T12:00:00').getTime(), status: 'confirmed', source: 'SEED' },
  { id: 2, accountId: 'cash', amount: 65000, transactionType: 'credit', note: 'Monthly salary', merchant: 'Employer', category: 'Salary', date: '2026-08-28', transactionDateTime: new Date('2026-08-28T10:00:00').getTime(), status: 'confirmed', source: 'SEED' },
  { id: 3, accountId: 'cash', amount: 1250, transactionType: 'debit', note: 'Electricity bill', merchant: 'State Electricity Board', category: 'Bills & utilities', date: '2026-08-27', transactionDateTime: new Date('2026-08-27T14:30:00').getTime(), status: 'confirmed', source: 'SEED' },
  { id: 4, accountId: 'cash', amount: 180, transactionType: 'debit', note: 'Uber', merchant: 'Uber', category: 'Transport', date: '2026-08-26', transactionDateTime: new Date('2026-08-26T18:15:00').getTime(), status: 'confirmed', source: 'SEED' },
  { id: 5, accountId: 'cash', amount: 799, transactionType: 'debit', note: 'Netflix', merchant: 'Netflix', category: 'Entertainment', date: '2026-08-23', transactionDateTime: new Date('2026-08-23T09:00:00').getTime(), status: 'confirmed', source: 'SEED' }
];

let data = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pocket-ledger-v1') || 'null')) || {
  transactions: seed,
  budgets: [
    { category: 'Food & dining', limit: 6000 },
    { category: 'Transport', limit: 3000 },
    { category: 'Entertainment', limit: 2000 }
  ],
  recurring: [
    { name: 'Netflix', type: 'debit', amount: 799, day: 23 }
  ],
  accounts: [
    {
      id: 'cash',
      bankName: 'Cash / manual',
      accountName: 'Cash Wallet',
      maskedAccountNumber: '—',
      accountType: 'CASH',
      openingBalance: 0,
      openingBalanceDate: '2026-08-01',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  savings: []
};

// Database Schema Migration & Normalization
data.accounts = (data.accounts || []).map(a => ({
  id: a.id || 'cash',
  bankName: a.bankName || a.bank || 'Cash / manual',
  accountName: a.accountName || a.bank || 'Cash Wallet',
  maskedAccountNumber: a.maskedAccountNumber || a.last4 || '—',
  accountType: a.accountType || (a.id === 'cash' ? 'CASH' : 'SAVINGS'),
  openingBalance: parseFloat(a.openingBalance || 0),
  openingBalanceDate: a.openingBalanceDate || '2026-08-01',
  isActive: a.isActive !== undefined ? a.isActive : true,
  createdAt: a.createdAt || Date.now(),
  updatedAt: a.updatedAt || Date.now()
}));

if (!data.accounts.some(a => a.id === 'cash')) {
  data.accounts.push({
    id: 'cash',
    bankName: 'Cash / manual',
    accountName: 'Cash Wallet',
    maskedAccountNumber: '—',
    accountType: 'CASH',
    openingBalance: 0,
    openingBalanceDate: '2026-08-01',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

data.transactions = (data.transactions || []).map(t => {
  let type = t.transactionType || t.type || 'debit';
  return {
    id: t.id || (Date.now() + Math.random()),
    accountId: t.accountId || t.account || 'cash',
    amount: parseFloat(t.amount || 0),
    transactionType: type,
    transactionDateTime: t.transactionDateTime || (t.date ? new Date(t.date + 'T12:00:00').getTime() : Date.now()),
    date: t.date || localDate(Date.now()),
    description: t.description || t.note || 'Transaction',
    merchant: t.merchant || t.note || 'Transaction',
    note: t.note || t.merchant || 'Transaction',
    category: t.category || 'Other',
    referenceNumber: t.referenceNumber || null,
    confidenceScore: t.confidenceScore || 100,
    isTransfer: t.isTransfer || false,
    transferGroupId: t.transferGroupId || null,
    status: t.status || 'confirmed',
    source: t.source || 'MANUAL',
    createdAt: t.createdAt || Date.now(),
    updatedAt: t.updatedAt || Date.now()
  };
});

data.savings = data.savings || [];

const $ = s => (typeof document !== 'undefined' ? document.querySelector(s) : null);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const today = new Date();
const localDate = d => {
  let o = d instanceof Date ? d : new Date(d);
  if (isNaN(o.getTime())) o = new Date();
  return new Date(o.getTime() - o.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

if (typeof document !== 'undefined' && $('#today')) {
  $('#today').textContent = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function calculateSaving(s) {
  let principal = parseFloat(s.amount), r = parseFloat(s.rate) / 100, tenure = parseInt(s.tenure);
  let start = new Date(s.date + 'T00:00:00'), maturityDate = new Date(start.getTime());
  maturityDate.setMonth(maturityDate.getMonth() + tenure);
  let elapsedMonths = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) elapsedMonths = Math.max(0, elapsedMonths - 1);
  elapsedMonths = Math.min(tenure, Math.max(0, elapsedMonths));
  let progress = (elapsedMonths / tenure) * 100, invested = 0, current = 0, maturity = 0;
  if (s.type === 'fd') {
    invested = principal;
    maturity = principal * Math.pow(1 + r / 4, 4 * (tenure / 12));
    current = principal * Math.pow(1 + r / 4, 4 * (elapsedMonths / 12));
  } else if (s.type === 'rd') {
    invested = principal * (elapsedMonths || 1);
    for (let i = 1; i <= tenure; i++) maturity += principal * Math.pow(1 + r / 4, 4 * (i / 12));
    for (let i = 1; i <= elapsedMonths; i++) current += principal * Math.pow(1 + r / 4, 4 * (i / 12));
    if (elapsedMonths === 0) { current = principal; invested = principal; }
  } else if (s.type === 'sip') {
    invested = principal * (elapsedMonths || 1);
    let mr = r / 12;
    if (mr > 0) {
      maturity = principal * ((Math.pow(1 + mr, tenure) - 1) / mr) * (1 + mr);
      current = principal * ((Math.pow(1 + mr, elapsedMonths) - 1) / mr) * (1 + mr);
    } else {
      maturity = principal * tenure;
      current = principal * elapsedMonths;
    }
    if (elapsedMonths === 0) { current = principal; invested = principal; }
  } else if (s.type === 'ppf') {
    invested = principal;
    maturity = principal * Math.pow(1 + r, tenure / 12);
    current = principal * Math.pow(1 + r, elapsedMonths / 12);
  } else {
    invested = principal;
    maturity = principal * (1 + r * (tenure / 12));
    current = principal * (1 + r * (elapsedMonths / 12));
  }
  return {
    invested: Math.round(invested),
    current: Math.round(current),
    maturity: Math.round(maturity),
    maturityDate: maturityDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    progress: Math.min(100, Math.max(0, progress))
  };
}

function save() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pocket-ledger-v1', JSON.stringify(data));
  }
  render();
  if (typeof window !== 'undefined' && window.LedgerCloud && LedgerCloud.enabled()) {
    LedgerCloud.push(data).then(() => {
      if ($('#syncText')) $('#syncText').textContent = 'Backed up to Google Sheets';
    }).catch(() => {
      if ($('#syncText')) $('#syncText').textContent = 'Sheet backup needs attention';
    });
  }
}

function isCurrent(t) {
  let d = new Date(t.date + 'T12:00:00');
  return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function filtered() {
  if (typeof document === 'undefined' || !$('#monthPicker')) return data.transactions;
  return $('#monthPicker').value === 'all' ? data.transactions : data.transactions.filter(isCurrent);
}

function icon(c) {
  return ({ 'Food & dining': '🍜', Transport: '◒', Shopping: '◈', 'Bills & utilities': '▤', Health: '✚', Entertainment: '◉', Salary: '₹', Transfer: '↔', Refund: '↩', Other: '•' })[c] || '•';
}

function accountName(id) {
  let a = data.accounts.find(x => x.id === id);
  return a ? `${a.bankName} · ${a.maskedAccountNumber}` : 'Account pending';
}

// ----------------------------------------------------
// FINANCIAL CALCULATION ENGINE (Canonical Ledger Math)
// ----------------------------------------------------
const FinancialCalculationEngine = {
  calculateAccountBalance(account, transactions) {
    let balance = parseFloat(account.openingBalance || 0);
    let txs = transactions.filter(t => t.accountId === account.id && t.status !== 'duplicate');
    txs.forEach(t => {
      if (['credit', 'transfer_in', 'refund', 'interest'].includes(t.transactionType)) {
        balance += t.amount;
      } else if (['debit', 'transfer_out', 'cash_withdrawal', 'card_payment', 'fee'].includes(t.transactionType)) {
        balance -= t.amount;
      } else if (t.transactionType === 'reversal') {
        balance += t.amount;
      } else if (t.transactionType === 'adjustment') {
        balance += t.amount;
      }
    });
    return balance;
  },

  calculateConsolidatedBalance(accounts, transactions) {
    return accounts.reduce((sum, acc) => sum + this.calculateAccountBalance(acc, transactions), 0);
  },

  calculateMonthlyIncome(transactions, accountIdFilter, dateRangeFilter) {
    let incomeTxs = transactions.filter(t => {
      if (t.status === 'duplicate' || t.status === 'needs_review') return false;
      if (accountIdFilter && accountIdFilter !== 'all' && t.accountId !== accountIdFilter) return false;
      if (dateRangeFilter && !dateRangeFilter(t)) return false;
      // Exclude transfers, refunds, reversals, and non-genuine credit inflows
      return t.transactionType === 'credit' && !t.isTransfer && t.category !== 'Transfer' && t.category !== 'Refund';
    });
    return incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  },

  calculateMonthlyExpenses(transactions, accountIdFilter, dateRangeFilter) {
    let debitTxs = transactions.filter(t => {
      if (t.status === 'duplicate' || t.status === 'needs_review') return false;
      if (accountIdFilter && accountIdFilter !== 'all' && t.accountId !== accountIdFilter) return false;
      if (dateRangeFilter && !dateRangeFilter(t)) return false;
      // Exclude transfers, cash withdrawals (which transfer to cash wallet), and credit-card payments from double counting
      return ['debit', 'card_payment', 'fee'].includes(t.transactionType) && !t.isTransfer && t.category !== 'Transfer';
    });
    let totalDebits = debitTxs.reduce((sum, t) => sum + t.amount, 0);

    // Subtract refunds from expenses
    let refundTxs = transactions.filter(t => {
      if (t.status === 'duplicate' || t.status === 'needs_review') return false;
      if (accountIdFilter && accountIdFilter !== 'all' && t.accountId !== accountIdFilter) return false;
      if (dateRangeFilter && !dateRangeFilter(t)) return false;
      return t.transactionType === 'refund';
    });
    let totalRefunds = refundTxs.reduce((sum, t) => sum + t.amount, 0);

    return Math.max(0, totalDebits - totalRefunds);
  },

  calculateMonthlySavings(income, expenses) {
    return income - expenses;
  },

  validateLedger(accounts, transactions) {
    let alerts = [];
    transactions.forEach(t => {
      if (t.status === 'duplicate') return;
      if (!t.accountId || !accounts.some(a => a.id === t.accountId)) {
        alerts.push(`Transaction #${t.id} ("${t.merchant || t.note}") is missing a valid bank account.`);
      }
      if (t.amount <= 0) {
        alerts.push(`Transaction #${t.id} has invalid amount ₹${t.amount}.`);
      }
      if (t.isTransfer && !transactions.some(x => x.id !== t.id && x.transferGroupId === t.transferGroupId)) {
        alerts.push(`Transfer transaction #${t.id} ("${t.merchant || t.note}") has no matching counterpart.`);
      }
    });
    return alerts;
  }
};

// ----------------------------------------------------
// SMS PARSER & TRANSACTION CLASSIFIER
// ----------------------------------------------------
const SmsParser = {
  parse(rawSms) {
    let body = typeof rawSms === 'string' ? rawSms : rawSms.body || '';
    let sender = typeof rawSms === 'string' ? '' : rawSms.sender || '';
    let text = body.replace(/\s+/g, ' ');

    let bankMap = {
      HDF: 'HDFC Bank', ICICI: 'ICICI Bank', SBIN: 'State Bank of India', SBI: 'State Bank of India',
      AXIS: 'Axis Bank', KOTAK: 'Kotak Mahindra Bank', IDFC: 'IDFC FIRST Bank', INDUS: 'IndusInd Bank',
      YES: 'Yes Bank', PAYTM: 'Paytm', PHONEPE: 'PhonePe', GPAY: 'Google Pay', UNION: 'Union Bank of India',
      CANARA: 'Canara Bank', PNB: 'Punjab National Bank', BOI: 'Bank of India', BARODA: 'Bank of Baroda',
      BOB: 'Bank of Baroda', FEDERAL: 'Federal Bank', HSBC: 'HSBC Bank', SCB: 'Standard Chartered',
      CITI: 'Citi Bank', AMEX: 'American Express', RBL: 'RBL Bank', BANDHAN: 'Bandhan Bank',
      IOB: 'Indian Overseas Bank', UCO: 'UCO Bank', CENTRAL: 'Central Bank of India', CBI: 'Central Bank of India'
    };
    let bankKey = Object.keys(bankMap).find(k => (sender + ' ' + text).toUpperCase().includes(k));
    let bank = bankKey ? bankMap[bankKey] : 'Unknown Bank';

    let last4Match = text.match(/(?:a\/?c(?:count)?|card|xx|x{2,}|ending\s*(?:in|with)?)\s*(?:no\.?\s*)?(\d{4})/i);
    let last4 = last4Match ? last4Match[1] : null;
    if (!last4) {
      let words = text.match(/\b\d{4}\b/g);
      if (words) last4 = words[words.length - 1];
    }
    if (!last4) last4 = 'Unknown';

    let amountRegex = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
    let matches = [], match;
    while ((match = amountRegex.exec(text)) !== null) {
      matches.push({ index: match.index, rawAmount: match[1], val: parseFloat(match[1].replace(/,/g, '')) });
    }
    if (matches.length === 0) return null;

    let txAmount = null;
    for (let m of matches) {
      let start = Math.max(0, m.index - 25), end = Math.min(text.length, m.index + m.rawAmount.length + 25);
      let context = text.slice(start, end).toLowerCase();
      if (!/bal|balance|limit|outstanding|due|minimum/i.test(context)) {
        txAmount = m.val;
        break;
      }
    }
    if (txAmount === null) txAmount = matches[0].val;

    let refMatch = text.match(/(?:upi\s*ref|utr|rrn|ref\s*(?:no)?\.?)\s*#?\s*([a-z0-9]+)/i);
    let referenceNumber = refMatch ? refMatch[1] : null;
    if (!referenceNumber) {
      let rrnMatch = text.match(/\b\d{12}\b/);
      if (rrnMatch) referenceNumber = rrnMatch[0];
    }

    let isDebit = /\b(?:debit\w*|spent|paid|withdraw\w*|charg\w*|deduct\w*|sent|transfer\w*)\b/i.test(text);
    let isCredit = /\b(?:credit\w*|receiv\w*|deposit\w*|refund\w*|added)\b/i.test(text);
    let isRechargeAlert = /\b(?:recharge\w*|prepaid|postpaid)\b/i.test(text) && !/\b(?:debited|credited)\b/i.test(text);
    if (isRechargeAlert) return null;
    if (!isDebit && !isCredit) return null;

    let type = isDebit ? 'debit' : 'credit';
    let category = isDebit ? 'Other' : 'Transfer';
    if (/refund/i.test(text)) {
      type = 'refund';
      category = 'Refund';
    } else if (/reversal|reversed/i.test(text)) {
      type = 'reversal';
    } else if (/atm\s*withdraw|cash\s*withdraw/i.test(text)) {
      type = 'cash_withdrawal';
      category = 'Other';
    } else if (/\b(?:fee|charge)\b/i.test(text)) {
      type = 'fee';
      category = 'Bills & utilities';
    } else if (/interest/i.test(text)) {
      type = 'interest';
      category = 'Other';
    } else if (/salary/i.test(text)) {
      category = 'Salary';
    }

    let merchantMatch = text.match(/(?:at|to|towards|info|vpa|spent on)\s+([a-z0-9 .&_-]+?)(?:\.|\s+(?:on|avl|ref|via|bal)\b|$)/i);
    let merchant = merchantMatch ? merchantMatch[1].trim() : 'Bank transaction';

    let dateMatch = text.match(/(?:on)\s+(\d{1,2}[-\/]?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})[-\/]?\d{0,4})/i);
    let dateVal = dateMatch ? dateMatch[1] : null;

    let hasBank = bank !== 'Unknown Bank', hasLast4 = last4 !== 'Unknown', hasRef = referenceNumber !== null;
    let confidenceScore = (hasBank ? 20 : 0) + (hasLast4 ? 20 : 0) + (txAmount ? 20 : 0) + (hasRef ? 20 : 0) + ((isDebit || isCredit) ? 20 : 0);

    return {
      bank,
      last4,
      amount: txAmount,
      transactionType: type,
      referenceNumber,
      merchant,
      category,
      dateVal,
      confidenceScore,
      isTransfer: false,
      transferGroupId: null,
      status: confidenceScore >= 60 ? 'confirmed' : 'needs_review'
    };
  }
};

function processTransactionPipeline(rawSms) {
  let parsed = SmsParser.parse(rawSms);
  if (!parsed) return null;
  let accountId = findAccount(parsed.bank, parsed.last4);
  let tx = {
    id: Date.now() + Math.random(),
    accountId: accountId,
    amount: parsed.amount,
    transactionType: parsed.transactionType,
    transactionDateTime: typeof rawSms === 'string' ? Date.now() : rawSms.time || Date.now(),
    description: typeof rawSms === 'string' ? rawSms : rawSms.body || '',
    merchant: parsed.merchant,
    note: parsed.merchant,
    category: parsed.category,
    referenceNumber: parsed.referenceNumber,
    confidenceScore: parsed.confidenceScore,
    isTransfer: parsed.isTransfer,
    transferGroupId: parsed.transferGroupId,
    status: parsed.status,
    source: 'SMS',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  tx.date = localDate(parsed.dateVal ? new Date(parsed.dateVal) : tx.transactionDateTime);
  let fingerprint = `${tx.accountId}-${tx.amount}-${tx.transactionType}-${tx.referenceNumber || (tx.date + '-' + tx.merchant)}`;
  tx.transactionFingerprint = fingerprint;

  let isDup = data.transactions.some(t => {
    if (t.status === 'duplicate') return false;
    if (tx.referenceNumber && t.referenceNumber === tx.referenceNumber) return true;
    return t.accountId === tx.accountId && t.amount === tx.amount && t.transactionType === tx.transactionType && t.date === tx.date;
  });
  if (isDup) tx.status = 'duplicate';
  return tx;
}

function recalculateAllAccounts() {
  data.transactions.forEach(t => {
    if (t.source === 'SMS' && t.status !== 'duplicate') {
      t.isTransfer = false;
      t.transferGroupId = null;
      if (t.transactionType === 'transfer_out') t.transactionType = 'debit';
      if (t.transactionType === 'transfer_in') t.transactionType = 'credit';
      if (t.category === 'Transfer') t.category = 'Other';
    }
  });

  // Handle cash withdrawals (Bank -> Cash wallet transfer)
  data.transactions.forEach(t => {
    if (t.transactionType === 'cash_withdrawal' && !t.isTransfer) {
      t.isTransfer = true;
      t.category = 'Transfer';
      t.transferGroupId = `trf_cash_${t.id}`;
    }
  });

  // Handle credit card payments from bank accounts
  data.transactions.forEach(t => {
    if (/credit\s*card\s*bill|cc\s*payment/i.test(t.merchant || t.note || '') && !t.isTransfer) {
      t.isTransfer = true;
      t.category = 'Transfer';
    }
  });

  // Transfer matching across accounts
  for (let i = 0; i < data.transactions.length; i++) {
    let tx = data.transactions[i];
    if (tx.status === 'duplicate' || tx.isTransfer) continue;
    if (tx.transactionType === 'debit' || tx.transactionType === 'transfer_out') {
      let match = data.transactions.find(t => {
        if (t.id === tx.id || t.status === 'duplicate' || t.isTransfer) return false;
        if (t.accountId === tx.accountId) return false;
        if (t.amount !== tx.amount) return false;
        let diff = Math.abs(t.transactionDateTime - tx.transactionDateTime);
        let isClose = diff <= 10 * 60 * 1000;
        let refMatch = tx.referenceNumber && t.referenceNumber && tx.referenceNumber === t.referenceNumber;
        return (t.transactionType === 'credit' || t.transactionType === 'transfer_in') && (isClose || refMatch);
      });
      if (match) {
        let gId = `trf_${tx.id}_${match.id}`;
        tx.isTransfer = true;
        tx.transferGroupId = gId;
        tx.transactionType = 'transfer_out';
        tx.category = 'Transfer';
        match.isTransfer = true;
        match.transferGroupId = gId;
        match.transactionType = 'transfer_in';
        match.category = 'Transfer';
      }
    }
  }

  render();
}

function txRow(t) {
  let d = new Date(t.date + 'T12:00:00');
  let typeClass = (['credit', 'transfer_in', 'refund', 'reversal', 'interest'].includes(t.transactionType)) ? 'credit' : 'debit';
  let sign = typeClass === 'credit' ? '+' : '−';
  let typeLabel = t.transactionType.toUpperCase().replace('_', ' ');
  let warningBadge = t.status === 'needs_review' ? ' <span style="background: var(--coral); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">Review</span>' : '';
  let duplicateBadge = t.status === 'duplicate' ? ' <span style="background: var(--muted); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">Duplicate</span>' : '';

  return `<div class="transaction" onclick="editTransaction(${t.id})" style="cursor: pointer;">
    <div class="avatar">${icon(t.category)}</div>
    <div>
      <div class="transaction-name">${esc(t.merchant || t.note || 'Transaction')}${warningBadge}${duplicateBadge}</div>
      <div class="transaction-meta">${esc(t.category)} · ${esc(accountName(t.accountId))} · ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · <small>${typeLabel}</small></div>
    </div>
    <div class="amount ${typeClass}">${sign}${money(t.amount)}</div>
  </div>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
}

if (typeof window !== 'undefined') {
  window.editTransaction = function(id) {
    let tx = data.transactions.find(t => t.id === id);
    if (!tx) return;
    let form = $('#transactionForm');
    form.id.value = tx.id;
    form.transactionType.value = tx.transactionType;
    form.amount.value = tx.amount;
    form.note.value = tx.merchant || tx.note || '';
    form.account.value = tx.accountId;
    form.category.value = tx.category;
    form.date.value = tx.date;
    form.referenceNumber.value = tx.referenceNumber || '';
    $('#transactionFormTitle').textContent = 'Edit transaction';
    $('#transactionDialog').showModal();
  };
}

function render() {
  if (typeof document === 'undefined') return;

  let activeAccount = ($('#globalAccountFilter') && $('#globalAccountFilter').value) || 'all';
  let isCurrentFilter = t => isCurrent(t);

  let income = FinancialCalculationEngine.calculateMonthlyIncome(data.transactions, activeAccount, isCurrentFilter);
  let expenses = FinancialCalculationEngine.calculateMonthlyExpenses(data.transactions, activeAccount, isCurrentFilter);
  let saved = FinancialCalculationEngine.calculateMonthlySavings(income, expenses);

  let totalBalance = 0;
  if (activeAccount === 'all') {
    totalBalance = FinancialCalculationEngine.calculateConsolidatedBalance(data.accounts, data.transactions);
  } else {
    let acc = data.accounts.find(a => a.id === activeAccount);
    if (acc) totalBalance = FinancialCalculationEngine.calculateAccountBalance(acc, data.transactions);
  }

  if ($('#balance')) $('#balance').textContent = money(totalBalance);
  if ($('#income')) $('#income').textContent = money(income);
  if ($('#expenses')) $('#expenses').textContent = money(expenses);
  if ($('#saved')) $('#saved').textContent = money(saved);
  if ($('#savedCaption')) $('#savedCaption').textContent = income ? Math.round(saved / income * 100) + '% of income' : 'No income recorded';

  let totalInvested = 0, totalCurrent = 0;
  let savingsCalculated = data.savings.map(s => {
    let calc = calculateSaving(s);
    totalInvested += calc.invested;
    totalCurrent += calc.current;
    return { s, calc };
  });
  let totalEarnings = totalCurrent - totalInvested;
  if ($('#totalSavings')) $('#totalSavings').textContent = money(totalCurrent);
  if ($('#savingsInvested')) $('#savingsInvested').textContent = money(totalInvested);
  if ($('#savingsCurrent')) $('#savingsCurrent').textContent = money(totalCurrent);
  if ($('#savingsEarnings')) $('#savingsEarnings').textContent = (totalEarnings >= 0 ? '+' : '') + money(totalEarnings);

  // Category spending chart
  let periodTxs = filtered().filter(t => {
    if (t.status === 'duplicate') return false;
    return activeAccount === 'all' || t.accountId === activeAccount;
  });
  let spends = {};
  periodTxs.filter(x => ['debit', 'card_payment', 'fee'].includes(x.transactionType) && !x.isTransfer).forEach(x => {
    spends[x.category] = (spends[x.category] || 0) + x.amount;
  });
  let max = Math.max(...Object.values(spends), 1);
  if ($('#categoryChart')) {
    $('#categoryChart').innerHTML = Object.keys(spends).length ? Object.entries(spends).sort((a, b) => b[1] - a[1]).map(([c, a]) => `<div class="category-row"><span>${esc(c)}</span><div class="track"><div class="fill" style="width:${a / max * 100}%"></div></div><strong>${money(a)}</strong></div>`).join('') : '<p class="muted">No expenses for this period.</p>';
  }

  // Budget progress
  let currentTxs = data.transactions.filter(t => {
    if (t.status === 'duplicate') return false;
    if (activeAccount !== 'all' && t.accountId !== activeAccount) return false;
    return isCurrentFilter(t);
  });
  const progress = b => {
    let used = currentTxs.filter(t => ['debit', 'card_payment', 'fee'].includes(t.transactionType) && t.category === b.category && !t.isTransfer).reduce((a, t) => a + t.amount, 0);
    return { used, pct: Math.min(100, used / b.limit * 100) };
  };
  if ($('#budgetPreview')) {
    $('#budgetPreview').innerHTML = data.budgets.slice(0, 3).map(b => {
      let p = progress(b);
      return `<div class="budget-row"><div class="budget-meta"><strong>${esc(b.category)}</strong><span>${money(p.used)} / ${money(b.limit)}</span></div><div class="track"><div class="fill ${p.used > b.limit ? 'warn' : ''}" style="width:${p.pct}%"></div></div></div>`;
    }).join('') || '<p class="muted">Add a budget to stay on track.</p>';
  }

  // Recent transactions list
  let activeTxs = data.transactions.filter(t => activeAccount === 'all' || t.accountId === activeAccount);
  if ($('#recentTransactions')) {
    $('#recentTransactions').innerHTML = activeTxs.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 5).map(txRow).join('');
  }

  // Transaction history filter
  if ($('#allTransactions')) {
    let type = $('#typeFilter') ? $('#typeFilter').value : 'all';
    let cat = $('#categoryFilter') ? $('#categoryFilter').value : 'all';
    $('#allTransactions').innerHTML = activeTxs.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).filter(t => {
      let matchesType = type === 'all' || (type === 'debit' && ['debit', 'transfer_out', 'cash_withdrawal', 'card_payment', 'fee'].includes(t.transactionType)) || (type === 'credit' && ['credit', 'transfer_in', 'refund', 'reversal', 'interest'].includes(t.transactionType));
      let matchesCat = cat === 'all' || t.category === cat;
      return matchesType && matchesCat;
    }).map(txRow).join('') || '<p class="muted">No transactions match those filters.</p>';
  }

  // Monthly budgets
  if ($('#budgetList')) {
    $('#budgetList').innerHTML = data.budgets.map(b => {
      let p = progress(b);
      return `<article class="budget-card"><div class="avatar">${icon(b.category)}</div><h3>${esc(b.category)}</h3><p>${money(p.used)} spent of ${money(b.limit)}</p><div class="track"><div class="fill ${p.used > b.limit ? 'warn' : ''}" style="width:${p.pct}%"></div></div><p>${Math.max(0, b.limit - p.used) > 0 ? money(b.limit - p.used) + ' left' : money(p.used - b.limit) + ' over budget'}</p></article>`;
    }).join('') || '<p class="muted">No budgets yet.</p>';
  }

  // Recurring payments
  if ($('#recurringList')) {
    $('#recurringList').innerHTML = data.recurring.map(r => `<article class="recurring-item"><div class="recurring-left"><div class="avatar">↻</div><div><strong>${esc(r.name)}</strong><div class="transaction-meta">Every month on day ${r.day}</div></div></div><div class="amount ${r.type}">${r.type === 'credit' ? '+' : '−'}${money(r.amount)}</div></article>`).join('') || '<p class="muted">No recurring payments yet.</p>';
  }

  // Bank accounts
  if ($('#accountList')) {
    $('#accountList').innerHTML = data.accounts.map(a => {
      let balance = FinancialCalculationEngine.calculateAccountBalance(a, data.transactions);
      let txs = data.transactions.filter(t => t.accountId === a.id && t.status !== 'duplicate');
      let inflow = txs.filter(t => ['credit', 'transfer_in', 'refund', 'reversal', 'interest'].includes(t.transactionType)).reduce((n, t) => n + t.amount, 0);
      let outflow = txs.filter(t => ['debit', 'transfer_out', 'cash_withdrawal', 'card_payment', 'fee'].includes(t.transactionType)).reduce((n, t) => n + t.amount, 0);
      return `<article class="budget-card">
        <div class="panel-head" style="margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="avatar">▣</div>
            <div>
              <h3 style="margin:0; font-size:16px;">${esc(a.bankName)}</h3>
              <small class="muted">${esc(a.accountName)} · ${esc(a.accountType)}</small>
            </div>
          </div>
        </div>
        <p>Account ending ${esc(a.maskedAccountNumber)}</p>
        <div class="budget-meta"><span>Current Balance</span><strong class="amount credit">${money(balance)}</strong></div>
        <div class="budget-meta"><span>Incoming (total)</span><strong>${money(inflow)}</strong></div>
        <div class="budget-meta"><span>Outgoing (total)</span><strong>${money(outflow)}</strong></div>
      </article>`;
    }).join('');
  }

  // Savings List
  const getSavingIcon = t => t === 'fd' ? '🏦' : t === 'rd' ? '🗓' : t === 'sip' ? '📈' : t === 'ppf' ? '🛡' : '🐖';
  const getSavingTypeText = t => t === 'fd' ? 'Fixed Deposit (FD)' : t === 'rd' ? 'Recurring Deposit (RD)' : t === 'sip' ? 'Mutual Fund (SIP)' : t === 'ppf' ? 'PPF' : 'Other';
  if ($('#savingsList')) {
    $('#savingsList').innerHTML = savingsCalculated.map(({ s, calc }) => {
      return `<article class="budget-card">
        <div class="panel-head" style="margin-bottom: 12px; align-items: flex-start;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="avatar">${getSavingIcon(s.type)}</div>
            <div>
              <h3 style="margin:0; font-size:16px; letter-spacing:-0.01em;">${esc(s.name)}</h3>
              <small class="muted" style="margin:0;">${getSavingTypeText(s.type)} · ${s.rate}% p.a.</small>
            </div>
          </div>
          <button class="close delete-saving" data-id="${s.id}" style="font-size: 18px; line-height: 1; padding: 0;">×</button>
        </div>
        <div class="budget-meta">
          <span>Total Invested</span>
          <strong>${money(calc.invested)}</strong>
        </div>
        <div class="budget-meta">
          <span>Current Value</span>
          <strong class="amount credit">${money(calc.current)}</strong>
        </div>
        <div class="track" style="margin: 10px 0 6px; height: 6px;">
          <div class="fill" style="width: ${calc.progress}%"></div>
        </div>
        <div class="budget-meta" style="font-size: 11px; margin: 0; color: var(--muted);">
          <span>Maturity: ${calc.maturityDate}</span>
          <strong>${money(calc.maturity)}</strong>
        </div>
      </article>`;
    }).join('') || '<p class="muted">Add an investment to grow your savings.</p>';

    document.querySelectorAll('.delete-saving').forEach(b => {
      b.onclick = () => {
        if (confirm('Delete this investment?')) {
          let sid = parseFloat(b.dataset.id);
          data.savings = data.savings.filter(x => x.id !== sid);
          save();
        }
      };
    });
  }

  // Render Audit Tab details
  let duplicates = data.transactions.filter(t => t.status === 'duplicate').length;
  let smsScanned = data.transactions.filter(t => t.source === 'SMS').length;
  let transfers = data.transactions.filter(t => t.isTransfer && t.transactionType === 'transfer_out').length;
  let needsReview = data.transactions.filter(t => t.status === 'needs_review').length;

  let totalCredits = data.transactions.filter(t => t.status !== 'duplicate' && ['credit', 'transfer_in', 'refund', 'reversal', 'interest'].includes(t.transactionType)).reduce((s, t) => s + t.amount, 0);
  let totalDebits = data.transactions.filter(t => t.status !== 'duplicate' && ['debit', 'transfer_out', 'cash_withdrawal', 'card_payment', 'fee'].includes(t.transactionType)).reduce((s, t) => s + t.amount, 0);
  let internalTransfers = data.transactions.filter(t => t.status !== 'duplicate' && t.isTransfer && t.transactionType === 'transfer_out').reduce((s, t) => s + t.amount, 0);
  let genuineIncome = FinancialCalculationEngine.calculateMonthlyIncome(data.transactions, 'all', null);
  let genuineExpenses = FinancialCalculationEngine.calculateMonthlyExpenses(data.transactions, 'all', null);
  let netSavings = genuineIncome - genuineExpenses;

  if ($('#auditSmsScanned')) $('#auditSmsScanned').textContent = smsScanned + duplicates;
  if ($('#auditTxCreated')) $('#auditTxCreated').textContent = data.transactions.filter(t => t.status !== 'duplicate').length;
  if ($('#auditDuplicates')) $('#auditDuplicates').textContent = duplicates;
  if ($('#auditTransfers')) $('#auditTransfers').textContent = transfers;
  if ($('#auditNeedsReview')) $('#auditNeedsReview').textContent = needsReview;
  if ($('#auditTotalCredits')) $('#auditTotalCredits').textContent = money(totalCredits);
  if ($('#auditTotalDebits')) $('#auditTotalDebits').textContent = money(totalDebits);
  if ($('#auditInternalTransfers')) $('#auditInternalTransfers').textContent = money(internalTransfers);
  if ($('#auditGenuineIncome')) $('#auditGenuineIncome').textContent = money(genuineIncome);
  if ($('#auditGenuineExpenses')) $('#auditGenuineExpenses').textContent = money(genuineExpenses);
  if ($('#auditNetSavings')) $('#auditNetSavings').textContent = money(netSavings);

  // Validation alerts
  if ($('#validationAlerts')) {
    let alerts = FinancialCalculationEngine.validateLedger(data.accounts, data.transactions);
    let fingerprints = {};
    data.transactions.forEach(t => {
      if (t.status === 'duplicate') return;
      let fp = t.transactionFingerprint;
      if (fp) {
        if (fingerprints[fp]) alerts.push(`Suspicious duplicate transactions with fingerprint: ${fp}`);
        fingerprints[fp] = true;
      }
    });
    $('#validationAlerts').innerHTML = alerts.length ? alerts.map(a => `<p style="color: var(--coral); margin: 4px 0; font-size: 13px;">⚠ ${esc(a)}</p>`).join('') : '<p class="muted">No validation alerts. Ledger is fully reconciled.</p>';
  }
}

function fillSelect(id) {
  if (typeof document !== 'undefined' && $(id)) {
    $(id).innerHTML = categories.map(c => `<option>${c}</option>`).join('');
  }
}

function fillAccounts() {
  if (typeof document !== 'undefined' && $('#transactionAccount')) {
    $('#transactionAccount').innerHTML = data.accounts.map(a => `<option value="${a.id}">${esc(a.bankName)} · ${esc(a.maskedAccountNumber)}</option>`).join('');
  }
}

function fillGlobalAccountFilter() {
  if (typeof document !== 'undefined' && $('#globalAccountFilter')) {
    let val = $('#globalAccountFilter').value || 'all';
    $('#globalAccountFilter').innerHTML = '<option value="all">All Accounts</option>' +
      data.accounts.map(a => `<option value="${a.id}">${esc(a.bankName)} · ${esc(a.maskedAccountNumber)}</option>`).join('');
    $('#globalAccountFilter').value = val;
  }
}

function findAccount(bank, last4) {
  let id = `${bank}-${last4}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!data.accounts.some(a => a.id === id)) {
    data.accounts.push({
      id,
      bankName: bank,
      accountName: bank + ' Account',
      maskedAccountNumber: last4,
      accountType: 'SAVINGS',
      openingBalance: 0,
      openingBalanceDate: localDate(today),
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    fillAccounts();
    fillGlobalAccountFilter();
  }
  return id;
}

function toast(s) {
  if (typeof document !== 'undefined' && $('#toast')) {
    $('#toast').textContent = s;
    $('#toast').classList.add('show');
    setTimeout(() => $('#toast').classList.remove('show'), 3000);
  }
}

// UI Initialization and Listeners
if (typeof document !== 'undefined') {
  fillSelect('#transactionCategory');
  fillSelect('#budgetCategory');
  fillAccounts();
  fillGlobalAccountFilter();

  if ($('#categoryFilter')) {
    $('#categoryFilter').innerHTML = '<option value="all">All categories</option>' + categories.map(c => `<option>${c}</option>`).join('');
  }

  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    let v = b.dataset.view;
    document.querySelectorAll('.view').forEach(x => x.classList.toggle('active', x.id === v));
    document.querySelectorAll('.nav-link').forEach(x => x.classList.toggle('active', x.dataset.view === v));
    if ($('#pageTitle')) $('#pageTitle').textContent = v === 'dashboard' ? 'Good evening' : v[0].toUpperCase() + v.slice(1);
  }));

  if ($('#globalAccountFilter')) $('#globalAccountFilter').addEventListener('change', render);

  if ($('#addButton')) {
    $('#addButton').onclick = () => {
      let form = $('#transactionForm');
      form.reset();
      form.id.value = '';
      $('#transactionFormTitle').textContent = 'Add transaction';
      form.date.value = localDate(today);
      $('#transactionDialog').showModal();
    };
  }
  if ($('#smsButton')) $('#smsButton').onclick = () => $('#smsDialog').showModal();
  if ($('#budgetButton')) $('#budgetButton').onclick = () => $('#budgetDialog').showModal();
  if ($('#recurringButton')) $('#recurringButton').onclick = () => $('#recurringDialog').showModal();
  if ($('#accountButton')) {
    $('#accountButton').onclick = () => {
      let form = $('#accountForm');
      form.reset();
      form.openingBalanceDate.value = localDate(today);
      $('#accountDialog').showModal();
    };
  }
  if ($('#savingsButton')) {
    $('#savingsButton').onclick = () => {
      $('#savingsForm').date.value = localDate(today);
      $('#savingsDialog').showModal();
    };
  }
  if ($('#savingType')) {
    $('#savingType').onchange = e => {
      let t = e.target.value;
      if ($('#savingAmountLabel') && $('#savingAmountLabel').firstChild) {
        $('#savingAmountLabel').firstChild.textContent = (t === 'rd' || t === 'sip') ? 'Monthly deposit (₹) ' : 'Principal amount (₹) ';
      }
    };
  }
  if ($('#historyButton')) {
    $('#historyButton').onclick = () => {
      if (window.AndroidLedger && window.AndroidLedger.scanHistory) {
        window.AndroidLedger.scanHistory();
        toast('Scanning banking SMS history…');
      } else {
        toast('SMS history scanning is available in the Android app only');
      }
    };
  }
  if ($('#resetButton')) {
    $('#resetButton').onclick = () => {
      if (confirm('Are you sure you want to reset all data?')) {
        localStorage.removeItem('pocket-ledger-v1');
        location.reload();
      }
    };
  }

  if ($('#transactionForm')) {
    $('#transactionForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target);
      let id = f.get('id');
      let txData = {
        transactionType: f.get('transactionType'),
        amount: parseFloat(f.get('amount')),
        note: f.get('note'),
        merchant: f.get('note'),
        accountId: f.get('account'),
        account: f.get('account'),
        category: f.get('category'),
        date: f.get('date'),
        referenceNumber: f.get('referenceNumber') || null,
        source: 'MANUAL',
        status: 'confirmed',
        updatedAt: Date.now()
      };
      if (id) {
        let tx = data.transactions.find(t => t.id === parseFloat(id));
        if (tx) {
          Object.assign(tx, txData);
          toast('Transaction updated');
        }
      } else {
        txData.id = Date.now() + Math.random();
        txData.transactionDateTime = Date.now();
        txData.createdAt = Date.now();
        data.transactions.push(txData);
        toast('Transaction saved');
      }
      e.target.closest('dialog').close();
      e.target.reset();
      recalculateAllAccounts();
      save();
    });
  }

  if ($('#smsForm')) {
    $('#smsForm').addEventListener('submit', e => {
      e.preventDefault();
      let t = processTransactionPipeline(new FormData(e.target).get('sms'));
      if (!t) {
        toast('Could not find an amount in that SMS');
        return;
      }
      data.transactions.push(t);
      e.target.closest('dialog').close();
      e.target.reset();
      recalculateAllAccounts();
      save();
      toast('SMS transaction added: ' + money(t.amount));
    });
  }

  if ($('#budgetForm')) {
    $('#budgetForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target), x = { category: f.get('category'), limit: +f.get('limit') };
      data.budgets = data.budgets.filter(b => b.category !== x.category);
      data.budgets.push(x);
      e.target.closest('dialog').close();
      save();
      toast('Budget saved');
    });
  }

  if ($('#recurringForm')) {
    $('#recurringForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target);
      data.recurring.push({ name: f.get('name'), type: f.get('type'), amount: +f.get('amount'), day: +f.get('day') });
      e.target.closest('dialog').close();
      e.target.reset();
      save();
      toast('Recurring payment saved');
    });
  }

  if ($('#accountForm')) {
    $('#accountForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target);
      let bank = f.get('bank'), name = f.get('name'), last4 = f.get('last4'), type = f.get('type');
      let openingBalance = parseFloat(f.get('openingBalance') || 0);
      let openingBalanceDate = f.get('openingBalanceDate');
      let id = `${bank}-${last4}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      if (!data.accounts.some(a => a.id === id)) {
        data.accounts.push({
          id, bankName: bank, accountName: name, maskedAccountNumber: last4,
          accountType: type, openingBalance, openingBalanceDate,
          isActive: true, createdAt: Date.now(), updatedAt: Date.now()
        });
      } else {
        let acc = data.accounts.find(a => a.id === id);
        acc.accountName = name;
        acc.accountType = type;
        acc.openingBalance = openingBalance;
        acc.openingBalanceDate = openingBalanceDate;
        acc.updatedAt = Date.now();
      }
      e.target.closest('dialog').close();
      e.target.reset();
      fillAccounts();
      fillGlobalAccountFilter();
      recalculateAllAccounts();
      save();
      toast('Account saved');
    });
  }

  if ($('#savingsForm')) {
    $('#savingsForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target);
      data.savings.push({ id: Date.now(), type: f.get('type'), name: f.get('name'), amount: +f.get('amount'), rate: +f.get('rate'), tenure: +f.get('tenure'), date: f.get('date') });
      e.target.closest('dialog').close();
      e.target.reset();
      save();
      toast('Investment saved');
    });
  }

  ['#monthPicker', '#typeFilter', '#categoryFilter'].forEach(s => {
    if ($(s)) $(s).addEventListener('change', render);
  });
}

function importSMSHistory(messages) {
  let added = 0;
  messages.forEach(m => {
    let t = processTransactionPipeline(m);
    if (t && !data.transactions.some(x => x.transactionFingerprint === t.transactionFingerprint || (t.referenceNumber && x.referenceNumber === t.referenceNumber))) {
      data.transactions.push(t);
      added++;
    }
  });
  recalculateAllAccounts();
  save();
  toast(`${added} banking transactions imported`);
}

if (typeof window !== 'undefined') {
  window.importSMSHistory = importSMSHistory;
  window.addEventListener('smsTransaction', e => {
    let t = processTransactionPipeline(e.detail);
    if (t) {
      data.transactions.push(t);
      recalculateAllAccounts();
      save();
      toast('New SMS transaction added');
    }
  });

  if (window.LedgerCloud && LedgerCloud.enabled()) {
    if ($('#syncText')) $('#syncText').textContent = 'Connecting to Google Sheets…';
    LedgerCloud.load().then(r => {
      if (r && r.ok && r.data && r.data.transactions && r.data.transactions.length) {
        data = r.data;
        data.accounts = data.accounts || [];
        localStorage.setItem('pocket-ledger-v1', JSON.stringify(data));
        fillAccounts();
        fillGlobalAccountFilter();
        recalculateAllAccounts();
        if ($('#syncText')) $('#syncText').textContent = 'Synced with Google Sheets';
      } else {
        if ($('#syncText')) $('#syncText').textContent = 'Google Sheets backup enabled';
        LedgerCloud.push(data);
      }
    }).catch(() => {
      if ($('#syncText')) $('#syncText').textContent = 'Sheet backup needs attention';
    });
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  recalculateAllAccounts();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FinancialCalculationEngine,
    SmsParser,
    processTransactionPipeline,
    recalculateAllAccounts,
    calculateSaving,
    data,
    seed
  };
}
