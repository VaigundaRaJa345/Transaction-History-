// Pocket Ledger Core Financial AI Engine & Architecture
// Version: 2.0.0 (Financial SMS AI Agent Edition)

const categories = ['Food & dining', 'Transport', 'Shopping', 'Bills & utilities', 'Health', 'Entertainment', 'Salary', 'Transfer', 'Refund', 'Other'];
const seed = [];

const $ = s => (typeof document !== 'undefined' ? document.querySelector(s) : null);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const today = new Date();
const localDate = d => {
  let o = d instanceof Date ? d : new Date(d);
  if (isNaN(o.getTime())) o = new Date();
  return new Date(o.getTime() - o.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

let data = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pocket-ledger-v1') || 'null')) || {
  transactions: [],
  savingsProducts: [],
  serviceMessages: [],
  budgets: [],
  recurring: [],
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
  savings: [],
  smsRecords: {}
};

// Defensive Schema Normalization
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

data.transactions = (data.transactions || []).filter(t => {
  if (t.source === 'SEED' || [1, 2, 3, 4, 5].includes(t.id)) return false;
  if (['Swiggy', 'Monthly salary', 'Electricity bill', 'Uber', 'Netflix'].includes(t.note) && t.accountId === 'cash' && t.date === '2026-08-29') return false;
  return true;
}).map(t => {
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
    classification: t.classification || 'TRANSACTION',
    agentVersion: t.agentVersion || '2.0.0',
    createdAt: t.createdAt || Date.now(),
    updatedAt: t.updatedAt || Date.now()
  };
});

data.savingsProducts = Array.isArray(data.savingsProducts) ? data.savingsProducts : [];
data.serviceMessages = Array.isArray(data.serviceMessages) ? data.serviceMessages : [];
data.budgets = Array.isArray(data.budgets) ? data.budgets : [];
data.recurring = Array.isArray(data.recurring) ? data.recurring : [];
data.savings = Array.isArray(data.savings) ? data.savings : [];
data.smsRecords = (typeof data.smsRecords === 'object' && data.smsRecords !== null) ? data.smsRecords : {};

