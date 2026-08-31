const categories=['Food & dining','Transport','Shopping','Bills & utilities','Health','Entertainment','Salary','Transfer','Other'];
const seed=[
 {id:1,type:'debit',amount:420,note:'Swiggy',category:'Food & dining',date:'2026-08-29'},
 {id:2,type:'credit',amount:65000,note:'Monthly salary',category:'Salary',date:'2026-08-28'},
 {id:3,type:'debit',amount:1250,note:'Electricity bill',category:'Bills & utilities',date:'2026-08-27'},
 {id:4,type:'debit',amount:180,note:'Uber',category:'Transport',date:'2026-08-26'},
 {id:5,type:'debit',amount:799,note:'Netflix',category:'Entertainment',date:'2026-08-23'}];
let data=JSON.parse(localStorage.getItem('pocket-ledger-v1')||'null')||{transactions:seed,budgets:[{category:'Food & dining',limit:6000},{category:'Transport',limit:3000},{category:'Entertainment',limit:2000}],recurring:[{name:'Netflix',type:'debit',amount:799,day:23}],accounts:[{id:'cash',bank:'Cash / manual',last4:'—'}],savings:[]};
data.accounts=data.accounts||[{id:'cash',bank:'Cash / manual',last4:'—'}];data.transactions.forEach(t=>t.account=t.account||'cash');data.savings=data.savings||[];
const $=s=>document.querySelector(s), money=n=>'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:0}), today=new Date(), localDate=d=>{let o=d instanceof Date?d:new Date(d);if(isNaN(o.getTime()))o=new Date();return new Date(o.getTime()-o.getTimezoneOffset()*60000).toISOString().slice(0,10)};
$('#today').textContent=today.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
function calculateSaving(s){
  let principal=parseFloat(s.amount),r=parseFloat(s.rate)/100,tenure=parseInt(s.tenure);
  let start=new Date(s.date+'T00:00:00'),maturityDate=new Date(start.getTime());
  maturityDate.setMonth(maturityDate.getMonth()+tenure);
  let elapsedMonths=(today.getFullYear()-start.getFullYear())*12+(today.getMonth()-start.getMonth());
  if(today.getDate()<start.getDate())elapsedMonths=Math.max(0,elapsedMonths-1);
  elapsedMonths=Math.min(tenure,Math.max(0,elapsedMonths));
  let progress=(elapsedMonths/tenure)*100,invested=0,current=0,maturity=0;
  if(s.type==='fd'){
    invested=principal;
    maturity=principal*Math.pow(1+r/4,4*(tenure/12));
    current=principal*Math.pow(1+r/4,4*(elapsedMonths/12));
  }else if(s.type==='rd'){
    invested=principal*(elapsedMonths||1);
    for(let i=1;i<=tenure;i++)maturity+=principal*Math.pow(1+r/4,4*(i/12));
    for(let i=1;i<=elapsedMonths;i++)current+=principal*Math.pow(1+r/4,4*(i/12));
    if(elapsedMonths===0){current=principal;invested=principal;}
  }else if(s.type==='sip'){
    invested=principal*(elapsedMonths||1);
    let mr=r/12;
    if(mr>0){
      maturity=principal*((Math.pow(1+mr,tenure)-1)/mr)*(1+mr);
      current=principal*((Math.pow(1+mr,elapsedMonths)-1)/mr)*(1+mr);
    }else{
      maturity=principal*tenure;
      current=principal*elapsedMonths;
    }
    if(elapsedMonths===0){current=principal;invested=principal;}
  }else if(s.type==='ppf'){
    invested=principal;
    maturity=principal*Math.pow(1+r,tenure/12);
    current=principal*Math.pow(1+r,elapsedMonths/12);
  }else{
    invested=principal;
    maturity=principal*(1+r*(tenure/12));
    current=principal*(1+r*(elapsedMonths/12));
  }
  return {
    invested:Math.round(invested),
    current:Math.round(current),
    maturity:Math.round(maturity),
    maturityDate:maturityDate.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),
    progress:Math.min(100,Math.max(0,progress))
  };
}
function save(){localStorage.setItem('pocket-ledger-v1',JSON.stringify(data));render();if(window.LedgerCloud&&LedgerCloud.enabled())LedgerCloud.push(data).then(()=>{$('#syncText').textContent='Backed up to Google Sheets'}).catch(()=>{$('#syncText').textContent='Sheet backup needs attention'});}
function isCurrent(t){let d=new Date(t.date+'T12:00:00');return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear()}
function filtered(){return $('#monthPicker').value==='all'?data.transactions:data.transactions.filter(isCurrent)}
function icon(c){return ({'Food & dining':'🍜',Transport:'◒',Shopping:'◈','Bills & utilities':'▤',Health:'✚',Entertainment:'◉',Salary:'₹',Transfer:'↔',Other:'•'})[c]||'•'}
function accountName(id){let a=data.accounts.find(x=>x.id===id);return a?`${a.bank} · ${a.last4}`:'Account pending'}
function txRow(t){let d=new Date(t.date+'T12:00:00');return `<div class="transaction"><div class="avatar">${icon(t.category)}</div><div><div class="transaction-name">${esc(t.note)}</div><div class="transaction-meta">${esc(t.category)} · ${esc(accountName(t.account))} · ${d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div></div><div class="amount ${t.type}">${t.type==='credit'?'+':'−'}${money(t.amount)}</div></div>`}
function esc(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))}
function render(){let current=data.transactions.filter(isCurrent), income=current.filter(x=>x.type==='credit').reduce((a,x)=>a+x.amount,0), expenses=current.filter(x=>x.type==='debit').reduce((a,x)=>a+x.amount,0), total=data.transactions.reduce((a,x)=>a+(x.type==='credit'?x.amount:-x.amount),0), saved=income-expenses;
  let totalInvested=0,totalCurrent=0;
  let savingsCalculated=data.savings.map(s=>{let calc=calculateSaving(s);totalInvested+=calc.invested;totalCurrent+=calc.current;return {s,calc};});
  let totalEarnings=totalCurrent-totalInvested;
  $('#balance').textContent=money(total);$('#income').textContent=money(income);$('#expenses').textContent=money(expenses);$('#saved').textContent=money(saved);$('#savedCaption').textContent=income?Math.round(saved/income*100)+'% of income':'No income recorded';
  $('#totalSavings').textContent=money(totalCurrent);$('#savingsInvested').textContent=money(totalInvested);$('#savingsCurrent').textContent=money(totalCurrent);$('#savingsEarnings').textContent=(totalEarnings>=0?'+':'')+money(totalEarnings);
 let tx=filtered(), spends={};tx.filter(x=>x.type==='debit').forEach(x=>spends[x.category]=(spends[x.category]||0)+x.amount);let max=Math.max(...Object.values(spends),1);
 $('#categoryChart').innerHTML=Object.keys(spends).length?Object.entries(spends).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<div class="category-row"><span>${esc(c)}</span><div class="track"><div class="fill" style="width:${a/max*100}%"></div></div><strong>${money(a)}</strong></div>`).join(''):'<p class="muted">No expenses for this period.</p>';
 const progress=b=>{let used=current.filter(t=>t.type==='debit'&&t.category===b.category).reduce((a,t)=>a+t.amount,0),pct=Math.min(100,used/b.limit*100);return {used,pct}};
 $('#budgetPreview').innerHTML=data.budgets.slice(0,3).map(b=>{let p=progress(b);return `<div class="budget-row"><div class="budget-meta"><strong>${esc(b.category)}</strong><span>${money(p.used)} / ${money(b.limit)}</span></div><div class="track"><div class="fill ${p.used>b.limit?'warn':''}" style="width:${p.pct}%"></div></div></div>`}).join('')||'<p class="muted">Add a budget to stay on track.</p>';
 $('#recentTransactions').innerHTML=data.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).slice(0,5).map(txRow).join('');
 let type=$('#typeFilter').value,cat=$('#categoryFilter').value;$('#allTransactions').innerHTML=data.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).filter(t=>(type==='all'||t.type===type)&&(cat==='all'||t.category===cat)).map(txRow).join('')||'<p class="muted">No transactions match those filters.</p>';
 $('#budgetList').innerHTML=data.budgets.map(b=>{let p=progress(b);return `<article class="budget-card"><div class="avatar">${icon(b.category)}</div><h3>${esc(b.category)}</h3><p>${money(p.used)} spent of ${money(b.limit)}</p><div class="track"><div class="fill ${p.used>b.limit?'warn':''}" style="width:${p.pct}%"></div></div><p>${Math.max(0,b.limit-p.used)>0?money(b.limit-p.used)+' left':money(p.used-b.limit)+' over budget'}</p></article>`}).join('')||'<p class="muted">No budgets yet.</p>';
 $('#recurringList').innerHTML=data.recurring.map(r=>`<article class="recurring-item"><div class="recurring-left"><div class="avatar">↻</div><div><strong>${esc(r.name)}</strong><div class="transaction-meta">Every month on day ${r.day}</div></div></div><div class="amount ${r.type}">${r.type==='credit'?'+':'−'}${money(r.amount)}</div></article>`).join('')||'<p class="muted">No recurring payments yet.</p>';
 $('#accountList').innerHTML=data.accounts.map(a=>{let txs=data.transactions.filter(t=>t.account===a.id),inflow=txs.filter(t=>t.type==='credit').reduce((n,t)=>n+t.amount,0),outflow=txs.filter(t=>t.type==='debit').reduce((n,t)=>n+t.amount,0);return `<article class="budget-card"><div class="avatar">▣</div><h3>${esc(a.bank)}</h3><p>Account ending ${esc(a.last4)}</p><div class="budget-meta"><span>Incoming</span><strong class="amount credit">${money(inflow)}</strong></div><div class="budget-meta"><span>Spent</span><strong class="amount debit">${money(outflow)}</strong></div></article>`}).join('');
  const getSavingIcon = t => t==='fd'?'🏦':t==='rd'?'🗓':t==='sip'?'📈':t==='ppf'?'🛡':'🐖';
  const getSavingTypeText = t => t==='fd'?'Fixed Deposit (FD)':t==='rd'?'Recurring Deposit (RD)':t==='sip'?'Mutual Fund (SIP)':t==='ppf'?'PPF':'Other';
  $('#savingsList').innerHTML = savingsCalculated.map(({s, calc}) => {
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
function fillSelect(id){$(id).innerHTML=categories.map(c=>`<option>${c}</option>`).join('')}function fillAccounts(){$('#transactionAccount').innerHTML=data.accounts.map(a=>`<option value="${a.id}">${esc(a.bank)} · ${esc(a.last4)}</option>`).join('')}fillSelect('#transactionCategory');fillSelect('#budgetCategory');fillAccounts();$('#categoryFilter').innerHTML='<option value="all">All categories</option>'+categories.map(c=>`<option>${c}</option>`).join('');
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{let v=b.dataset.view;document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v));document.querySelectorAll('.nav-link').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('#pageTitle').textContent=v==='dashboard'?'Good evening':v[0].toUpperCase()+v.slice(1)}));
$('#addButton').onclick=()=>{$('#transactionForm').date.value=localDate(today);$('#transactionDialog').showModal()};$('#smsButton').onclick=()=>$('#smsDialog').showModal();$('#budgetButton').onclick=()=>$('#budgetDialog').showModal();$('#recurringButton').onclick=()=>$('#recurringDialog').showModal();$('#accountButton').onclick=()=>$('#accountDialog').showModal();$('#historyButton').onclick=()=>{if(window.AndroidLedger&&window.AndroidLedger.scanHistory){window.AndroidLedger.scanHistory();toast('Scanning banking SMS history…')}else toast('SMS history scanning is available in the Android app only')};$('#resetButton').onclick=()=>{if(confirm('Are you sure you want to reset all transactions, accounts, and budgets?')){localStorage.removeItem('pocket-ledger-v1');location.reload()}};
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3000)}
$('#transactionForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target);data.transactions.push({id:Date.now(),type:f.get('type'),amount:+f.get('amount'),note:f.get('note'),account:f.get('account'),category:f.get('category'),date:f.get('date')});e.target.closest('dialog').close();e.target.reset();save();toast('Transaction saved');});
function findAccount(bank,last4){let id=`${bank}-${last4}`.toLowerCase().replace(/[^a-z0-9]+/g,'-');if(!data.accounts.some(a=>a.id===id)){data.accounts.push({id,bank,last4});fillAccounts()}return id}
function parseSMS(raw){let s=typeof raw==='string'?raw:raw.body||'',sender=typeof raw==='string'?'':raw.sender||'';let text=s.replace(/\s+/g,' ');let isDebit=/\b(?:debit\w*|spent|paid|withdraw\w*|charg\w*|deduct\w*|sent|transfer\w*)\b/i.test(text);let isCredit=/\b(?:credit\w*|receiv\w*|deposit\w*|refund\w*|added)\b/i.test(text);if(!isDebit&&!isCredit)return null;if(/statement (?:for|generated)|minimum due|outstanding (?:bal|balance)|payment due|bill due|is due/i.test(text)&&!/debited|credited/i.test(text))return null;let amountRegex=/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;let matches=[],match;while((match=amountRegex.exec(text))!==null){matches.push({index:match.index,rawAmount:match[1],val:parseFloat(match[1].replace(/,/g,''))});}if(matches.length===0)return null;let txAmount=null;for(let m of matches){let start=Math.max(0,m.index-25),end=Math.min(text.length,m.index+m.rawAmount.length+25);let context=text.slice(start,end).toLowerCase();if(!/bal|balance|limit|outstanding|due|minimum/i.test(context)){txAmount=m.val;break;}}if(txAmount===null)txAmount=matches[0].val;let last4Match=text.match(/(?:a\/?c(?:count)?|card|xx|x{2,}|ending\s*(?:in|with)?)\s*(?:no\.?\s*)?(\d{4})/i);let last4=last4Match?last4Match[1]:null;if(!last4){let words=text.match(/\b\d{4}\b/g);if(words){last4=words[words.length-1];}}if(!last4)last4='Unknown';let bankMap={HDF:'HDFC Bank',ICICI:'ICICI Bank',SBIN:'State Bank of India',SBI:'State Bank of India',AXIS:'Axis Bank',KOTAK:'Kotak Mahindra Bank',IDFC:'IDFC FIRST Bank',INDUS:'IndusInd Bank',YES:'Yes Bank',PAYTM:'Paytm',PHONEPE:'PhonePe',GPAY:'Google Pay',UNION:'Union Bank of India',CANARA:'Canara Bank',PNB:'Punjab National Bank',BOI:'Bank of India',BARODA:'Bank of Baroda',BOB:'Bank of Baroda',FEDERAL:'Federal Bank',HSBC:'HSBC Bank',SCB:'Standard Chartered',CITI:'Citi Bank',AMEX:'American Express',RBL:'RBL Bank',BANDHAN:'Bandhan Bank',IOB:'Indian Overseas Bank',UCO:'UCO Bank',CENTRAL:'Central Bank of India',CBI:'Central Bank of India'};let bank=bankMap[Object.keys(bankMap).find(k=>(sender+' '+text).toUpperCase().includes(k))]||'Bank account';let merchantMatch=text.match(/(?:at|to|towards|info|vpa|spent on)\s+([a-z0-9 .&_-]+?)(?:\.|\s+(?:on|avl|ref|via|bal)\b|$)/i);let merchant=merchantMatch?merchantMatch[1].trim():'Bank transaction';let dateMatch=text.match(/(?:on)\s+(\d{1,2}[-\/]?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})[-\/]?\d{0,4})/i);let dateVal=dateMatch?dateMatch[1]:null;return {id:Date.now()+Math.random(),type:isDebit?'debit':'credit',amount:txAmount,note:merchant,account:findAccount(bank,last4),category:isDebit?'Other':'Transfer',date:localDate(dateVal?new Date(dateVal):today)};}
$('#smsForm').addEventListener('submit',e=>{e.preventDefault();let t=parseSMS(new FormData(e.target).get('sms'));if(!t){toast('Could not find an amount in that SMS');return}data.transactions.push(t);e.target.closest('dialog').close();e.target.reset();save();toast('SMS transaction added: '+money(t.amount));});
$('#budgetForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target),x={category:f.get('category'),limit:+f.get('limit')};data.budgets=data.budgets.filter(b=>b.category!==x.category);data.budgets.push(x);e.target.closest('dialog').close();save();toast('Budget saved');});
$('#recurringForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target);data.recurring.push({name:f.get('name'),type:f.get('type'),amount:+f.get('amount'),day:+f.get('day')});e.target.closest('dialog').close();e.target.reset();save();toast('Recurring payment saved');});
$('#accountForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target);findAccount(f.get('bank'),f.get('last4'));e.target.closest('dialog').close();e.target.reset();save();toast('Account saved');});
$('#savingsButton').onclick=()=>{$('#savingsForm').date.value=localDate(today);$('#savingsDialog').showModal()};
$('#savingType').onchange=e=>{let t=e.target.value;$('#savingAmountLabel').firstChild.textContent=(t==='rd'||t==='sip')?'Monthly deposit (₹) ':'Principal amount (₹) ';};
$('#savingsForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target);data.savings.push({id:Date.now(),type:f.get('type'),name:f.get('name'),amount:+f.get('amount'),rate:+f.get('rate'),tenure:+f.get('tenure'),date:f.get('date')});e.target.closest('dialog').close();e.target.reset();save();toast('Investment saved');});
['#monthPicker','#typeFilter','#categoryFilter'].forEach(s=>$(s).addEventListener('change',render));
function importSMSHistory(messages){let added=0;messages.forEach(m=>{let t=parseSMS(m);if(t&&!data.transactions.some(x=>x.amount===t.amount&&x.date===t.date&&x.account===t.account&&x.note===t.note)){data.transactions.push(t);added++}});save();toast(`${added} banking transactions imported`)}window.importSMSHistory=importSMSHistory;window.addEventListener('smsTransaction',e=>{let t=parseSMS(e.detail);if(t){data.transactions.push(t);save();toast('New SMS transaction added')}});if(window.LedgerCloud&&LedgerCloud.enabled()){$('#syncText').textContent='Connecting to Google Sheets…';LedgerCloud.load().then(r=>{if(r&&r.ok&&r.data&&r.data.transactions&&r.data.transactions.length){data=r.data;data.accounts=data.accounts||[];localStorage.setItem('pocket-ledger-v1',JSON.stringify(data));fillAccounts();render();$('#syncText').textContent='Synced with Google Sheets'}else{$('#syncText').textContent='Google Sheets backup enabled';LedgerCloud.push(data)}}).catch(()=>{$('#syncText').textContent='Sheet backup needs attention'})}if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');render();
