let categoryChart, timelineChart, isEditing = false, editIdx = null, selectedMonth;

document.addEventListener('DOMContentLoaded', () => {
  // ---- Title & Nav ----
  const titleEl = document.getElementById('appTitle');
  const secs = {
    add:        document.getElementById('sectionAdd'),
    timeline:   document.getElementById('sectionTimeline'),
    categories: document.getElementById('sectionCategories'),
    budget:     document.getElementById('sectionBudget'),
    settings:   document.getElementById('sectionSettings')
  };
  const navs = {
    add:        document.getElementById('navAdd'),
    timeline:   document.getElementById('navTimeline'),
    categories: document.getElementById('navCategories'),
    budget:     document.getElementById('navBudget'),
    settings:   document.getElementById('navSettings')
  };

  function updateTitle() {
    const [y,m] = selectedMonth.split('-'),
          dt    = new Date(y, m-1),
          month = dt.toLocaleString('default',{month:'long'});
    titleEl.textContent = `${month} Expenses`;
  }

  function hideAll() {
    Object.values(secs).forEach(s => s.classList.add('hidden'));
    Object.values(navs).forEach(b => b.classList.remove('active'));
  }
  function show(key) {
    hideAll();
    secs[key].classList.remove('hidden');
    navs[key].classList.add('active');
  }

  Object.entries(navs).forEach(([key,btn]) => 
    btn.addEventListener('click', () => {
      show(key);
      if (key==='add')        renderRecent();
      if (key==='timeline')   renderTimeline();
      if (key==='categories'){ renderCategoryList(); renderCategoryChart(); }
      if (key==='budget')     renderBudget();
      if (key==='settings')   renderSettings();
    })
  );
  show('add');

  // ---- Expense Form Refs ----
  const dateIn     = document.getElementById('date'),
        catSel     = document.getElementById('categorySelect'),
        subSel     = document.getElementById('subcategorySelect'),
        descIn     = document.getElementById('description'),
        amtIn      = document.getElementById('amount'),
        form       = document.getElementById('expenseForm'),
        btnSubmit  = document.getElementById('btnSubmitExpense'),
        btnCancel  = document.getElementById('btnCancelEdit'),
        btnNewCat  = document.getElementById('btnCreateCategory'),
        btnNewSub  = document.getElementById('btnCreateSubcategory'),
        recentTbody= document.querySelector('#recentTable tbody'),
        tlLabel    = document.getElementById('currentMonthTimeline'),
        monDisp    = document.getElementById('monthlyBudgetDisplay'),
        wkDisp     = document.getElementById('weeklyBudgetDisplay'),
        monBar     = document.getElementById('monthlyBar'),
        wkBar      = document.getElementById('weeklyBar'),
        monRem     = document.getElementById('monthlyRemaining'),
        wkRem      = document.getElementById('weeklyRemaining'),
        monIn      = document.getElementById('monthlyBudgetInput'),
        wkIn       = document.getElementById('weeklyBudgetInput'),
        saveBud    = document.getElementById('btnSaveBudgets'),
        viewMon    = document.getElementById('viewMonthSelect'),
        colList    = document.getElementById('categoryColorList'),
        saveCol    = document.getElementById('btnSaveColors'),
        catCtx     = document.getElementById('categoryChart').getContext('2d');

  // ---- Management UI Refs ----
  const catFormManage = document.getElementById('categoryForm'),
        newCatIn      = document.getElementById('newCategory'),
        catListManage = document.getElementById('categoryList'),
        catForSub     = document.getElementById('categorySelectForSub'),
        subFormManage = document.getElementById('subcategoryForm'),
        newSubIn      = document.getElementById('newSubcategory'),
        btnSubmitSub  = document.getElementById('btnSubmitSub'),
        subList       = document.getElementById('subcategoryList');

  // ---- Storage Defaults ----
  dateIn.value = new Date().toISOString().slice(0,10);
  if (!localStorage.categories)     localStorage.categories     = '[]';
  if (!localStorage.subcategories)  localStorage.subcategories  = '{}';
  if (!localStorage.categoryColors) localStorage.categoryColors = '{}';
  if (!localStorage.weeklyBudget)   localStorage.weeklyBudget   = 0;
  if (!localStorage.monthlyBudget)  localStorage.monthlyBudget  = 0;

  // ---- Month Picker ----
  viewMon.value   = new Date().toISOString().slice(0,7);
  selectedMonth   = viewMon.value;
  viewMon.addEventListener('change', () => {
    selectedMonth = viewMon.value;
    updateTitle();
    renderAll();
  });

  // ---- Category CRUD ----
  btnNewCat.addEventListener('click', () => show('settings'));
  catFormManage.addEventListener('submit', e => {
    e.preventDefault();
    const cats = JSON.parse(localStorage.categories);
    const c    = newCatIn.value.trim();
    if (c && !cats.includes(c)) {
      cats.push(c);
      localStorage.categories    = JSON.stringify(cats);
      const subs = JSON.parse(localStorage.subcategories);
      subs[c] = [];
      localStorage.subcategories = JSON.stringify(subs);
      renderAll();
    }
    newCatIn.value = '';
  });

  // ---- Subcategory CRUD ----
  newSubIn.disabled = true;
  btnSubmitSub.disabled = true;

  function renderCatsForSub() {
    catForSub.innerHTML = '<option disabled selected>Select category…</option>';
    JSON.parse(localStorage.categories).forEach(c => {
      const o = document.createElement('option');
      o.value = o.textContent = c;
      catForSub.append(o);
    });
  }

  function renderManageCatsList() {
    catListManage.innerHTML = '';
    const cats = JSON.parse(localStorage.categories),
          subs = JSON.parse(localStorage.subcategories);
    cats.forEach(c=>{
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${c}${subs[c].length?` (${subs[c].join(', ')})`:''}</span>
        <span>
          <button class="edit-cat" data-cat="${c}">✏️</button>
          <button class="del-cat"  data-cat="${c}">🗑️</button>
        </span>`;
      catListManage.append(li);
    });
  }

  catForSub.addEventListener('change', () => {
    newSubIn.disabled = false;
    btnSubmitSub.disabled = false;
    renderManageSubcats(catForSub.value);
  });

  subFormManage.addEventListener('submit', e => {
    e.preventDefault();
    const cat = catForSub.value, sc = newSubIn.value.trim();
    if (!cat||!sc) return;
    const subs = JSON.parse(localStorage.subcategories);
    subs[cat] = subs[cat]||[];
    if (!subs[cat].includes(sc)) {
      subs[cat].push(sc);
      localStorage.subcategories = JSON.stringify(subs);
    }
    newSubIn.value = '';
    renderManageSubcats(cat);
  });

  function renderManageSubcats(cat) {
    subList.innerHTML = '';
    (JSON.parse(localStorage.subcategories)[cat]||[]).forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${s}</span>
        <span>
          <button class="edit-sub" data-sub="${s}">✏️</button>
          <button class="del-sub"  data-sub="${s}">🗑️</button>
        </span>`;
      subList.append(li);
    });
  }

  catListManage.addEventListener('click', e => {
    if (e.target.matches('.edit-cat')) {
      const old = e.target.dataset.cat,
            upd = prompt('Rename category:', old);
      if (!upd) return;
      let cats = JSON.parse(localStorage.categories);
      cats[cats.indexOf(old)] = upd;
      localStorage.categories = JSON.stringify(cats);
      let subs = JSON.parse(localStorage.subcategories);
      subs[upd] = subs[old];
      delete subs[old];
      localStorage.subcategories = JSON.stringify(subs);
      renderAll();
    }
    if (e.target.matches('.del-cat')) {
      const cat = e.target.dataset.cat;
      if (!confirm(`Delete "${cat}"?`)) return;
      let cats = JSON.parse(localStorage.categories).filter(c=>c!==cat);
      localStorage.categories = JSON.stringify(cats);
      const subs = JSON.parse(localStorage.subcategories);
      delete subs[cat];
      localStorage.subcategories = JSON.stringify(subs);
      renderAll();
    }
  });

  subList.addEventListener('click', e => {
    const cat = catForSub.value;
    if (e.target.matches('.edit-sub')) {
      const old = e.target.dataset.sub,
            upd = prompt('Rename subcategory:', old);
      if (!upd) return;
      let subs = JSON.parse(localStorage.subcategories);
      const arr = subs[cat];
      arr[arr.indexOf(old)] = upd;
      localStorage.subcategories = JSON.stringify(subs);
      renderManageSubcats(cat);
    }
    if (e.target.matches('.del-sub')) {
      const s = e.target.dataset.sub;
      if (!confirm(`Delete "${s}"?`)) return;
      let subs = JSON.parse(localStorage.subcategories);
      subs[cat] = subs[cat].filter(x=>x!==s);
      localStorage.subcategories = JSON.stringify(subs);
      renderManageSubcats(cat);
    }
  });

  // ---- Expense Form: populate category & subcategory ----
  function renderExpenseCats() {
    catSel.innerHTML = '<option disabled selected>Select category</option>';
    JSON.parse(localStorage.categories).forEach(c => {
      const o = document.createElement('option');
      o.value = o.textContent = c;
      catSel.append(o);
    });
    renderExpenseSubcats();
  }
  function renderExpenseSubcats() {
    subSel.innerHTML = '<option disabled selected>Select subcategory</option>';
    const arr = JSON.parse(localStorage.subcategories)[catSel.value]||[];
    arr.forEach(s=>{
      const o = document.createElement('option');
      o.value = o.textContent = s;
      subSel.append(o);
    });
  }
  catSel.addEventListener('change', renderExpenseSubcats);

  btnCreateSub.addEventListener('click', ()=>{
    show('settings');
    catForSub.focus();
  });

  // ---- Expense CRUD ----
  form.addEventListener('submit', e => {
    e.preventDefault();
    const date = dateIn.value, cat = catSel.value, sub = subSel.value,
          desc = descIn.value.trim(), amt = parseFloat(amtIn.value);
    if (!date||!cat||!sub||!desc||isNaN(amt)) return alert('Fill all fields');
    const key = selectedMonth, arr = JSON.parse(localStorage[key]||'[]'),
          rec = { date, category:cat, subcategory:sub, desc, amt };
    if (isEditing) {
      arr[editIdx] = rec;
      isEditing = false;
      btnSubmit.textContent = 'Add';
      btnCancel.classList.add('hidden');
    } else arr.unshift(rec);
    localStorage[key] = JSON.stringify(arr);
    playBeep();
    form.reset();
    dateIn.value = new Date().toISOString().slice(0,10);
    renderRecent();
  });

  btnCancel.addEventListener('click', () => {
    isEditing = false; editIdx = null;
    btnSubmit.textContent = 'Add';
    btnCancel.classList.add('hidden');
    form.reset();
    dateIn.value = new Date().toISOString().slice(0,10);
  });

  // ---- Charts, Recent, Budget & Settings ----
  function playBeep(){
    try {
      const ctx=new (AudioContext||webkitAudioContext)(),
            o=ctx.createOscillator();
      o.connect(ctx.destination);
      o.start(); setTimeout(()=>o.stop(),100);
    } catch{}
  }

  function formatDate(d){ 
    const D=new Date(d), day=D.getDate(),
          suf=(day>3&&day<21)?'th':({1:'st',2:'nd',3:'rd'}[day%10]||'th'),
          m=D.toLocaleString('default',{month:'short'});
    return `${day}${suf} ${m}`;
  }

  function renderRecent(){
    const arr=JSON.parse(localStorage[selectedMonth]||'[]');
    recentTbody.innerHTML='';
    arr.slice(0,30).forEach((e,i)=>{
      const tr=document.createElement('tr');
      tr.classList.add('clickable-row');
      tr.innerHTML = `<td>${formatDate(e.date)}</td><td>${e.desc}</td><td>₹${Math.round(e.amt)}</td>`;
      tr.addEventListener('click',()=>{
        isEditing=true; editIdx=i;
        dateIn.value=e.date;
        catSel.value=e.category; renderExpenseSubcats();
        subSel.value=e.subcategory;
        descIn.value=e.desc;
        amtIn.value=e.amt;
        btnSubmit.textContent='Update';
        btnCancel.classList.remove('hidden');
        show('add');
      });
      recentTbody.append(tr);
    });
  }

  function renderTimeline(){
    const label=new Date(selectedMonth+'-01')
                  .toLocaleString('default',{month:'long','year':'numeric'});
    tlLabel.textContent=label;
    const data=JSON.parse(localStorage[selectedMonth]||'[]'), daily={};
    data.forEach(e=>daily[e.date]=(daily[e.date]||0)+e.amt);
    const dates=Object.keys(daily).sort(), vals=dates.map(d=>Math.round(daily[d])),
          ctx=document.getElementById('timelineChart').getContext('2d');
    if(timelineChart) timelineChart.destroy();
    timelineChart=new Chart(ctx,{
      type:'line',
      data:{labels:dates,datasets:[{label:'Spend',data:vals,fill:false,tension:0.2,borderWidth:2}]},
      options:{scales:{x:{title:{display:true,text:'Date'}},y:{title:{display:true,text:'₹'}}}}
    });
  }

  function renderCategoryChart(){
    const data=JSON.parse(localStorage[selectedMonth]||'[]'), totals={};
    data.forEach(e=>totals[e.category]=(totals[e.category]||0)+e.amt);
    const labels=Object.keys(totals),
          vals=labels.map(l=>Math.round(totals[l])),
          colors=labels.map((_,i)=>`hsl(${i*360/labels.length},60%,50%)`),
          ctx=catCtx;
    if(categoryChart) categoryChart.destroy();
    categoryChart=new Chart(ctx,{
      type:'doughnut',
      data:{labels,datasets:[{data:vals,backgroundColor:colors,hoverOffset:10}]},
      options:{
        cutout:'30%',
        plugins:{
          legend:{display:false},
          datalabels:{
            color:'#fff',
            formatter:(v,ctx)=>`${ctx.chart.data.labels[ctx.dataIndex]}: ${v}`,
            font:{weight:'bold',size:12}
          }
        }
      },
      plugins:[ ChartDataLabels ]
    });
  }

  function renderBudget(){
    const mb=+localStorage.monthlyBudget, wb=+localStorage.weeklyBudget,
          data=JSON.parse(localStorage[selectedMonth]||'[]'),
          spentM=data.reduce((s,e)=>s+e.amt,0),
          today=new Date().getDate(),
          wkIdx=Math.floor((today-1)/7)+1,
          spentW=data.filter(e=>Math.floor((+e.date.split('-')[2]-1)/7)+1===wkIdx).reduce((s,e)=>s+e.amt,0),
          pM=mb?Math.min(spentM/mb*100,100):0,
          pW=wb?Math.min(spentW/wb*100,100):0;
    monDisp.textContent=mb.toFixed(0);
    wkDisp.textContent=wb.toFixed(0);
    monBar.style.width=pM+'%';
    wkBar.style.width =pW+'%';
    monRem.textContent=`Remaining: ₹${Math.round(mb-spentM)}`;
    wkRem.textContent=`Remaining: ₹${Math.round(wb-spentW)}`;
  }

  function renderSettings(){
    monIn.value=localStorage.monthlyBudget;
    wkIn.value =localStorage.weeklyBudget;
    colList.innerHTML='';
    JSON.parse(localStorage.categories).forEach(c=>{
      const d=document.createElement('div');
      d.className='color-item';
      d.innerHTML=`
        <label>${c}</label>
        <input type="color" data-cat="${c}"
               value="${JSON.parse(localStorage.categoryColors)[c]||'#23b79b'}">
      `;
      colList.append(d);
    });
  }

  // ---- Render Everything ----
  function renderAll(){
    updateTitle();
    renderExpenseCats();
    renderRecent();
    renderTimeline();
    renderManageCatsList();
    renderCatsForSub();
    newSubIn.disabled=true; btnSubmitSub.disabled=true; subList.innerHTML='';
    renderCategoryChart();
    renderBudget();
    renderSettings();
  }
  renderAll();
});