// =========================================================================
// 1. FINANCIAL CALCULATION ENGINE (SINGLE SOURCE OF TRUTH)
// =========================================================================
const FinancialCalculationEngine = {
  calculateAccountBalance(account, transactions) {
    if (!account) return 0;
    let opening = parseFloat(account.openingBalance || 0);
    let txs = (transactions || []).filter(t => t.accountId === account.id && t.status !== 'duplicate');
    let balance = opening;
    for (let t of txs) {
      let amt = parseFloat(t.amount || 0);
      switch (t.transactionType) {
        case 'credit':
        case 'transfer_in':
        case 'refund':
        case 'reversal':
        case 'interest':
        case 'adjustment':
          balance += amt;
          break;
        case 'debit':
        case 'transfer_out':
        case 'cash_withdrawal':
        case 'card_payment':
        case 'fee':
          balance -= amt;
          break;
      }
    }
    return balance;
  },

  calculateConsolidatedBalance(accounts, transactions) {
    return (accounts || []).reduce((total, acc) => total + this.calculateAccountBalance(acc, transactions), 0);
  },

  calculateMonthlyIncome(transactions, accountIdFilter, dateRangeFilter) {
    let incomeTxs = (transactions || []).filter(t => {
      if (t.status === 'duplicate' || t.status === 'needs_review') return false;
      if (accountIdFilter && accountIdFilter !== 'all' && t.accountId !== accountIdFilter) return false;
      if (dateRangeFilter && !dateRangeFilter(t)) return false;
      return t.transactionType === 'credit' && !t.isTransfer && t.category !== 'Transfer' && t.category !== 'Refund';
    });
    return incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  },

  calculateMonthlyExpenses(transactions, accountIdFilter, dateRangeFilter) {
    let expTxs = (transactions || []).filter(t => {
      if (t.status === 'duplicate' || t.status === 'needs_review') return false;
      if (accountIdFilter && accountIdFilter !== 'all' && t.accountId !== accountIdFilter) return false;
      if (dateRangeFilter && !dateRangeFilter(t)) return false;
      if (t.isTransfer || t.category === 'Transfer') return false;
      return ['debit', 'card_payment', 'fee'].includes(t.transactionType);
    });
    let refundTxs = (transactions || []).filter(t => {
      if (t.status === 'duplicate' || t.status === 'needs_review') return false;
      if (accountIdFilter && accountIdFilter !== 'all' && t.accountId !== accountIdFilter) return false;
      if (dateRangeFilter && !dateRangeFilter(t)) return false;
      return t.transactionType === 'refund';
    });
    let totalExp = expTxs.reduce((sum, t) => sum + t.amount, 0);
    let totalRefunds = refundTxs.reduce((sum, t) => sum + t.amount, 0);
    return Math.max(0, totalExp - totalRefunds);
  },

  calculateMonthlySavings(income, expenses) {
    return Math.max(0, (income || 0) - (expenses || 0));
  },

  calculateSavingsPortfolio(savingsProducts, manualSavings) {
    let activeProducts = (savingsProducts || []).filter(p => p.status === 'ACTIVE');
    let fdTotal = activeProducts.filter(p => p.productType === 'FD').reduce((s, p) => s + (parseFloat(p.currentValue || p.principalAmount) || 0), 0);
    let rdTotal = activeProducts.filter(p => p.productType === 'RD').reduce((s, p) => s + (parseFloat(p.totalContributed || p.currentValue || p.installmentAmount) || 0), 0);

    let manualTotal = (manualSavings || []).reduce((s, item) => {
      let calc = calculateSaving(item);
      return s + (calc.current || calc.invested || 0);
    }, 0);

    let total = fdTotal + rdTotal + manualTotal;
    return {
      total,
      fdTotal,
      rdTotal,
      manualTotal,
      activeFdCount: activeProducts.filter(p => p.productType === 'FD').length,
      activeRdCount: activeProducts.filter(p => p.productType === 'RD').length,
      totalActiveCount: activeProducts.length + (manualSavings || []).length
    };
  },

  validateLedger(accounts, transactions) {
    let alerts = [];
    let accIds = new Set((accounts || []).map(a => a.id));
    for (let t of (transactions || [])) {
      if (t.status === 'duplicate') continue;
      if (!accIds.has(t.accountId)) {
        alerts.push('Transaction #' + t.id + ' (' + (t.merchant || t.note) + ') references missing account \'' + t.accountId + '\'');
      }
      if (t.amount <= 0) {
        alerts.push('Transaction #' + t.id + ' has invalid non-positive amount: ₹' + t.amount);
      }
      if (t.isTransfer && t.transferGroupId) {
        let pair = (transactions || []).filter(x => x.transferGroupId === t.transferGroupId && x.status !== 'duplicate');
        if (pair.length !== 2) {
          alerts.push('Transfer group \'' + t.transferGroupId + '\' has ' + pair.length + ' matched transaction(s) instead of exactly 2.');
        }
      }
    }
    for (let a of (accounts || [])) {
      let bal = this.calculateAccountBalance(a, transactions);
      if (bal < 0) {
        alerts.push('Account \'' + a.bankName + ' (' + a.maskedAccountNumber + ')\' balance is negative: ₹' + bal);
      }
    }
    return alerts;
  }
};
// =========================================================================
// 2. FINANCIAL SMS AI AGENT (HIERARCHICAL INTELLIGENCE ENGINE)
// =========================================================================
const FinancialSmsAgent = {
  VERSION: '2.0.0',

  normalizeText(text) {
    return (text || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  generateSmsHash(sender, body, time) {
    let raw = (sender || '') + '_' + (body || '') + '_' + (time || '');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return 'sms_' + Math.abs(hash).toString(36);
  },

  identifyBank(text, sender) {
    let str = (sender + ' ' + text).toUpperCase();
    if (/SBI|STATE BANK/i.test(str)) return 'SBI';
    if (/HDFC/i.test(str)) return 'HDFC Bank';
    if (/ICICI/i.test(str)) return 'ICICI Bank';
    if (/AXIS/i.test(str)) return 'Axis Bank';
    if (/KOTAK/i.test(str)) return 'Kotak Bank';
    if (/PNB|PUNJAB NATIONAL/i.test(str)) return 'PNB';
    if (/CANARA/i.test(str)) return 'Canara Bank';
    if (/BOB|BARODA/i.test(str)) return 'Bank of Baroda';
    if (/UNION/i.test(str)) return 'Union Bank';
    if (/INDUSIND/i.test(str)) return 'IndusInd Bank';
    if (/IDFC/i.test(str)) return 'IDFC FIRST';
    if (/FEDERAL/i.test(str)) return 'Federal Bank';
    if (/YES BANK|YESBK/i.test(str)) return 'Yes Bank';
    if (/PAYTM/i.test(str)) return 'Paytm Bank';
    if (/AIRTEL/i.test(str)) return 'Airtel Money';
    return 'Bank';
  },

  extractLast4(text) {
    let m = text.match(/(?:a\/c|acct|ac|account|card|ending|xx|x{2,})[^\d]*(\d{3,4})\b/i);
    return m ? m[1] : '—';
  },

  extractAmount(text) {
    let m = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (m) {
      let val = parseFloat(m[1].replace(/,/g, ''));
      return isNaN(val) ? 0 : val;
    }
    let m2 = text.match(/(?:for|amount of)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (m2) {
      let val = parseFloat(m2[1].replace(/,/g, ''));
      return isNaN(val) ? 0 : val;
    }
    return 0;
  },

  extractReference(text) {
    let m = text.match(/(?:upi\s*ref(?:erence)?(?:\s*no\.?)?|rrn|utr|ref(?:\s*no\.?)?|txn(?:\s*id)?|fd\s*no\.?|rd\s*no\.?)[:\s]+([a-zA-Z0-9]+)/i);
    if (m && m[1].length >= 4) return m[1];
    let numMatch = text.match(/\b\d{12}\b/);
    if (numMatch) return numMatch[0];
    return null;
  },

  extractInterestRate(text) {
    let m = text.match(/(?:at|@|interest\s*rate\s*of)\s*(\d+(?:\.\d{1,2})?)\s*%/i);
    if (m) return parseFloat(m[1]);
    let m2 = text.match(/(\d+(?:\.\d{1,2})?)\s*%\s*(?:p\.?a\.?|per annum)?/i);
    return m2 ? parseFloat(m2[1]) : 7.0;
  },

  extractTenure(text) {
    let m = text.match(/(?:for|tenure(?:\s*of)?)\s*(\d+)\s*(days|months|years|yrs|mths|d)/i);
    if (m) {
      let val = parseInt(m[1]);
      let unit = m[2].toLowerCase();
      if (unit.startsWith('y')) return val * 12;
      if (unit.startsWith('d')) return Math.max(1, Math.round(val / 30));
      return val;
    }
    return 12;
  },

  extractMaturityDate(text, openingDateStr, tenureMonths) {
    let dateMatch = text.match(/(?:matur(?:es|ing|ity)(?:\s*on|\s*date)?)[:\s]*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/i);
    if (dateMatch) {
      let d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) return localDate(d);
    }
    let base = openingDateStr ? new Date(openingDateStr + 'T12:00:00') : new Date();
    let mat = new Date(base.getTime());
    mat.setMonth(mat.getMonth() + (tenureMonths || 12));
    return localDate(mat);
  },

  extractMerchant(text) {
    let t = text;
    let patterns = [
      /(?:at|to|info)\s+([A-Za-z0-9\s\.\*\-\_]{3,30}?)(?:\s+on|\s+ref|\s+upi|\s+avl|\s+bal|\.|$)/i,
      /(?:vpa|merchant)\s+([A-Za-z0-9\s\.\*\-\_]{3,30}?)(?:\s+on|\s+ref|\.|$)/i,
      /paid to\s+([A-Za-z0-9\s\.\*\-\_]{3,30}?)(?:\s+on|\.|$)/i
    ];
    for (let p of patterns) {
      let m = t.match(p);
      if (m && m[1]) {
        let name = m[1].trim();
        if (!/^(the|a|an|your|account|bank|rs|inr)$/i.test(name)) return name;
      }
    }
    return 'Merchant / Transfer';
  },

  classify(smsText, sender) {
    let text = this.normalizeText(smsText);
    let s = text.toUpperCase();

    // LEVEL 1: SECURITY (OTP)
    if (/(?:OTP|ONE TIME PASSWORD|VERIFICATION CODE|SECRET CODE|AUTH CODE)\b/i.test(s) && !/(?:DEBITED|CREDITED|TRANSFERRED|SPENT)/i.test(s)) {
      return { level1: 'SECURITY', level2: 'OTP', level3: 'OTP', confidence: 98, isFinancial: false };
    }
    if (/\bIS\s+\d{4,8}\b/i.test(s) && /LOGIN|VERIFY|TRANSACTION OTP/i.test(s) && !/DEBITED|CREDITED/.test(s)) {
      return { level1: 'SECURITY', level2: 'OTP', level3: 'OTP', confidence: 95, isFinancial: false };
    }

    // LEVEL 1: PROMOTIONAL
    if (/(?:APPLY NOW|PRE-APPROVED|SPECIAL OFFER|CONGRATULATIONS|CASHBACK OFFER|DISCOUNT COUPON|FLAT \d+% OFF|LIMITED TIME OFFER)\b/i.test(s) && !/DEBITED|CREDITED|A\/C\s*XX/i.test(s)) {
      return { level1: 'PROMOTIONAL', level2: 'PROMOTION', level3: 'PROMOTION', confidence: 95, isFinancial: false };
    }

    // LEVEL 1: TELECOM RECHARGE ALERTS
    if (/(?:PREPAID RECHARGE|DATA PACK|DAILY LIMIT|PLAN EXPIR|VALIDITY EXPIR)/i.test(s) && !/(?:A\/C|ACCOUNT|SAVINGS|DEBITED FROM A\/C)/i.test(s)) {
      return { level1: 'NON_FINANCIAL', level2: 'TELECOM_ALERT', level3: 'TELECOM_ALERT', confidence: 95, isFinancial: false };
    }

    // LEVEL 2: SAVINGS PRODUCT (FD / RD)
    if (/(?:FIXED DEPOSIT|TERM DEPOSIT|\bFD\b)/i.test(s)) {
      if (/OPENED|CREATED|BOOKED|STARTED|GENERATED|SUCCESSFULLY CREATED/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'SAVINGS_PRODUCT', level3: 'FD_OPENED', confidence: 95, isFinancial: true };
      }
      if (/MATURED|MATURITY PROCEEDS|MATURES ON|CREDITED ON MATURITY/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'SAVINGS_PRODUCT', level3: 'FD_MATURED', confidence: 95, isFinancial: true };
      }
      if (/RENEWED|AUTO.?RENEW|ROLLOVER/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'SAVINGS_PRODUCT', level3: 'FD_RENEWED', confidence: 95, isFinancial: true };
      }
      if (/INTEREST/i.test(s) && /CREDITED|PAID/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'SAVINGS_PRODUCT', level3: 'FD_INTEREST', confidence: 92, isFinancial: true };
      }
    }

    if (/(?:RECURRING DEPOSIT|\bRD\b|RD INSTALLMENT|RD A\/C)/i.test(s)) {
      if (/INSTALLMENT|RECEIVED|PAID|DEBITED FOR RD/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'SAVINGS_PRODUCT', level3: 'RD_INSTALLMENT', confidence: 95, isFinancial: true };
      }
      if (/OPENED|CREATED|STARTED/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'SAVINGS_PRODUCT', level3: 'RD_OPENED', confidence: 95, isFinancial: true };
      }
      if (/MATURED|MATURITY/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'SAVINGS_PRODUCT', level3: 'RD_MATURED', confidence: 95, isFinancial: true };
      }
    }

    // LEVEL 2: LOAN / EMI
    if (/(?:LOAN|EMI|HOME LOAN|AUTO LOAN|PERSONAL LOAN)\b/i.test(s)) {
      if (/DEBITED|PAID|DEDUCTED|CLEARED/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'LOAN', level3: 'EMI_DEBITED', confidence: 92, isFinancial: true };
      }
      if (/DISBURSED|CREDITED/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'LOAN', level3: 'LOAN_DISBURSED', confidence: 90, isFinancial: true };
      }
      if (/DUE|OVERDUE|REMINDER|UPCOMING/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'LOAN', level3: 'LOAN_DUE', confidence: 90, isFinancial: false };
      }
    }

    // LEVEL 2: CREDIT CARDS
    if (/(?:CREDIT CARD|CARD ENDING|CREDIT CARD STATEMENT)/i.test(s)) {
      if (/SPENT|DEBITED|PURCHASE AT/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'CREDIT_CARD', level3: 'CARD_PURCHASE', confidence: 92, isFinancial: true };
      }
      if (/PAYMENT RECEIVED|PAYMENT OF RS|TOWARDS YOUR CREDIT CARD/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'CREDIT_CARD', level3: 'CARD_PAYMENT', confidence: 92, isFinancial: true };
      }
      if (/STATEMENT GENERATED|TOTAL AMOUNT DUE|MINIMUM DUE/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'CREDIT_CARD', level3: 'CARD_STATEMENT', confidence: 90, isFinancial: false };
      }
    }

    // LEVEL 2: REFUNDS & REVERSALS
    if (/REFUND|REFUNDED/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'REFUND', level3: 'REFUND', confidence: 95, isFinancial: true };
    }
    if (/REVERSAL|REVERSED|FAILED TRANSACTION REVERSED/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'REVERSAL', level3: 'REVERSAL', confidence: 95, isFinancial: true };
    }

    // LEVEL 2: ATM / CASH WITHDRAWAL
    if (/ATM|CASH WITHDRAWAL|WITHDRAWN AT ATM/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'TRANSACTION', level3: 'ATM_WITHDRAWAL', confidence: 95, isFinancial: true };
    }

    // LEVEL 2: BANK FEES & INTEREST
    if (/(?:ANNUAL CHARGES|MAINTENANCE CHARGES|SERVICE CHARGES|PENALTY|SMS CHARGES|FEE)/i.test(s) && /DEBITED/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'TRANSACTION', level3: 'FEE', confidence: 92, isFinancial: true };
    }
    if (/INTEREST CREDITED|SAVINGS INTEREST/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'INTEREST', level3: 'INTEREST', confidence: 95, isFinancial: true };
    }

    // LEVEL 2: SALARY
    if (/SALARY|SAL CREDITED|MONTHLY SALARY|STIPEND/i.test(s) && /CREDITED/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'TRANSACTION', level3: 'SALARY', confidence: 95, isFinancial: true };
    }

    // LEVEL 2: UPI / IMPS / NEFT / RTGS
    if (/UPI|IMPS|NEFT|RTGS/i.test(s)) {
      if (/DEBITED|SENT|PAID|TRANSFERRED/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'TRANSACTION', level3: 'UPI_DEBIT', confidence: 92, isFinancial: true };
      }
      if (/CREDITED|RECEIVED/i.test(s)) {
        return { level1: 'FINANCIAL', level2: 'TRANSACTION', level3: 'UPI_CREDIT', confidence: 92, isFinancial: true };
      }
    }

    // LEVEL 2: ACCOUNT SERVICE / BALANCE ALERTS / CHEQUES
    if (/CHEQUE/i.test(s)) {
      if (/CLEARED|PASSED/i.test(s)) return { level1: 'FINANCIAL', level2: 'CHEQUE', level3: 'CHEQUE_CLEARED', confidence: 90, isFinancial: true };
      if (/BOUNCED|RETURNED|DISHONOURED/i.test(s)) return { level1: 'FINANCIAL', level2: 'CHEQUE', level3: 'CHEQUE_BOUNCED', confidence: 90, isFinancial: false };
    }
    if (/AVAILABLE BAL|AVL BAL|CLEAR BAL|ACCOUNT BALANCE IS/i.test(s) && !/DEBITED|CREDITED|SPENT/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'ACCOUNT_SERVICE', level3: 'BALANCE_ALERT', confidence: 90, isFinancial: false };
    }

    // GENERIC DEBIT / CREDIT TRANSACTIONS
    if (/DEBITED|SPENT|PAID|WITHDRAWN/i.test(s) && /(?:RS\.?|INR|₹)/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'TRANSACTION', level3: 'DEBIT', confidence: 85, isFinancial: true };
    }
    if (/CREDITED|RECEIVED|DEPOSITED/i.test(s) && /(?:RS\.?|INR|₹)/i.test(s)) {
      return { level1: 'FINANCIAL', level2: 'TRANSACTION', level3: 'CREDIT', confidence: 85, isFinancial: true };
    }

    return { level1: 'UNKNOWN', level2: 'OTHER', level3: 'OTHER', confidence: 40, isFinancial: false };
  },

  process(sms, timeOverride) {
    let body = typeof sms === 'string' ? sms : (sms.body || '');
    let sender = typeof sms === 'object' ? (sms.sender || '') : '';
    let time = (typeof sms === 'object' && sms.time) ? sms.time : (timeOverride || Date.now());
    let dateStr = localDate(time);

    let classification = this.classify(body, sender);
    let smsHash = this.generateSmsHash(sender, body, time);

    if (data.smsRecords[smsHash]) {
      return { status: 'duplicate', classification, reason: 'Duplicate SMS hash' };
    }

    let bank = this.identifyBank(body, sender);
    let last4 = this.extractLast4(body);
    let amount = this.extractAmount(body);
    let ref = this.extractReference(body);
    let merchant = this.extractMerchant(body);

    let accountId = findOrCreateAccount(bank, last4);

    let result = {
      smsHash,
      classification,
      bank,
      last4,
      amount,
      referenceNumber: ref,
      date: dateStr,
      time
    };

    // ROUTING
    if (classification.level1 === 'SECURITY' || classification.level1 === 'PROMOTIONAL' || classification.level1 === 'NON_FINANCIAL') {
      data.smsRecords[smsHash] = { processedAt: Date.now(), classification: classification.level3, routedTo: 'IGNORED' };
      return { status: 'ignored', classification };
    }

    // ROUTE TO SAVINGS PRODUCT (FD / RD)
    if (classification.level2 === 'SAVINGS_PRODUCT') {
      let rate = this.extractInterestRate(body);
      let tenure = this.extractTenure(body);
      let maturityDate = this.extractMaturityDate(body, dateStr, tenure);
      let prodType = classification.level3.startsWith('RD') ? 'RD' : 'FD';
      let prodRef = ref || (prodType + '-' + last4 + '-' + Math.floor(amount));

      let existing = data.savingsProducts.find(p => p.referenceNumber === prodRef || (p.accountId === accountId && p.productType === prodType && Math.abs(p.principalAmount - amount) < 10 && p.status === 'ACTIVE'));

      if (classification.level3 === 'FD_OPENED') {
        let expectedMaturity = amount * Math.pow(1 + (rate / 400), (tenure / 3));
        let newProd = {
          id: Date.now() + Math.random(),
          accountId,
          bankName: bank,
          productType: 'FD',
          referenceNumber: prodRef,
          principalAmount: amount,
          currentValue: amount,
          interestRate: rate,
          tenureMonths: tenure,
          openingDate: dateStr,
          maturityDate,
          expectedMaturityAmount: Math.round(expectedMaturity),
          status: 'ACTIVE',
          confidenceScore: classification.confidence,
          sourceSms: body,
          createdAt: time,
          updatedAt: Date.now()
        };
        data.savingsProducts.push(newProd);

        let tx = {
          id: Date.now() + Math.random(),
          accountId,
          amount,
          transactionType: 'transfer_out',
          transactionDateTime: time,
          date: dateStr,
          description: 'Fixed Deposit Created (' + bank + ')',
          merchant: bank + ' FD',
          note: 'Fixed Deposit Opened: ' + prodRef,
          category: 'Transfer',
          referenceNumber: prodRef,
          confidenceScore: classification.confidence,
          isTransfer: true,
          transferGroupId: 'FD_' + prodRef,
          status: 'confirmed',
          source: 'SMS',
          classification: 'FD_OPENED',
          agentVersion: this.VERSION,
          createdAt: time,
          updatedAt: Date.now()
        };
        data.transactions.push(tx);
        result.savingsProduct = newProd;
        result.transaction = tx;
      } else if (classification.level3 === 'RD_INSTALLMENT') {
        if (existing) {
          existing.totalContributed = (existing.totalContributed || 0) + amount;
          existing.installmentsPaid = (existing.installmentsPaid || 0) + 1;
          existing.updatedAt = Date.now();
        } else {
          let newRd = {
            id: Date.now() + Math.random(),
            accountId,
            bankName: bank,
            productType: 'RD',
            referenceNumber: prodRef,
            installmentAmount: amount,
            totalContributed: amount,
            currentValue: amount,
            interestRate: rate,
            tenureMonths: tenure,
            openingDate: dateStr,
            maturityDate,
            installmentsPaid: 1,
            status: 'ACTIVE',
            confidenceScore: classification.confidence,
            sourceSms: body,
            createdAt: time,
            updatedAt: Date.now()
          };
          data.savingsProducts.push(newRd);
        }
        let tx = {
          id: Date.now() + Math.random(),
          accountId,
          amount,
          transactionType: 'transfer_out',
          transactionDateTime: time,
          date: dateStr,
          description: 'RD Installment (' + bank + ')',
          merchant: bank + ' RD',
          note: 'Recurring Deposit Installment: ' + prodRef,
          category: 'Transfer',
          referenceNumber: prodRef,
          confidenceScore: classification.confidence,
          isTransfer: true,
          transferGroupId: 'RD_' + prodRef,
          status: 'confirmed',
          source: 'SMS',
          classification: 'RD_INSTALLMENT',
          agentVersion: this.VERSION,
          createdAt: time,
          updatedAt: Date.now()
        };
        data.transactions.push(tx);
        result.transaction = tx;
      } else if (classification.level3 === 'FD_MATURED') {
        if (existing) {
          existing.status = 'MATURED';
          existing.updatedAt = Date.now();
        }
        let principalTx = {
          id: Date.now() + Math.random(),
          accountId,
          amount,
          transactionType: 'transfer_in',
          transactionDateTime: time,
          date: dateStr,
          description: 'FD Maturity Proceeds (' + bank + ')',
          merchant: bank + ' FD',
          note: 'FD Maturity Return of Principal: ' + prodRef,
          category: 'Transfer',
          referenceNumber: prodRef,
          confidenceScore: classification.confidence,
          isTransfer: true,
          transferGroupId: 'FD_MAT_' + prodRef,
          status: 'confirmed',
          source: 'SMS',
          classification: 'FD_MATURED',
          agentVersion: this.VERSION,
          createdAt: time,
          updatedAt: Date.now()
        };
        data.transactions.push(principalTx);
      }

      data.smsRecords[smsHash] = { processedAt: Date.now(), classification: classification.level3, routedTo: 'SAVINGS' };
      return result;
    }

    // ROUTE TO SERVICE MESSAGES / ALERTS
    if (classification.level2 === 'ACCOUNT_SERVICE' || classification.level2 === 'CHEQUE' || classification.level3 === 'CARD_STATEMENT' || classification.level3 === 'LOAN_DUE') {
      let alertItem = {
        id: Date.now() + Math.random(),
        sender,
        receivedAt: time,
        date: dateStr,
        category: classification.level2,
        subcategory: classification.level3,
        title: classification.level3.replace(/_/g, ' '),
        body,
        account: last4 !== '—' ? (bank + ' ••••' + last4) : bank,
        amount: amount > 0 ? amount : null
      };
      data.serviceMessages.push(alertItem);
      data.smsRecords[smsHash] = { processedAt: Date.now(), classification: classification.level3, routedTo: 'ALERTS' };
      result.serviceMessage = alertItem;
      return result;
    }

    // ROUTE TO LEDGER TRANSACTIONS
    if (classification.level1 === 'FINANCIAL' && amount > 0) {
      let txType = 'debit';
      let cat = 'Other';
      let isTransfer = false;

      switch (classification.level3) {
        case 'SALARY':
          txType = 'credit';
          cat = 'Salary';
          break;
        case 'UPI_CREDIT':
        case 'CREDIT':
          txType = 'credit';
          cat = 'Other';
          break;
        case 'REFUND':
          txType = 'refund';
          cat = 'Refund';
          break;
        case 'REVERSAL':
          txType = 'reversal';
          cat = 'Other';
          break;
        case 'INTEREST':
        case 'FD_INTEREST':
          txType = 'interest';
          cat = 'Other';
          break;
        case 'ATM_WITHDRAWAL':
          txType = 'cash_withdrawal';
          cat = 'Transfer';
          isTransfer = true;
          break;
        case 'CARD_PURCHASE':
          txType = 'card_payment';
          cat = 'Shopping';
          break;
        case 'CARD_PAYMENT':
          txType = 'transfer_out';
          cat = 'Transfer';
          isTransfer = true;
          break;
        case 'FEE':
          txType = 'fee';
          cat = 'Bills & utilities';
          break;
        case 'EMI_DEBITED':
          txType = 'debit';
          cat = 'Bills & utilities';
          break;
        default:
          txType = 'debit';
          cat = autoCategorize(merchant, body);
      }

      let fp = accountId + '-' + amount + '-' + txType + '-' + (ref || dateStr);
      let isDup = data.transactions.some(t => t.transactionFingerprint === fp && t.status !== 'duplicate');

      let tx = {
        id: Date.now() + Math.random(),
        accountId,
        amount,
        transactionType: txType,
        transactionDateTime: time,
        date: dateStr,
        description: merchant,
        merchant,
        note: body.slice(0, 120),
        category: cat,
        referenceNumber: ref,
        transactionFingerprint: fp,
        confidenceScore: classification.confidence,
        isTransfer,
        transferGroupId: null,
        status: isDup ? 'duplicate' : (classification.confidence >= 80 ? 'confirmed' : 'needs_review'),
        source: 'SMS',
        classification: classification.level3,
        agentVersion: this.VERSION,
        createdAt: time,
        updatedAt: Date.now()
      };

      data.transactions.push(tx);
      data.smsRecords[smsHash] = { processedAt: Date.now(), classification: classification.level3, routedTo: 'TRANSACTIONS', transactionId: tx.id };
      result.transaction = tx;
      return result;
    }

    data.smsRecords[smsHash] = { processedAt: Date.now(), classification: classification.level3, routedTo: 'UNKNOWN' };
    return result;
  }
};
function autoCategorize(merchant, body) {
  let s = (merchant + ' ' + body).toUpperCase();
  if (/SWIGGY|ZOMATO|DOMINO|PIZZA|MCDONALD|BURGER|KFC|RESTAURANT|CAFE|FOOD|STARBUCKS|DINE|BAKERY|TEA|COFFEE/i.test(s)) return 'Food & dining';
  if (/UBER|OLA|RAPIDO|METRO|IRCTC|RAILWAY|PETROL|FUEL|HPCL|IOCL|BPCL|SHELL|FASTAG|TOLL|FLIGHT|INDIGO|AIRINDIA/i.test(s)) return 'Transport';
  if (/AMAZON|FLIPKART|MYNTRA|AJIO|MEESHO|ZARA|H&M|SHOPPING|STORE|MART|RETAIL|CROMA|RELIANCE|DECATHLON/i.test(s)) return 'Shopping';
  if (/ELECTRICITY|BESCOM|TNEB|MSEDCL|WATER|GAS|AIRTEL|JIO|VI|BILL|BROADBAND|WIFI|RECHARGE|POSTPAID|DTH|TATA PLAY/i.test(s)) return 'Bills & utilities';
  if (/PHARMACY|APOLLO|1MG|NETMEDS|MEDPLUS|HOSPITAL|CLINIC|HEALTH|DOCTOR|LAB|DIAGNOSTICS/i.test(s)) return 'Health';
  if (/NETFLIX|PRIME|HOTSTAR|SPOTIFY|BOOKMYSHOW|PVR|INOX|MOVIE|CINEMA|YOUTUBE|GAME|STEAM/i.test(s)) return 'Entertainment';
  return 'Other';
}

