let categoryChartInstance = null;
let timelineChartInstance = null;

// Edit state
let isEditing = false, editKey = null, editIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  // ─── Element Refs ─────────────────────────────
  const nav = {
    add:        document.getElementById('nav-add'),
    preview:    document.getElementById('nav-preview'),
    timeline:   document.getElementById('nav-timeline'),
    categories: document.getElementById('nav-categories'),
    budget:     document.getElementById('nav-budget'),
    settings:   document.getElementById('nav-settings'),
  };
  const sections = {
    add:        document.getElementById('section-add'),
    preview:    document.getElementById('section-preview'),
    timeline:   document.getElementById('section-timeline'),
    categories: document.getElementById('section-categories'),
    budget:     document.getElementById('section-budget'),
    settings:   document.getElementById('section-settings'),
  };

  // Form & inputs
  const form         = document.getElementById('expenseForm');
  const dateInput    = document.getElementById('date');
  const catSelect    = document.getElementById('categorySelect');
  const descInput    = document.getElementById('description');
  const amtInput     = document.getElementById('amount');
  const submitBtn    = document.getElementById('btn-submit-expense');
  const cancelEdit   = document.getElementById('btn-cancel-edit');

  // Recent
  const recentTbody  = document.querySelector('#recentTable tbody');
  const btnViewAll   = document.getElementById('btn-view-all');

  // Preview
  const previewMonth = document.getElementById('currentMonth');
  const previewTbody = document.querySelector('#expensesTable tbody');
  const totalCell    = document.getElementById('totalAmount');

  // Timeline
  const tlMonthLbl   = document.getElementById('currentMonthTimeline');

  // Categories
  const catForm      = document.getElementById('categoryForm');
  const newCatInput  = document.getElementById('newCategory');
  const catList      = document.getElementById('categoryList');

  // Settings
  const monthlyInput = document.getElementById('monthlyBudgetInput');
  const weeklyInput  = document.getElementById('weeklyBudgetInput');
  const saveBudgets  = document.getElementById('btn-save-budgets');
  const colorListDiv = document.getElementById('categoryColorList');
  const saveColors   = document.getElementById('btn-save-colors');

  // Budget display
  const monthlyDisplay= document.getElementById('monthlyBudgetDisplay');
  const weeklyDisplay = document.getElementById('weeklyBudgetDisplay');
  const monthlyBar    = document.getElementById('monthlyBar');
  const weeklyBar     = document.getElementById('weeklyBar');
  const monthlyRemain = document.getElementById('monthlyRemaining');
  const weeklyRem     = document.getElementById('weeklyRemaining');

  // Init
  dateInput.value = new Date().toISOString().slice(0,10);
  setupBudgets();
  loadCategories();
  renderCategoryOptions();
  switchView('add');

  // ─── Navigation ──────────────────────────────────
  Object.keys(nav).forEach(k => {
    nav[k].onclick = () => switchView(k);
  });
  btnViewAll.onclick = () => switchView('preview');
  cancelEdit.onclick = () => {
    isEditing = false;
    submitBtn.textContent = 'Add Expense';
    cancelEdit.classList.add('hidden');
    form.reset();
    dateInput.value = new Date().toISOString().slice(0,10);
  };

  function switchView(view) {
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    Object.values(nav).forEach(b => b.classList.remove('active'));
    sections[view].classList.remove('hidden');
    nav[view].classList.add('active');

    if (view === 'add')        renderRecent();
    if (view === 'preview')    renderPreview();
    if (view === 'timeline')   renderTimeline();
    if (view === 'categories'){
      renderCategoryList();
      renderCategoryChart();
    }
    if (view === 'budget')     renderBudget();
    if (view === 'settings')   renderSettings();
  }

  // ─── Play Beep ────────────────────────────────────
  function playBeep() {
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = 440;
      o.connect(ctx.destination);
      o.start();
      setTimeout(()=>o.stop(), 100);
    } catch(e){}
  }

  // ─── Budgets ──────────────────────────────────────
  function setupBudgets() {
    if (!localStorage.weeklyBudget)  localStorage.weeklyBudget  = 0;
    if (!localStorage.monthlyBudget) localStorage.monthlyBudget = 0;
  }
  saveBudgets.onclick = () => {
    localStorage.monthlyBudget = parseFloat(monthlyInput.value)||0;
    localStorage.weeklyBudget  = parseFloat(weeklyInput.value)||0;
    alert('✅ Budgets saved');
    renderBudget();
  };
  function renderSettings() {
    monthlyInput.value = localStorage.monthlyBudget;
    weeklyInput.value  = localStorage.weeklyBudget;
    // category colors
    colorListDiv.innerHTML = '';
    const cats = JSON.parse(localStorage.categories||'[]');
    const colors = JSON.parse(localStorage.categoryColors||'{}');
    cats.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'color-item';
      div.innerHTML = `
        <label>${cat}</label>
        <input type="color" data-cat="${cat}" value="${colors[cat]||'#23b79b'}">
      `;
      colorListDiv.appendChild(div);
    });
  }
  saveColors.onclick = () => {
    const inputs = colorListDiv.querySelectorAll('input[type=color]');
    const mapping = {};
    inputs.forEach(inp => mapping[inp.dataset.cat] = inp.value);
    localStorage.categoryColors = JSON.stringify(mapping);
    alert('✅ Colors saved');
    renderCategoryOptions();
    renderCategoryList();
    renderCategoryChart();
  };

  // ─── Categories ───────────────────────────────────
  function loadCategories() {
    if (!localStorage.categories) localStorage.categories = JSON.stringify([]);
  }
  catForm.onsubmit = e => {
    e.preventDefault();
    const c = newCatInput.value.trim();
    if (!c) return;
    const cats = JSON.parse(localStorage.categories);
    if (!cats.includes(c)) {
      cats.push(c);
      localStorage.categories = JSON.stringify(cats);
    }
    newCatInput.value = '';
    renderCategoryOptions();
    renderCategoryList();
  };
  function renderCategoryOptions() {
    const cats = JSON.parse(localStorage.categories||'[]');
    const colors = JSON.parse(localStorage.categoryColors||'{}');
    catSelect.innerHTML = '<option value="" disabled selected>Select category</option>';
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (colors[cat]) opt.style.color = colors[cat];
      catSelect.appendChild(opt);
    });
  }
  function renderCategoryList() {
    catList.innerHTML = '';
    const cats = JSON.parse(localStorage.categories||'[]');
    const colors = JSON.parse(localStorage.categoryColors||'{}');
    cats.forEach(cat => {
      const li = document.createElement('li');
      li.textContent = cat;
      if (colors[cat]) li.style.color = colors[cat];
      catList.appendChild(li);
    });
  }

  // ─── Add / Edit Expense ────────────────────────────
  form.onsubmit = e => {
    e.preventDefault();
    const date     = dateInput.value;
    const cat      = catSelect.value;
    const desc     = descInput.value.trim();
    const amt      = parseFloat(amtInput.value);
    if (!date||!cat||!desc||isNaN(amt)) {
      return alert('Please fill all fields.');
    }
    const key = date.slice(0,7);
    const arr = JSON.parse(localStorage[key]||'[]');
    if (isEditing) {
      arr[editIndex] = { date, category:cat, desc, amt };
      isEditing = false;
      submitBtn.textContent = 'Add Expense';
      cancelEdit.classList.add('hidden');
    } else {
      arr.unshift({ date, category:cat, desc, amt });
    }
    localStorage[key] = JSON.stringify(arr);
    form.reset();
    dateInput.value = new Date().toISOString().slice(0,10);
    playBeep();
    switchView('add');
  };

  // ─── Recent Expenses ───────────────────────────────
  function renderRecent() {
    // gather all entries across months
    const all = [];
    Object.keys(localStorage).forEach(k => {
      if (/^\d{4}-\d{2}$/.test(k)) {
        JSON.parse(localStorage[k]).forEach(e => all.push(e));
      }
    });
    // sort desc by date
    all.sort((a,b)=> b.date.localeCompare(a.date));
    const recent = all.slice(0,30);
    const colors = JSON.parse(localStorage.categoryColors||'{}');
    recentTbody.innerHTML = '';
    recent.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.date}</td>
        <td style="color:${colors[e.category]||'#000'}">${e.category[0]}</td>
        <td>${e.desc}</td>
        <td>₹${e.amt.toFixed(2)}</td>
      `;
      recentTbody.appendChild(tr);
    });
  }

  // ─── Preview All ───────────────────────────────────
  function renderPreview() {
    const key = new Date().toISOString().slice(0,7);
    const data = JSON.parse(localStorage[key]||'[]');
    previewMonth.textContent = key;
    previewTbody.innerHTML = '';
    let total = 0;
    const colors = JSON.parse(localStorage.categoryColors||'{}');
    data.forEach((e,i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.date}</td>
        <td style="background:${colors[e.category]||'#fff'}">${e.category}</td>
        <td>${e.desc}</td>
        <td>₹${e.amt.toFixed(2)}</td>
        <td><button class="edit-btn" data-i="${i}">Edit</button></td>
      `;
      previewTbody.appendChild(tr);
      total += e.amt;
    });
    totalCell.textContent = `₹${total.toFixed(2)}`;
    // edit handlers
    Array.from(document.querySelectorAll('.edit-btn')).forEach(btn=>{
      btn.onclick = () => {
        editIndex = +btn.dataset.i;
        editKey = key;
        const entry = JSON.parse(localStorage[key])[editIndex];
        dateInput.value      = entry.date;
        catSelect.value      = entry.category;
        descInput.value      = entry.desc;
        amtInput.value       = entry.amt;
        isEditing = true;
        submitBtn.textContent= 'Update Expense';
        cancelEdit.classList.remove('hidden');
        switchView('add');
      };
    });
  }

  // ─── Timeline Chart ───────────────────────────────
  function renderTimeline() {
    const key = new Date().toISOString().slice(0,7);
    tlMonthLbl.textContent = key;
    const data = JSON.parse(localStorage[key]||'[]');
    const daily = {};
    data.forEach(e=> daily[e.date]=(daily[e.date]||0)+e.amt );
    drawTimelineChart(daily);
  }

  // ─── Category Pie Chart ───────────────────────────
  function renderCategoryChart() {
    const key = new Date().toISOString().slice(0,7);
    const data = JSON.parse(localStorage[key]||'[]');
    const totals = {};
    data.forEach(e=> totals[e.category]=(totals[e.category]||0)+e.amt );
    drawCategoryChart(totals);
  }

  // ─── Budget ───────────────────────────────────────
  function renderBudget() {
    const mb = +localStorage.monthlyBudget||0;
    const wb = +localStorage.weeklyBudget||0;
    monthlyDisplay.textContent = mb.toFixed(2);
    weeklyDisplay.textContent  = wb.toFixed(2);
    // spent this month
    const key = new Date().toISOString().slice(0,7);
    const data = JSON.parse(localStorage[key]||'[]');
    const mSpent = data.reduce((s,e)=>s+e.amt,0);
    const today = new Date().getDate();
    const wk = Math.floor((today-1)/7)+1;
    const wSpent = data.filter(e=>
      Math.floor((+e.date.split('-')[2]-1)/7)+1===wk
    ).reduce((s,e)=>s+e.amt,0);
    const mPct = mb?Math.min(mSpent/mb*100,100):0;
    const wPct = wb?Math.min(wSpent/wb*100,100):0;
    monthlyBar.style.width = mPct+'%';
    weeklyBar.style.width  = wPct+'%';
    monthlyRemain.textContent = `Remaining: ₹${(mb-mSpent).toFixed(2)}`;
    weeklyRem.textContent     = `Remaining: ₹${(wb-wSpent).toFixed(2)}`;
  }

  // ─── Drawing Charts ───────────────────────────────
  function drawCategoryChart(totals) {
    const labels = Object.keys(totals);
    const vals   = labels.map(l=>totals[l]);
    const stored = JSON.parse(localStorage.categoryColors||'{}');
    const colors = labels.map(l=>stored[l]||`hsl(${Math.random()*360},60%,60%)`);
    const ctx    = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctx,{type:'pie',
      data:{labels,datasets:[{data:vals,backgroundColor:colors}]},
      options:{plugins:{legend:{position:'bottom',labels:{generateLabels:ch=>
        ch.data.labels.map((label,i)=>({
          text:`${label}: ₹${ch.data.datasets[0].data[i].toFixed(2)}`,
          fillStyle:ch.data.datasets[0].backgroundColor[i]
        }))
      }},tooltip:{callbacks:{label(ct)=>`${ct.label}: ₹${ct.raw.toFixed(2)}`}}}}
    });
  }

  function drawTimelineChart(daily) {
    const dates = Object.keys(daily).sort();
    const vals  = dates.map(d=>daily[d]);
    const ctx   = document.getElementById('timelineChart').getContext('2d');
    if (timelineChartInstance) timelineChartInstance.destroy();
    timelineChartInstance = new Chart(ctx,{type:'line',
      data:{labels:dates,datasets:[{label:'Daily Spend',data:vals,fill:false,tension:0.2,borderWidth:2}]},
      options:{scales:{x:{title:{display:true,text:'Date'}},y:{title:{display:true,text:'₹'}}}}
    });
  }
});
