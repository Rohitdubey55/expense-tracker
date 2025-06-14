// script.js
// ──────────────────────────────────────────────────────────────────────────────
// Register DataLabels plugin
Chart.register(ChartDataLabels);

let categoryChart, timelineChart;
let isEditing = false, editIdx = null, selectedMonth;

document.addEventListener('DOMContentLoaded', () => {
  // ─ ELEMENT REFERENCES ────────────────────────────────────────────────────────
  const sections = {
    add:        document.getElementById('sectionAdd'),
    timeline:   document.getElementById('sectionTimeline'),
    categories: document.getElementById('sectionCategories'),
    budget:     document.getElementById('sectionBudget'),
    settings:   document.getElementById('sectionSettings'),
  };
  const navButtons = {
    add:        document.getElementById('navAdd'),
    timeline:   document.getElementById('navTimeline'),
    categories: document.getElementById('navCategories'),
    budget:     document.getElementById('navBudget'),
    settings:   document.getElementById('navSettings'),
  };

  // Add Expense form
  const dateIn        = document.getElementById('date');
  const categorySelect   = document.getElementById('categorySelect');
  const subcategorySelect = document.getElementById('subcategorySelect');
  const descriptionIn = document.getElementById('description');
  const amountIn      = document.getElementById('amount');
  const expenseForm   = document.getElementById('expenseForm');
  const btnSubmitExpense = document.getElementById('btnSubmitExpense');
  const btnCancelEdit = document.getElementById('btnCancelEdit');
  const recentTableBody = document.querySelector('#recentTable tbody');

  // Timeline
  const currentMonthTimeline = document.getElementById('currentMonthTimeline');
  const filterStartInput     = document.getElementById('filterStart');
  const filterEndInput       = document.getElementById('filterEnd');
  const btnApplyFilter       = document.getElementById('applyFilter');

  // Category / Subcategory management
  const btnCreateCategory    = document.getElementById('btnCreateCategory');
  const categoryForm         = document.getElementById('categoryForm');
  const newCategoryInput     = document.getElementById('newCategory');
  const categoryList         = document.getElementById('categoryList');

  const categorySelectForSub = document.getElementById('categorySelectForSub');
  const subcategoryForm      = document.getElementById('subcategoryForm');
  const newSubcategoryInput  = document.getElementById('newSubcategory');
  const btnSubmitSubcategory = document.getElementById('btnSubmitSub');
  const subcategoryList      = document.getElementById('subcategoryList');

  // Charts
  const catChartCtx = document.getElementById('categoryChart').getContext('2d');

  // Budget & Settings
  const monthlyBudgetDisplay = document.getElementById('monthlyBudgetDisplay');
  const weeklyBudgetDisplay  = document.getElementById('weeklyBudgetDisplay');
  const monthlyBar           = document.getElementById('monthlyBar');
  const weeklyBar            = document.getElementById('weeklyBar');
  const monthlyRemaining     = document.getElementById('monthlyRemaining');
  const weeklyRemaining      = document.getElementById('weeklyRemaining');
  const monthlyBudgetInput   = document.getElementById('monthlyBudgetInput');
  const weeklyBudgetInput    = document.getElementById('weeklyBudgetInput');
  const btnSaveBudgets       = document.getElementById('btnSaveBudgets');
  const viewMonthSelect      = document.getElementById('viewMonthSelect');
  const categoryColorList    = document.getElementById('categoryColorList');
  const btnSaveColors        = document.getElementById('btnSaveColors');
  const btnResetAllData      = document.getElementById('btnResetAll');

  // ─ INITIAL LOCALSTORAGE DEFAULTS ─────────────────────────────────────────────
  dateIn.value = new Date().toISOString().slice(0,10);
  localStorage.categories     ||= '[]';
  localStorage.subcategories  ||= '{}';
  localStorage.categoryColors ||= '{}';
  localStorage.weeklyBudget   ||= '0';
  localStorage.monthlyBudget  ||= '0';

  // ─ SECTION NAVIGATION ─────────────────────────────────────────────────────────
  function hideAllSections() {
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    Object.values(navButtons).forEach(b => b.classList.remove('active'));
  }
  function showSection(key) {
    hideAllSections();
    sections[key].classList.remove('hidden');
    navButtons[key].classList.add('active');
    onSectionShow(key);
  }
  Object.entries(navButtons).forEach(([key, btn])=>{
    btn.addEventListener('click', ()=> showSection(key));
  });
  // start on "Add"
  showSection('add');

  function onSectionShow(key) {
    switch(key) {
      case 'add':
        renderCategoryDropdown();
        renderRecentExpenses();
        break;
      case 'timeline':
        initTimelineFilters();
        renderTimelineChart();
        break;
     case 'categories':
  renderCategoryList();
  renderCatsForSub();
  renderManageSubcats(
    categorySelectForSub.value ||
    JSON.parse(localStorage.categories)[0] ||
    ''
  );
  renderCategoryChart();
  break;

      case 'budget':
        renderBudgetOverview();
        break;
      case 'settings':
        renderSettingsPanel();
        break;
    }
  }

  // ─ MONTH PICKER ────────────────────────────────────────────────────────────────
  selectedMonth = viewMonthSelect.value = new Date().toISOString().slice(0,7);
  viewMonthSelect.addEventListener('change', () => {
    selectedMonth = viewMonthSelect.value;
    updateHeaderTitle();
    renderAll();
  });
  function updateHeaderTitle() {
    const [y,m] = selectedMonth.split('-');
    const dt    = new Date(y, m-1);
    const mon   = dt.toLocaleString('default',{ month:'long' });
    document.getElementById('appTitle').textContent = `${mon} Expenses`;
  }

  // ─ UTILITIES ─────────────────────────────────────────────────────────────────
  function formatDateString(d) {
    const D = new Date(d),
          day = D.getDate(),
          suf = (day>3&&day<21)?'th':({1:'st',2:'nd',3:'rd'}[day%10]||'th'),
          mon = D.toLocaleString('default',{month:'short'});
    return `${day}${suf} ${mon}`;
  }
  function playBeep() {
    try {
      const ctx = new (AudioContext||webkitAudioContext)(),
            osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.start(); setTimeout(()=>osc.stop(),100);
    } catch{}
  }

  // ─ ADD / EDIT EXPENSE ─────────────────────────────────────────────────────────
  expenseForm.addEventListener('submit', e=>{
    e.preventDefault();
    const date = dateIn.value,
          cat  = categorySelect.value,
          sub  = subcategorySelect.value,
          desc = descriptionIn.value.trim(),
          amt  = parseFloat(amountIn.value);

    if (!date||!cat||!sub||!desc||isNaN(amt)) {
      return alert('🚨 Please fill all fields');
    }

    const key = selectedMonth;
    const arr = JSON.parse(localStorage[key]||'[]');
    const rec = { date, category:cat, subcategory:sub, desc, amt };

    if (isEditing) {
      arr[editIdx] = rec;
      isEditing = false;
      btnSubmitExpense.textContent = 'Add';
      btnCancelEdit.classList.add('hidden');
      alert('✅ Expense updated');
    } else {
      arr.unshift(rec);
      alert('✅ Expense added');
    }

    localStorage[key] = JSON.stringify(arr);
    playBeep();
    expenseForm.reset();
    dateIn.value = new Date().toISOString().slice(0,10);
    renderCategoryDropdown();
    renderRecentExpenses();
  });

  btnCancelEdit.addEventListener('click', ()=>{
    isEditing = false; editIdx = null;
    btnSubmitExpense.textContent = 'Add';
    btnCancelEdit.classList.add('hidden');
    expenseForm.reset();
    dateIn.value = new Date().toISOString().slice(0,10);
  });

  // ─ RENDER EXPENSE DROPDOWNS & LIST ────────────────────────────────────────────
  function renderCategoryDropdown() {
    categorySelect.innerHTML = '<option disabled selected>Select category</option>';
    JSON.parse(localStorage.categories).forEach(c => {
      const o = document.createElement('option');
      o.value = o.textContent = c;
      categorySelect.append(o);
    });
    renderSubcategoryDropdown();
  }
  function renderSubcategoryDropdown() {
    subcategorySelect.innerHTML = '<option disabled selected>Select subcategory</option>';
    (JSON.parse(localStorage.subcategories)[categorySelect.value]||[])
      .forEach(s=>{
        const o = document.createElement('option');
        o.value = o.textContent = s;
        subcategorySelect.append(o);
      });
  }
  categorySelect.addEventListener('change', renderSubcategoryDropdown);

  function renderRecentExpenses() {
    const arr = JSON.parse(localStorage[selectedMonth]||'[]');
    recentTableBody.innerHTML = '';
    arr.slice(0,30).forEach((e,i)=>{
      const tr = document.createElement('tr');
      tr.classList.add('clickable-row');
      tr.innerHTML = `
        <td>${formatDateString(e.date)}</td>
        <td>${e.desc}</td>
        <td>₹${Math.round(e.amt)}</td>`;
      tr.addEventListener('click', ()=>{
        isEditing = true; editIdx = i;
        dateIn.value              = e.date;
        categorySelect.value      = e.category;
        renderSubcategoryDropdown();
        subcategorySelect.value   = e.subcategory;
        descriptionIn.value       = e.desc;
        amountIn.value            = e.amt;
        btnSubmitExpense.textContent = 'Update';
        btnCancelEdit.classList.remove('hidden');
        showSection('add');
      });
      recentTableBody.append(tr);
    });
  }

  // ─ TIMELINE CHART ─────────────────────────────────────────────────────────────
  btnApplyFilter.addEventListener('click', ()=>{
    renderTimelineChart(filterStartInput.value, filterEndInput.value);
  });
  function initTimelineFilters() {
    filterStartInput.value = `${selectedMonth}-01`;
    const [y,m] = selectedMonth.split('-').map(Number);
    const last = new Date(y,m,0).getDate();
    filterEndInput.value = `${selectedMonth}-${String(last).padStart(2,'0')}`;
  }
  function renderTimelineChart(start, end) {
    if (!start||!end) {
      initTimelineFilters();
      start = filterStartInput.value;
      end   = filterEndInput.value;
    }
    currentMonthTimeline.textContent = `${start} → ${end}`;

    const dataArr = JSON.parse(localStorage[selectedMonth]||'[]')
                    .filter(r=>r.date>=start && r.date<=end);
    const daily = {};
    dataArr.forEach(r=> daily[r.date] = (daily[r.date]||0)+r.amt);

    const labels = Object.keys(daily).sort();
    const vals   = labels.map(d=>Math.round(daily[d]));
    const ctx    = document.getElementById('timelineChart').getContext('2d');
    const grad   = ctx.createLinearGradient(0,0,0,200);
    grad.addColorStop(0,'rgba(35,183,155,0.4)');
    grad.addColorStop(1,'rgba(35,183,155,0)');

    if (timelineChart) timelineChart.destroy();
    timelineChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets:[{
        data: vals,
        fill: true,
        backgroundColor: grad,
        borderColor: '#23b79b',
        tension: 0.3,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#23b79b',
        pointHoverRadius: 6
      }]},
      options: {
        plugins: {
          legend:{display:false},
          tooltip:{
            backgroundColor:'#fff',
            titleColor:'#333',
            bodyColor:'#333',
            borderColor:'#ddd',
            borderWidth:1,
            padding:6,
            titleFont:{weight:'bold'}
          }
        },
        scales:{
          x:{grid:{color:'rgba(0,0,0,0.05)',drawBorder:false},ticks:{color:'#555'}},
          y:{grid:{color:'rgba(0,0,0,0.05)',drawBorder:false},
             ticks:{color:'#555',callback:v=>`₹${v}`}}
        },
        layout:{padding:10},
        maintainAspectRatio:false
      }
    });
  }

  // ─ CATEGORY MANAGEMENT ────────────────────────────────────────────────────────
  btnCreateCategory.addEventListener('click', ()=> showSection('settings'));
  categoryForm.addEventListener('submit', e=>{
    e.preventDefault();
    const cats = JSON.parse(localStorage.categories);
    const c    = newCategoryInput.value.trim();
    if (c && !cats.includes(c)) {
      cats.push(c);
      localStorage.categories = JSON.stringify(cats);
      const subs = JSON.parse(localStorage.subcategories);
      subs[c] = [];
      localStorage.subcategories = JSON.stringify(subs);
      alert('✅ Category created');
      renderAll();
    }
    newCategoryInput.value = '';
  });

  // Subcategory
  // newSubcategoryInput.disabled = btnSubmitSubcategory.disabled = true;
  categorySelectForSub.addEventListener('change', ()=>{
    renderManageSubcats(categorySelectForSub.value);
    newSubcategoryInput.disabled = btnSubmitSubcategory.disabled = false;
  });
 subcategoryForm.addEventListener('submit', e => {
  e.preventDefault();
  const cat = categorySelectForSub.value;
  const sc  = newSubcategoryInput.value.trim();

  if (!cat) return alert('🚨 Please select a category first');
  if (!sc ) return alert('🚨 Please enter a subcategory name');

  const subs = JSON.parse(localStorage.subcategories);
  subs[cat] = subs[cat] || [];
  if (!subs[cat].includes(sc)) {
    subs[cat].push(sc);
    localStorage.subcategories = JSON.stringify(subs);
    alert('✅ Subcategory created');
    renderSubcategoryControls(cat);   // re‐draw your UI under “Categories”
  }
  newSubcategoryInput.value = '';     // clear input
});

  // edit / delete
  categoryList.addEventListener('click', e=>{
    if (e.target.matches('.edit-cat')) {
      const old = e.target.dataset.cat;
      const up  = prompt('Rename category:', old);
      if (!up) return;
      let cats = JSON.parse(localStorage.categories);
      cats[cats.indexOf(old)] = up;
      localStorage.categories = JSON.stringify(cats);
      let subs = JSON.parse(localStorage.subcategories);
      subs[up] = subs[old];
      delete subs[old];
      localStorage.subcategories = JSON.stringify(subs);
      alert('✅ Category renamed');
      renderAll();
    }
    if (e.target.matches('.del-cat')) {
      const cat = e.target.dataset.cat;
      if (!confirm(`Delete "${cat}"?`)) return;
      let cats = JSON.parse(localStorage.categories).filter(x=>x!==cat);
      localStorage.categories = JSON.stringify(cats);
      let subs = JSON.parse(localStorage.subcategories);
      delete subs[cat];
      localStorage.subcategories = JSON.stringify(subs);
      alert('✅ Category deleted');
      renderAll();
    }
  });

  // helper to show subcats under management
  function renderManageSubcats(cat) {
    subcategoryList.innerHTML = '';
    (JSON.parse(localStorage.subcategories)[cat]||[])
      .forEach(s=>{
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${s}</span>
          <span>
            <button class="edit-sub" data-sub="${s}">✏️</button>
            <button class="del-sub"  data-sub="${s}">🗑️</button>
          </span>`;
        subcategoryList.append(li);
      });
  }

function renderCategoryList() {
  categoryList.innerHTML = '';
  const cats = JSON.parse(localStorage.categories),
        subs = JSON.parse(localStorage.subcategories),
        colors = JSON.parse(localStorage.categoryColors);

  cats.forEach(c => {
    const li = document.createElement('li');
    const color = colors[c] || '#23b79b';
    li.innerHTML = `
      <span class="cat-label">
        <span class="color-box" style="background-color:${color}"></span>
        ${c}${subs[c].length ? ` (${subs[c].join(', ')})` : ''}
      </span>
      <span>
        <button class="edit-cat" data-cat="${c}">✏️</button>
        <button class="del-cat"  data-cat="${c}">🗑️</button>
      </span>
    `;
    categoryList.append(li);
  });
}
  
  function renderCatsForSub() {
  categorySelectForSub.innerHTML = '<option disabled selected>Select category…</option>';
  JSON.parse(localStorage.categories).forEach(c => {
    const o = document.createElement('option');
    o.value = o.textContent = c;
    categorySelectForSub.append(o);
  });
}

  // ─ CATEGORY CHART ─────────────────────────────────────────────────────────────
  function renderCategoryChart() {
    const dataArr = JSON.parse(localStorage[selectedMonth]||'[]');
    const totals  = {};
    dataArr.forEach(r=> totals[r.category] = (totals[r.category]||0) + r.amt);

    const labels = Object.keys(totals);
    const vals   = labels.map(l=>Math.round(totals[l]));
    const cols   = labels.map((_,i)=>`hsl(${i*360/labels.length},60%,50%)`);

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(catChartCtx, {
      type: 'doughnut',
      data: { labels, datasets:[{ data: vals, backgroundColor: cols, hoverOffset:10 }]},
      options:{
        cutout: '40%',
        plugins:{
          legend:{ position:'bottom' },
          datalabels:{
            color:'#fff',
            formatter:(v,ctx)=>`${ctx.chart.data.labels[ctx.dataIndex]}: ₹${v}`,
            font:{ weight:'bold', size:12 }
          }
        },
        maintainAspectRatio:false,
        layout:{ padding:10 }
      }
    });
  }

  // ─ BUDGET OVERVIEW ────────────────────────────────────────────────────────────
  btnSaveBudgets.addEventListener('click', ()=>{
    localStorage.monthlyBudget = +monthlyBudgetInput.value||0;
    localStorage.weeklyBudget  = +weeklyBudgetInput.value||0;
    alert('✅ Budgets saved');
    renderBudgetOverview();
  });
  btnSaveColors.addEventListener('click', ()=>{
    const map = {};
    categoryColorList.querySelectorAll('input[type=color]').forEach(el=>{
      map[el.dataset.cat] = el.value;
    });
    localStorage.categoryColors = JSON.stringify(map);
    alert('✅ Colors saved');
    renderAll();
  });
  btnResetAllData.addEventListener('click', ()=>{
    if (!confirm('⚠️ Erase all data forever?')) return;
    localStorage.clear();
    localStorage.categories     = '[]';
    localStorage.subcategories  = '{}';
    localStorage.categoryColors = '{}';
    localStorage.weeklyBudget   = '0';
    localStorage.monthlyBudget  = '0';
    selectedMonth = new Date().toISOString().slice(0,7);
    viewMonthSelect.value = selectedMonth;
    alert('✅ All data reset');
    renderAll();
  });

  function renderBudgetOverview() {
    const mb   = +localStorage.monthlyBudget,
          wb   = +localStorage.weeklyBudget,
          data = JSON.parse(localStorage[selectedMonth]||'[]'),
          spentM = data.reduce((s,r)=>s+r.amt,0),
          today  = new Date().getDate(),
          wkIdx  = Math.floor((today-1)/7)+1,
          spentW = data.filter(r=>Math.floor((+r.date.split('-')[2]-1)/7)+1===wkIdx)
                       .reduce((s,r)=>s+r.amt,0),
          pM     = mb?Math.min(spentM/mb*100,100):0,
          pW     = wb?Math.min(spentW/wb*100,100):0;
    monthlyBudgetDisplay.textContent = mb.toFixed(0);
    weeklyBudgetDisplay.textContent  = wb.toFixed(0);
    monthlyBar.style.width = `${pM}%`;
    weeklyBar.style.width  = `${pW}%`;
    monthlyRemaining.textContent = `Remaining: ₹${Math.round(mb - spentM)}`;
    weeklyRemaining.textContent  = `Remaining: ₹${Math.round(wb - spentW)}`;
  }

  // ─ SETTINGS PANEL ────────────────────────────────────────────────────────────
  function renderSettingsPanel() {
  monthlyBudgetInput.value = localStorage.monthlyBudget;
  weeklyBudgetInput.value  = localStorage.weeklyBudget;
  categoryColorList.innerHTML = '';
  JSON.parse(localStorage.categories).forEach(c=>{
    const d = document.createElement('div');
    d.className = 'color-item';
    const col = JSON.parse(localStorage.categoryColors)[c] || '#23b79b';
    d.innerHTML = `
      <span class="color-box" style="background-color:${col}"></span>
      <label>${c}</label>
      <input type="color" data-cat="${c}" value="${col}">
    `;
    categoryColorList.append(d);
  });
}

  // ─ RENDER ALL ────────────────────────────────────────────────────────────────
  function renderAll() {
    updateHeaderTitle();
    renderCategoryDropdown();
    renderRecentExpenses();
    initTimelineFilters();
    renderTimelineChart();
    renderCategoryList();
    renderManageSubcats(categorySelectForSub.value || JSON.parse(localStorage.categories)[0] || '');
    renderCategoryChart();
    renderBudgetOverview();
    renderSettingsPanel();
  }

  // initial draw
  renderAll();
});