function findOrCreateAccount(bank, last4) {
  let cleanLast4 = last4 && last4 !== '—' ? last4 : '0000';
  let id = (bank + '-' + cleanLast4).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!data.accounts.some(a => a.id === id)) {
    data.accounts.push({
      id,
      bankName: bank,
      accountName: bank + ' (' + (cleanLast4 !== '0000' ? '••••' + cleanLast4 : 'Account') + ')',
      maskedAccountNumber: cleanLast4 !== '0000' ? cleanLast4 : '—',
      accountType: 'SAVINGS',
      openingBalance: 0,
      openingBalanceDate: localDate(new Date()),
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  return id;
}

function accountName(id) {
  let a = data.accounts.find(x => x.id === id);
  return a ? (a.bankName + ' (' + a.maskedAccountNumber + ')') : 'Account';
}

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function icon(cat) {
  let icons = {
    'Food & dining': '🍴',
    'Transport': '🚗',
    'Shopping': '🛍',
    'Bills & utilities': '⚡',
    'Health': '💊',
    'Entertainment': '🎬',
    'Salary': '💼',
    'Transfer': '🔄',
    'Refund': '↩',
    'Other': '🏷'
  };
  return icons[cat] || '🏷';
}

function isCurrent(t) {
  if (!t || !t.date) return false;
  let d = new Date(t.date + 'T12:00:00');
  if (isNaN(d.getTime())) return false;
  return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function calculateSaving(s) {
  if (!s) return { invested: 0, current: 0, maturity: 0, maturityDate: '—', progress: 0 };
  let principal = parseFloat(s.amount) || 0, r = (parseFloat(s.rate) || 0) / 100, tenure = parseInt(s.tenure) || 12;
  let start = s.date ? new Date(s.date + 'T00:00:00') : new Date();
  if (isNaN(start.getTime())) start = new Date();
  let maturityTime = new Date(start.getTime());
  maturityTime.setMonth(maturityTime.getMonth() + tenure);

  let now = new Date();
  let totalMs = Math.max(1, maturityTime.getTime() - start.getTime());
  let elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()));
  let progress = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

  let maturity = principal;
  let current = principal;
  let invested = principal;

  if (s.type === 'fd') {
    let quarters = tenure / 3;
    maturity = principal * Math.pow(1 + (r / 4), quarters);
    let elapsedQuarters = (elapsedMs / (1000 * 60 * 60 * 24 * 365.25)) * 4;
    current = principal * Math.pow(1 + (r / 4), elapsedQuarters);
  } else if (s.type === 'rd') {
    let monthsElapsed = Math.min(tenure, Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 30.44)));
    invested = principal * tenure;
    current = principal * monthsElapsed * (1 + (r * (monthsElapsed / 24)));
    maturity = principal * tenure + (principal * tenure * (tenure + 1) / 24 * r);
  } else {
    maturity = principal * Math.pow(1 + r, tenure / 12);
    current = principal * Math.pow(1 + r, elapsedMs / (1000 * 60 * 60 * 24 * 365.25));
  }

  return {
    invested: Math.round(invested),
    current: Math.round(current),
    maturity: Math.round(maturity),
    maturityDate: maturityTime.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    progress
  };
}

function save() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pocket-ledger-v1', JSON.stringify(data));
  }
  recalculateAllAccounts();
  if (typeof window !== 'undefined' && window.LedgerCloud && LedgerCloud.enabled()) {
    LedgerCloud.push(data);
  }
}

function toast(msg) {
  if (typeof document === 'undefined') return;
  let t = $('#toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
  }
}

function txRow(t) {
  if (!t) return '';
  let dateStr = t.date || localDate(today);
  let d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) d = today;
  let txType = t.transactionType || t.type || 'debit';
  let typeClass = (['credit', 'transfer_in', 'refund', 'reversal', 'interest'].includes(txType)) ? 'credit' : 'debit';
  let sign = typeClass === 'credit' ? '+' : '−';
  let typeLabel = String(txType).toUpperCase().replace(/_/g, ' ');
  let warningBadge = t.status === 'needs_review' ? ' <span style="background: var(--coral); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">Review</span>' : '';
  let duplicateBadge = t.status === 'duplicate' ? ' <span style="background: var(--muted); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">Duplicate</span>' : '';

  return '<div class="transaction" onclick="editTransaction(' + t.id + ')" style="cursor: pointer;">' +
    '<div class="avatar">' + icon(t.category) + '</div>' +
    '<div>' +
      '<div class="transaction-name">' + esc(t.merchant || t.note || 'Transaction') + warningBadge + duplicateBadge + '</div>' +
      '<div class="transaction-meta">' + esc(t.category || 'Other') + ' · ' + esc(accountName(t.accountId)) + ' · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · <small>' + typeLabel + '</small></div>' +
    '</div>' +
    '<div class="amount ' + typeClass + '">' + sign + money(t.amount) + '</div>' +
  '</div>';
}

function alertRow(a) {
  let d = new Date(a.receivedAt || Date.now());
  let badgeColor = a.category === 'SECURITY' ? 'var(--coral)' : a.category === 'EMI_NOTICE' ? 'var(--gold)' : 'var(--green)';
  return '<div class="transaction">' +
    '<div class="avatar" style="color: ' + badgeColor + ';">🔔</div>' +
    '<div>' +
      '<div class="transaction-name">' + esc(a.title) + ' <span style="background:' + badgeColor + '; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">' + esc(a.category) + '</span></div>' +
      '<div class="transaction-meta">' + esc(a.account) + ' · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div>' +
      '<div style="font-size:12px; color:var(--ink); margin-top:4px;">' + esc(a.body) + '</div>' +
    '</div>' +
    '<div class="amount">' + (a.amount ? money(a.amount) : '') + '</div>' +
  '</div>';
}

if (typeof window !== 'undefined') {
  window.editTransaction = function(id) {
    let t = data.transactions.find(x => x.id === id);
    if (!t) return;
    let dlg = $('#transactionDialog');
    if (!dlg) return;
    $('#transactionFormTitle').textContent = 'Edit transaction';
    let form = $('#transactionForm');
    form.id.value = t.id;
    form.transactionType.value = t.transactionType || 'debit';
    form.amount.value = t.amount;
    form.note.value = t.merchant || t.note || '';
    form.account.value = t.accountId || 'cash';
    form.category.value = t.category || 'Other';
    form.date.value = t.date || localDate(today);
    form.referenceNumber.value = t.referenceNumber || '';
    dlg.showModal();
  };
}

// =========================================================================
// 3. RECALCULATION & RENDER PIPELINE
// =========================================================================
function recalculateAllAccounts() {
  let debits = data.transactions.filter(t => ['transfer_out', 'debit'].includes(t.transactionType) && t.status !== 'duplicate');
  let credits = data.transactions.filter(t => ['transfer_in', 'credit'].includes(t.transactionType) && t.status !== 'duplicate');

  for (let d of debits) {
    if (d.isTransfer && d.transferGroupId) continue;
    let match = credits.find(c => {
      if (c.isTransfer && c.transferGroupId) return false;
      if (c.accountId === d.accountId) return false;
      if (Math.abs(c.amount - d.amount) > 0.01) return false;
      let timeDiff = Math.abs(c.transactionDateTime - d.transactionDateTime);
      return timeDiff <= (10 * 60 * 1000); // 10 minutes
    });

    if (match) {
      let gid = 'tr_' + d.id + '_' + match.id;
      d.isTransfer = true;
      d.transferGroupId = gid;
      d.transactionType = 'transfer_out';
      d.category = 'Transfer';

      match.isTransfer = true;
      match.transferGroupId = gid;
      match.transactionType = 'transfer_in';
      match.category = 'Transfer';
    }
  }

  render();
}

function render() {
  if (typeof document === 'undefined') return;

  let activeAccount = ($('#globalAccountFilter') && $('#globalAccountFilter').value) || 'all';
  let isCurrentFilter = t => isCurrent(t);

  let income = FinancialCalculationEngine.calculateMonthlyIncome(data.transactions, activeAccount, isCurrentFilter);
  let expenses = FinancialCalculationEngine.calculateMonthlyExpenses(data.transactions, activeAccount, isCurrentFilter);
  let saved = FinancialCalculationEngine.calculateMonthlySavings(income, expenses);

  let consolidatedBalance = activeAccount === 'all'
    ? FinancialCalculationEngine.calculateConsolidatedBalance(data.accounts, data.transactions)
    : FinancialCalculationEngine.calculateAccountBalance(data.accounts.find(a => a.id === activeAccount), data.transactions);

  let portfolio = FinancialCalculationEngine.calculateSavingsPortfolio(data.savingsProducts, data.savings);

  if ($('#balance')) $('#balance').textContent = money(consolidatedBalance);
  if ($('#income')) $('#income').textContent = money(income);
  if ($('#expenses')) $('#expenses').textContent = money(expenses);
  if ($('#saved')) $('#saved').textContent = money(saved);
  if ($('#totalSavings')) $('#totalSavings').textContent = money(portfolio.total);
  if ($('#savedCaption')) $('#savedCaption').textContent = income ? Math.round(saved / income * 100) + '% of income' : '0% of income';

  // Category spending chart
  let periodTxs = data.transactions.filter(t => {
    if (t.status === 'duplicate') return false;
    if (activeAccount !== 'all' && t.accountId !== activeAccount) return false;
    let mp = $('#monthPicker') ? $('#monthPicker').value : 'current';
    return mp === 'all' || isCurrentFilter(t);
  });
  let spends = {};
  periodTxs.filter(x => ['debit', 'card_payment', 'fee'].includes(x.transactionType) && !x.isTransfer).forEach(x => {
    spends[x.category] = (spends[x.category] || 0) + x.amount;
  });
  let max = Math.max(...Object.values(spends), 1);
  if ($('#categoryChart')) {
    $('#categoryChart').innerHTML = Object.keys(spends).length ? Object.entries(spends).sort((a, b) => b[1] - a[1]).map(([c, a]) => '<div class="category-row"><span>' + esc(c) + '</span><div class="track"><div class="fill" style="width:' + (a / max * 100) + '%"></div></div><strong>' + money(a) + '</strong></div>').join('') : '<p class="muted">No expenses for this period.</p>';
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
      return '<div class="budget-row"><div class="budget-meta"><strong>' + esc(b.category) + '</strong><span>' + money(p.used) + ' / ' + money(b.limit) + '</span></div><div class="track"><div class="fill ' + (p.used > b.limit ? 'warn' : '') + '" style="width:' + p.pct + '%"></div></div></div>';
    }).join('') || '<p class="muted">Add a budget to stay on track.</p>';
  }

  // Recent transactions list
  let activeTxs = data.transactions.filter(t => activeAccount === 'all' || t.accountId === activeAccount);
  if ($('#recentTransactions')) {
    $('#recentTransactions').innerHTML = activeTxs.slice().sort((a, b) => (b.transactionDateTime || 0) - (a.transactionDateTime || 0)).slice(0, 5).map(txRow).join('') || '<p class="muted">No transactions yet. Tap \'Scan SMS history\' or add a transaction to get started.</p>';
  }

  // Transaction history with sorting & search
  if ($('#allTransactions')) {
    let type = $('#typeFilter') ? $('#typeFilter').value : 'all';
    let cat = $('#categoryFilter') ? $('#categoryFilter').value : 'all';
    let sort = $('#sortOrder') ? $('#sortOrder').value : 'desc';
    let query = ($('#txSearch') && $('#txSearch').value.toLowerCase().trim()) || '';

    let list = activeTxs.filter(t => {
      let matchesType = type === 'all'
        || (type === 'debit' && ['debit', 'transfer_out', 'cash_withdrawal', 'card_payment', 'fee'].includes(t.transactionType) && !t.isTransfer)
        || (type === 'credit' && ['credit', 'transfer_in', 'refund', 'reversal', 'interest'].includes(t.transactionType) && !t.isTransfer)
        || (type === 'transfer' && (t.isTransfer || t.category === 'Transfer'))
        || (type === 'refund' && t.transactionType === 'refund');

      let matchesCat = cat === 'all' || t.category === cat;
      let matchesQuery = !query || (
        (t.merchant && t.merchant.toLowerCase().includes(query))
        || (t.note && t.note.toLowerCase().includes(query))
        || (t.referenceNumber && t.referenceNumber.toLowerCase().includes(query))
        || (t.amount && String(t.amount).includes(query))
      );

      return matchesType && matchesCat && matchesQuery;
    });

    list.sort((a, b) => {
      let tA = a.transactionDateTime || (a.date ? new Date(a.date).getTime() : 0);
      let tB = b.transactionDateTime || (b.date ? new Date(b.date).getTime() : 0);
      return sort === 'asc' ? (tA - tB) : (tB - tA);
    });

    $('#allTransactions').innerHTML = list.map(txRow).join('') || '<p class="muted">No transactions match those filters.</p>';
  }

  // Monthly budgets list
  if ($('#budgetList')) {
    $('#budgetList').innerHTML = data.budgets.map(b => {
      let p = progress(b);
      return '<article class="budget-card"><div class="avatar">' + icon(b.category) + '</div><h3>' + esc(b.category) + '</h3><p>' + money(p.used) + ' spent of ' + money(b.limit) + '</p><div class="track"><div class="fill ' + (p.used > b.limit ? 'warn' : '') + '" style="width:' + p.pct + '%"></div></div><p>' + (Math.max(0, b.limit - p.used) > 0 ? money(b.limit - p.used) + ' left' : money(p.used - b.limit) + ' over budget') + '</p></article>';
    }).join('') || '<p class="muted">No budgets yet.</p>';
  }

  // Recurring payments
  if ($('#recurringList')) {
    $('#recurringList').innerHTML = data.recurring.map(r => '<article class="recurring-item"><div class="recurring-left"><div class="avatar">↻</div><div><strong>' + esc(r.name) + '</strong><div class="transaction-meta">Every month on day ' + r.day + '</div></div></div><div class="amount ' + r.type + '">' + (r.type === 'credit' ? '+' : '−') + money(r.amount) + '</div></article>').join('') || '<p class="muted">No recurring payments yet.</p>';
  }

  // Bank accounts
  if ($('#accountList')) {
    $('#accountList').innerHTML = data.accounts.map(a => {
      let balance = FinancialCalculationEngine.calculateAccountBalance(a, data.transactions);
      let txs = data.transactions.filter(t => t.accountId === a.id && t.status !== 'duplicate');
      let inflow = txs.filter(t => ['credit', 'transfer_in', 'refund', 'reversal', 'interest'].includes(t.transactionType)).reduce((n, t) => n + t.amount, 0);
      let outflow = txs.filter(t => ['debit', 'transfer_out', 'cash_withdrawal', 'card_payment', 'fee'].includes(t.transactionType)).reduce((n, t) => n + t.amount, 0);
      return '<article class="budget-card">' +
        '<div class="panel-head" style="margin-bottom: 8px;">' +
          '<div style="display: flex; align-items: center; gap: 8px;">' +
            '<div class="avatar">▣</div>' +
            '<div>' +
              '<h3 style="margin:0; font-size:16px;">' + esc(a.bankName) + '</h3>' +
              '<small class="muted">' + esc(a.accountName) + ' · ' + esc(a.accountType) + '</small>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p>Account ending ' + esc(a.maskedAccountNumber) + '</p>' +
        '<div class="budget-meta"><span>Current Balance</span><strong class="amount credit">' + money(balance) + '</strong></div>' +
        '<div class="budget-meta"><span>Incoming (total)</span><strong>' + money(inflow) + '</strong></div>' +
        '<div class="budget-meta"><span>Outgoing (total)</span><strong>' + money(outflow) + '</strong></div>' +
      '</article>';
    }).join('');
  }

  // Savings & Fixed Deposits
  if ($('#savingsInvested')) $('#savingsInvested').textContent = money(portfolio.total);
  if ($('#savingsFdTotal')) $('#savingsFdTotal').textContent = money(portfolio.fdTotal);
  if ($('#savingsRdTotal')) $('#savingsRdTotal').textContent = money(portfolio.rdTotal);
  if ($('#savingsCountText')) $('#savingsCountText').textContent = portfolio.totalActiveCount + ' active product(s)';
  if ($('#savingsFdRateText')) $('#savingsFdRateText').textContent = portfolio.activeFdCount + ' active FD(s)';
  if ($('#savingsRdCommitText')) $('#savingsRdCommitText').textContent = portfolio.activeRdCount + ' active RD(s)';

  if ($('#activeSavingsProducts')) {
    $('#activeSavingsProducts').innerHTML = data.savingsProducts.map(p => {
      let isFd = p.productType === 'FD';
      let icon = isFd ? '🏦' : '🗓';
      let title = isFd ? ('Fixed Deposit (' + p.bankName + ')') : ('Recurring Deposit (' + p.bankName + ')');
      let amountLabel = isFd ? 'Principal Amount' : 'Total Contributed';
      let amtVal = isFd ? p.principalAmount : (p.totalContributed || p.installmentAmount);
      return '<article class="budget-card">' +
        '<div class="panel-head" style="margin-bottom: 8px;">' +
          '<div style="display: flex; align-items: center; gap: 8px;">' +
            '<div class="avatar">' + icon + '</div>' +
            '<div>' +
              '<h3 style="margin:0; font-size:15px;">' + esc(title) + '</h3>' +
              '<small class="muted">' + esc(p.referenceNumber) + ' · ' + p.interestRate + '% p.a.</small>' +
            '</div>' +
          '</div>' +
          '<span style="background: ' + (p.status === 'ACTIVE' ? 'var(--mint)' : 'var(--paper)') + '; color: ' + (p.status === 'ACTIVE' ? 'var(--green)' : 'var(--muted)') + '; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">' + p.status + '</span>' +
        '</div>' +
        '<div class="budget-meta"><span>' + amountLabel + '</span><strong>' + money(amtVal) + '</strong></div>' +
        (isFd && p.expectedMaturityAmount ? ('<div class="budget-meta"><span>Maturity Amount</span><strong class="amount credit">' + money(p.expectedMaturityAmount) + '</strong></div>') : '') +
        '<div class="budget-meta"><span>Maturity Date</span><strong>' + (p.maturityDate || '—') + '</strong></div>' +
      '</article>';
    }).join('') || '<p class="muted">No bank Fixed or Recurring Deposits detected yet. Scan SMS to discover active deposits.</p>';
  }

  if ($('#savingsList')) {
    $('#savingsList').innerHTML = data.savings.map(s => {
      let calc = calculateSaving(s);
      return '<article class="budget-card">' +
        '<div class="panel-head" style="margin-bottom: 12px; align-items: flex-start;">' +
          '<div style="display: flex; align-items: center; gap: 10px;">' +
            '<div class="avatar">' + (s.type === 'sip' ? '📈' : s.type === 'ppf' ? '🛡' : '🐖') + '</div>' +
            '<div>' +
              '<h3 style="margin:0; font-size:16px;">' + esc(s.name) + '</h3>' +
              '<small class="muted">' + esc(s.type).toUpperCase() + ' · ' + s.rate + '% p.a.</small>' +
            '</div>' +
          '</div>' +
          '<button class="close delete-saving" data-id="' + s.id + '" style="font-size: 18px; line-height: 1; padding: 0;">×</button>' +
        '</div>' +
        '<div class="budget-meta"><span>Total Invested</span><strong>' + money(calc.invested) + '</strong></div>' +
        '<div class="budget-meta"><span>Current Value</span><strong class="amount credit">' + money(calc.current) + '</strong></div>' +
        '<div class="track" style="margin: 10px 0 6px; height: 6px;"><div class="fill" style="width: ' + calc.progress + '%"></div></div>' +
      '</article>';
    }).join('') || '<p class="muted">Add a custom investment (Mutual Fund / PPF) to track long-term savings.</p>';

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

  // Financial Alerts & Service Messages
  if ($('#alertList')) {
    let catFilter = ($('#alertFilter') && $('#alertFilter').value) || 'all';
    let alerts = data.serviceMessages.filter(a => catFilter === 'all' || a.category === catFilter || a.subcategory === catFilter);
    alerts.sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
    $('#alertList').innerHTML = alerts.map(alertRow).join('') || '<p class="muted">No service alerts or notifications yet.</p>';
  }

  // Audit Tab
  let duplicates = data.transactions.filter(t => t.status === 'duplicate').length;
  let txCreated = data.transactions.filter(t => t.status !== 'duplicate').length;
  let savingsCreated = data.savingsProducts.length;
  let serviceCreated = data.serviceMessages.length;
  let transfers = data.transactions.filter(t => t.isTransfer && t.transactionType === 'transfer_out').length;
  let needsReview = data.transactions.filter(t => t.status === 'needs_review').length;

  let totalCredits = data.transactions.filter(t => t.status !== 'duplicate' && ['credit', 'transfer_in', 'refund', 'reversal', 'interest'].includes(t.transactionType)).reduce((s, t) => s + t.amount, 0);
  let totalDebits = data.transactions.filter(t => t.status !== 'duplicate' && ['debit', 'transfer_out', 'cash_withdrawal', 'card_payment', 'fee'].includes(t.transactionType)).reduce((s, t) => s + t.amount, 0);
  let internalTransfers = data.transactions.filter(t => t.status !== 'duplicate' && t.isTransfer && t.transactionType === 'transfer_out').reduce((s, t) => s + t.amount, 0);

  if ($('#auditSmsScanned')) $('#auditSmsScanned').textContent = Object.keys(data.smsRecords).length;
  if ($('#auditTxCreated')) $('#auditTxCreated').textContent = txCreated;
  if ($('#auditSavingsCreated')) $('#auditSavingsCreated').textContent = savingsCreated;
  if ($('#auditServiceCreated')) $('#auditServiceCreated').textContent = serviceCreated;
  if ($('#auditDuplicates')) $('#auditDuplicates').textContent = duplicates;
  if ($('#auditTransfers')) $('#auditTransfers').textContent = transfers;
  if ($('#auditNeedsReview')) $('#auditNeedsReview').textContent = needsReview;
  if ($('#auditTotalCredits')) $('#auditTotalCredits').textContent = money(totalCredits);
  if ($('#auditTotalDebits')) $('#auditTotalDebits').textContent = money(totalDebits);
  if ($('#auditInternalTransfers')) $('#auditInternalTransfers').textContent = money(internalTransfers);
  if ($('#auditGenuineIncome')) $('#auditGenuineIncome').textContent = money(income);
  if ($('#auditGenuineExpenses')) $('#auditGenuineExpenses').textContent = money(expenses);
  if ($('#auditNetSavings')) $('#auditNetSavings').textContent = money(saved);

  if ($('#validationAlerts')) {
    let alerts = FinancialCalculationEngine.validateLedger(data.accounts, data.transactions);
    $('#validationAlerts').innerHTML = alerts.length ? alerts.map(a => '<p style="color: var(--coral); margin: 4px 0; font-size: 13px;">⚠ ' + esc(a) + '</p>').join('') : '<p class="muted">No validation alerts. Ledger is fully reconciled.</p>';
  }
}

function fillSelect(id) {
  if (typeof document !== 'undefined' && $(id)) {
    $(id).innerHTML = categories.map(c => '<option>' + c + '</option>').join('');
  }
}

function fillAccounts() {
  if (typeof document !== 'undefined' && $('#transactionAccount')) {
    $('#transactionAccount').innerHTML = data.accounts.map(a => '<option value="' + a.id + '">' + esc(a.bankName) + ' · ' + esc(a.maskedAccountNumber) + '</option>').join('');
  }
}

function fillGlobalAccountFilter() {
  if (typeof document !== 'undefined' && $('#globalAccountFilter')) {
    let val = $('#globalAccountFilter').value || 'all';
    $('#globalAccountFilter').innerHTML = '<option value="all">All Accounts</option>' +
      data.accounts.map(a => '<option value="' + a.id + '">' + esc(a.bankName) + ' · ' + esc(a.maskedAccountNumber) + '</option>').join('');
    $('#globalAccountFilter').value = val;
  }
}
// =========================================================================
// 4. REAL-TIME EVENT BUS & BATCH SCANNER WITH PROGRESS
// =========================================================================
let isScanningCancelled = false;

function scanSmsBatch(messages, onProgress, onComplete) {
  if (!Array.isArray(messages) || messages.length === 0) {
    if (onComplete) onComplete({ total: 0, processed: 0 });
    return;
  }

  isScanningCancelled = false;
  let total = messages.length;
  let processed = 0;
  let txCount = 0;
  let savingsCount = 0;
  let serviceCount = 0;
  let duplicatesCount = 0;
  let reviewCount = 0;

  let index = 0;
  let chunkSize = 50;

  function processChunk() {
    if (isScanningCancelled || index >= total) {
      save();
      fillAccounts();
      fillGlobalAccountFilter();
      if (onComplete) onComplete({ total, processed, cancelled: isScanningCancelled });
      return;
    }

    let end = Math.min(index + chunkSize, total);
    for (let i = index; i < end; i++) {
      let res = FinancialSmsAgent.process(messages[i]);
      processed++;
      if (res.status === 'duplicate') duplicatesCount++;
      else if (res.transaction) {
        txCount++;
        if (res.transaction.status === 'needs_review') reviewCount++;
      }
      else if (res.savingsProduct) savingsCount++;
      else if (res.serviceMessage) serviceCount++;
    }
    index = end;

    let pct = Math.round((processed / total) * 100);
    if (onProgress) {
      onProgress({
        processed,
        total,
        percent: pct,
        txCount,
        savingsCount,
        serviceCount,
        duplicatesCount,
        reviewCount
      });
    }

    setTimeout(processChunk, 0);
  }

  processChunk();
}

if (typeof window !== 'undefined') {
  window.addEventListener('smsTransaction', e => {
    let msg = e.detail;
    if (msg) {
      let res = FinancialSmsAgent.process(msg);
      save();
      fillAccounts();
      fillGlobalAccountFilter();
      if (res.transaction) {
        toast('SMS Processed: ' + res.transaction.transactionType.toUpperCase() + ' ' + money(res.transaction.amount));
      } else if (res.savingsProduct) {
        toast('Deposit Discovered: ' + res.savingsProduct.productType + ' ' + money(res.savingsProduct.principalAmount || res.savingsProduct.installmentAmount));
      }
    }
  });

  window.importSMSHistory = function(messages) {
    let dlg = $('#scanProgressDialog');
    if (dlg) dlg.showModal();

    scanSmsBatch(
      messages,
      p => {
        if ($('#scanProgressBar')) $('#scanProgressBar').style.width = p.percent + '%';
        if ($('#scanProgressText')) $('#scanProgressText').textContent = 'Processed ' + p.processed + ' / ' + p.total + ' SMS';
        if ($('#scanProgressPct')) $('#scanProgressPct').textContent = p.percent + '%';
        if ($('#scanCountTx')) $('#scanCountTx').textContent = p.txCount;
        if ($('#scanCountSavings')) $('#scanCountSavings').textContent = p.savingsCount;
        if ($('#scanCountService')) $('#scanCountService').textContent = p.serviceCount;
        if ($('#scanCountDuplicates')) $('#scanCountDuplicates').textContent = p.duplicatesCount;
        if ($('#scanCountReview')) $('#scanCountReview').textContent = p.reviewCount;
      },
      summary => {
        setTimeout(() => {
          if (dlg) dlg.close();
          toast('Scan Complete: ' + summary.processed + ' SMS processed');
        }, 500);
      }
    );
  };
}

// =========================================================================
// 5. DOM & EVENT LISTENERS
// =========================================================================
if (typeof document !== 'undefined') {
  if ($('#today')) $('#today').textContent = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      let target = btn.getAttribute('data-view');
      let targetEl = $('#' + target);
      if (targetEl) targetEl.classList.add('active');
    });
  });

  document.querySelectorAll('[data-view]').forEach(btn => {
    if (!btn.classList.contains('nav-link')) {
      btn.addEventListener('click', () => {
        let v = btn.getAttribute('data-view');
        let navBtn = document.querySelector('.nav-link[data-view="' + v + '"]');
        if (navBtn) navBtn.click();
      });
    }
  });

  if ($('#globalAccountFilter')) {
    $('#globalAccountFilter').addEventListener('change', () => render());
  }

  if ($('#sortOrder')) $('#sortOrder').addEventListener('change', () => render());
  if ($('#typeFilter')) $('#typeFilter').addEventListener('change', () => render());
  if ($('#categoryFilter')) $('#categoryFilter').addEventListener('change', () => render());
  if ($('#txSearch')) $('#txSearch').addEventListener('input', () => render());
  if ($('#monthPicker')) $('#monthPicker').addEventListener('change', () => render());
  if ($('#alertFilter')) $('#alertFilter').addEventListener('change', () => render());

  if ($('#addButton')) {
    $('#addButton').onclick = () => {
      let dlg = $('#transactionDialog');
      if (!dlg) return;
      $('#transactionFormTitle').textContent = 'Add transaction';
      let form = $('#transactionForm');
      form.reset();
      form.id.value = '';
      form.date.value = localDate(today);
      dlg.showModal();
    };
  }

  if ($('#smsButton')) {
    $('#smsButton').onclick = () => {
      let dlg = $('#smsDialog');
      if (dlg) dlg.showModal();
    };
  }

  if ($('#historyButton')) {
    $('#historyButton').onclick = () => {
      if (window.AndroidLedger && window.AndroidLedger.scanHistory) {
        window.AndroidLedger.scanHistory();
        toast('Scanning banking SMS history…');
      } else {
        toast('Historical scan is available in the Android app');
      }
    };
  }

  if ($('#cancelScanButton')) {
    $('#cancelScanButton').onclick = () => {
      isScanningCancelled = true;
      let dlg = $('#scanProgressDialog');
      if (dlg) dlg.close();
      toast('Scan cancelled. Already processed items were saved.');
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

  if ($('#accountButton')) {
    $('#accountButton').onclick = () => {
      let dlg = $('#accountDialog');
      if (!dlg) return;
      let form = $('#accountForm');
      form.reset();
      form.openingBalanceDate.value = localDate(today);
      dlg.showModal();
    };
  }

  if ($('#savingsButton')) {
    $('#savingsButton').onclick = () => {
      let dlg = $('#savingsDialog');
      if (!dlg) return;
      let form = $('#savingsForm');
      form.reset();
      form.date.value = localDate(today);
      dlg.showModal();
    };
  }

  if ($('#budgetButton')) {
    $('#budgetButton').onclick = () => {
      let dlg = $('#budgetDialog');
      if (dlg) dlg.showModal();
    };
  }

  if ($('#recurringButton')) {
    $('#recurringButton').onclick = () => {
      let dlg = $('#recurringDialog');
      if (dlg) dlg.showModal();
    };
  }

  // Dialog Forms
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
        category: f.get('category'),
        date: f.get('date'),
        referenceNumber: f.get('referenceNumber') || null
      };

      if (id) {
        let tid = parseFloat(id);
        let idx = data.transactions.findIndex(t => t.id === tid);
        if (idx >= 0) {
          data.transactions[idx] = {
            ...data.transactions[idx],
            ...txData,
            transactionDateTime: new Date(txData.date + 'T12:00:00').getTime(),
            userModified: true,
            updatedAt: Date.now()
          };
        }
      } else {
        data.transactions.push({
          id: Date.now() + Math.random(),
          ...txData,
          transactionDateTime: new Date(txData.date + 'T12:00:00').getTime(),
          confidenceScore: 100,
          isTransfer: ['transfer_out', 'transfer_in', 'cash_withdrawal'].includes(txData.transactionType),
          transferGroupId: null,
          status: 'confirmed',
          source: 'MANUAL',
          classification: txData.transactionType.toUpperCase(),
          agentVersion: FinancialSmsAgent.VERSION,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      save();
      $('#transactionDialog').close();
      toast(id ? 'Transaction updated' : 'Transaction added');
    });
  }

  if ($('#accountForm')) {
    $('#accountForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target);
      let bank = f.get('bank');
      let last4 = f.get('last4');
      let id = (bank + '-' + last4).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      data.accounts.push({
        id,
        bankName: bank,
        accountName: f.get('name'),
        maskedAccountNumber: last4,
        accountType: f.get('type'),
        openingBalance: parseFloat(f.get('openingBalance') || 0),
        openingBalanceDate: f.get('openingBalanceDate'),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      save();
      fillAccounts();
      fillGlobalAccountFilter();
      $('#accountDialog').close();
      toast('Bank account added');
    });
  }

  if ($('#savingsForm')) {
    $('#savingsForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target);
      data.savings.push({
        id: Date.now() + Math.random(),
        type: f.get('type'),
        name: f.get('name'),
        amount: parseFloat(f.get('amount')),
        rate: parseFloat(f.get('rate')),
        tenure: parseInt(f.get('tenure')),
        date: f.get('date'),
        createdAt: Date.now()
      });
      save();
      $('#savingsDialog').close();
      toast('Investment added');
    });
  }

  if ($('#budgetForm')) {
    $('#budgetForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target);
      let cat = f.get('category');
      let lim = parseFloat(f.get('limit'));
      let ex = data.budgets.find(b => b.category === cat);
      if (ex) ex.limit = lim;
      else data.budgets.push({ category: cat, limit: lim });
      save();
      $('#budgetDialog').close();
      toast('Budget updated');
    });
  }

  if ($('#recurringForm')) {
    $('#recurringForm').addEventListener('submit', e => {
      e.preventDefault();
      let f = new FormData(e.target);
      data.recurring.push({
        name: f.get('name'),
        type: f.get('type'),
        amount: parseFloat(f.get('amount')),
        day: parseInt(f.get('day'))
      });
      save();
      $('#recurringDialog').close();
      toast('Recurring payment added');
    });
  }

  if ($('#smsForm')) {
    $('#smsForm').addEventListener('submit', e => {
      e.preventDefault();
      let sms = new FormData(e.target).get('sms');
      let res = FinancialSmsAgent.process(sms);
      save();
      fillAccounts();
      fillGlobalAccountFilter();
      $('#smsDialog').close();
      if (res.transaction) {
        toast('Parsed ' + res.classification.level3 + ': ₹' + res.transaction.amount);
      } else if (res.savingsProduct) {
        toast('Discovered ' + res.savingsProduct.productType + ': ₹' + (res.savingsProduct.principalAmount || res.savingsProduct.installmentAmount));
      } else if (res.serviceMessage) {
        toast('Alert: ' + res.serviceMessage.title);
      } else {
        toast('AI Classification: ' + res.classification.level2);
      }
    });
  }

  fillSelect('#transactionCategory');
  fillSelect('#categoryFilter');
  fillSelect('#budgetCategory');
  fillAccounts();
  fillGlobalAccountFilter();

  if (window.LedgerCloud && LedgerCloud.enabled()) {
    if ($('#syncText')) $('#syncText').textContent = 'Connecting to Google Sheets…';
    LedgerCloud.load().then(remote => {
      if (remote && Array.isArray(remote.transactions)) {
        data = remote;
        data.transactions = data.transactions || [];
        data.savingsProducts = data.savingsProducts || [];
        data.serviceMessages = data.serviceMessages || [];
        data.accounts = data.accounts || [];
        data.budgets = data.budgets || [];
        data.recurring = data.recurring || [];
        data.savings = data.savings || [];
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
    FinancialSmsAgent,
    scanSmsBatch,
    calculateSaving,
    data,
    seed
  };
}
// Backward Compatibility Adapter for Legacy Tests
const SmsParser = {
  parse(sms) {
    let body = typeof sms === 'string' ? sms : (sms.body || '');
    let sender = typeof sms === 'object' ? (sms.sender || '') : '';
    let classification = FinancialSmsAgent.classify(body, sender);
    if (!classification.isFinancial) return null;
    let bank = FinancialSmsAgent.identifyBank(body, sender);
    let last4 = FinancialSmsAgent.extractLast4(body);
    let amount = FinancialSmsAgent.extractAmount(body);
    let ref = FinancialSmsAgent.extractReference(body);
    let merchant = FinancialSmsAgent.extractMerchant(body);
    if (amount <= 0) return null;
    let status = (classification.confidence >= 90 && bank !== 'Bank' && last4 !== '—') ? 'confirmed' : 'needs_review';
    return {
      bank,
      last4,
      amount,
      referenceNumber: ref,
      merchant,
      confidenceScore: classification.confidence,
      status,
      type: ['credit', 'salary', 'upi_credit'].includes(classification.level3.toLowerCase()) ? 'credit' : 'debit'
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FinancialCalculationEngine,
    FinancialSmsAgent,
    SmsParser,
    scanSmsBatch,
    calculateSaving,
    data,
    seed
  };
}