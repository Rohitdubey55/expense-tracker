let categoryChartInstance, timelineChartInstance;
let isEditing = false, editIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  // NAV BUTTONS & SECTIONS
  const navAdd        = document.getElementById('navAdd');
  const navTimeline   = document.getElementById('navTimeline');
  const navCategories = document.getElementById('navCategories');
  const navBudget     = document.getElementById('navBudget');
  const navSettings   = document.getElementById('navSettings');

  const sectionAdd        = document.getElementById('sectionAdd');
  const sectionTimeline   = document.getElementById('sectionTimeline');
  const sectionCategories = document.getElementById('sectionCategories');
  const sectionBudget     = document.getElementById('sectionBudget');
  const sectionSettings   = document.getElementById('sectionSettings');

  function hideAll() {
    [sectionAdd, sectionTimeline, sectionCategories, sectionBudget, sectionSettings]
      .forEach(s => s.classList.add('hidden'));
  }
  function clearActive() {
    [navAdd, navTimeline, navCategories, navBudget, navSettings]
      .forEach(b => b.classList.remove('active'));
  }

  navAdd.addEventListener('click', () => {
    hideAll(); sectionAdd.classList.remove('hidden');
    clearActive(); navAdd.classList.add('active');
    renderRecent();
  });
  navTimeline.addEventListener('click', () => {
    hideAll(); sectionTimeline.classList.remove('hidden');
    clearActive(); navTimeline.classList.add('active');
    renderTimeline();
  });
  navCategories.addEventListener('click', () => {
    hideAll(); sectionCategories.classList.remove('hidden');
    clearActive(); navCategories.classList.add('active');
    renderCategoryList(); renderCategoryChart();
  });
  navBudget.addEventListener('click', () => {
    hideAll(); sectionBudget.classList.remove('hidden');
    clearActive(); navBudget.classList.add('active');
    renderBudget();
  });
  navSettings.addEventListener('click', () => {
    hideAll(); sectionSettings.classList.remove('hidden');
    clearActive(); navSettings.classList.add('active');
    renderSettings();
  });

  // initial view
  navAdd.click();

  // ELEMENT REFS
  const dateInput    = document.getElementById('date');
  const catSelect    = document.getElementById('categorySelect');
  const descInput    = document.getElementById('description');
  const amtInput     = document.getElementById('amount');
  const submitBtn    = document.getElementById('btnSubmitExpense');
  const cancelBtn    = document.getElementById('btnCancelEdit');
  const createCatBtn = document.getElementById('btnCreateCategory');
  const recentTbody  = document.querySelector('#recentTable tbody');
  const tlMonthLbl   = document.getElementById('currentMonthTimeline');
  const catForm      = document.getElementById('categoryForm');
  const newCatInput  = document.getElementById('newCategory');
  const catList      = document.getElementById('categoryList');
  const catCtx       = document.getElementById('categoryChart').getContext('2d');

  const monthlyDisp  = document.getElementById('monthlyBudgetDisplay');
  const weeklyDisp   = document.getElementById('weeklyBudgetDisplay');
  const monthlyBar   = document.getElementById('monthlyBar');
  const weeklyBar    = document.getElementById('weeklyBar');
  const monthlyRem   = document.getElementById('monthlyRemaining');
  const weeklyRem    = document.getElementById('weeklyRemaining');
  const monthInput   = document.getElementById('monthlyBudgetInput');
  const weekInput    = document.getElementById('weeklyBudgetInput');
  const saveBudgets  = document.getElementById('btnSaveBudgets');
  const colorListDiv = document.getElementById('categoryColorList');
  const saveColors   = document.getElementById('btnSaveColors');

  // INITIAL STORAGE SETUP
  dateInput.value = new Date().toISOString().slice(0,10);
  if (!localStorage.categories)     localStorage.categories     = '[]';
  if (!localStorage.categoryColors) localStorage.categoryColors = '{}';
  if (!localStorage.weeklyBudget)   localStorage.weeklyBudget   = 0;
  if (!localStorage.monthlyBudget)  localStorage.monthlyBudget  = 0;
  renderCategoryOptions();

  // CREATE CATEGORY
  catForm.addEventListener('submit', e => {
    e.preventDefault();
    const cats = JSON.parse(localStorage.categories);
    const c = newCatInput.value.trim();
    if (c && !cats.includes(c)) {
      cats.push(c);
      localStorage.categories = JSON.stringify(cats);
      renderCategoryOptions(); renderCategoryList();
    }
    newCatInput.value = '';
  });
  createCatBtn.addEventListener('click', () =>
    navSettings.click()
  );

  // ADD / EDIT EXPENSE
  document.getElementById('expenseForm').addEventListener('submit', e => {
    e.preventDefault();
    const date = dateInput.value,
          cat  = catSelect.value,
          desc = descInput.value.trim(),
          amt  = parseFloat(amtInput.value);
    if (!date||!cat||!desc||isNaN(amt))
      return alert('Please fill all fields');
    const key = date.slice(0,7);
    const arr = JSON.parse(localStorage[key]||'[]');
    if (isEditing) {
      arr[editIndex] = { date, category:cat, desc, amt };
      isEditing = false;
      submitBtn.textContent = 'Add Expense';
      cancelBtn.classList.add('hidden');
    } else {
      arr.unshift({ date, category:cat, desc, amt });
    }
    localStorage[key] = JSON.stringify(arr);
    playBeep();
    e.target.reset();
    dateInput.value = new Date().toISOString().slice(0,10);
    renderRecent();
  });
  cancelBtn.addEventListener('click', () => {
    isEditing = false;
    submitBtn.textContent = 'Add Expense';
    cancelBtn.classList.add('hidden');
    document.getElementById('expenseForm').reset();
    dateInput.value = new Date().toISOString().slice(0,10);
  });

  // SAVE SETTINGS
  saveBudgets.addEventListener('click', () => {
    localStorage.monthlyBudget = parseFloat(monthInput.value)||0;
    localStorage.weeklyBudget  = parseFloat(weekInput.value)||0;
    alert('Budgets saved');
    renderBudget();
  });
  saveColors.addEventListener('click', () => {
    const map = {};
    colorListDiv.querySelectorAll('input[type=color]').forEach(i => {
      map[i.dataset.cat] = i.value;
    });
    localStorage.categoryColors = JSON.stringify(map);
    alert('Colors saved');
    renderCategoryOptions();
    renderCategoryList();
    renderCategoryChart();
  });

  // BEEP ON ADD
  function playBeep(){
    try {
      const ctx = new (AudioContext||webkitAudioContext)();
      const o = ctx.createOscillator();
      o.connect(ctx.destination);
      o.start();
      setTimeout(()=>o.stop(),100);
    } catch {}
  }

  // RENDER FUNCTIONS
  function renderCategoryOptions(){
    const cats   = JSON.parse(localStorage.categories);
    const colors = JSON.parse(localStorage.categoryColors);
    catSelect.innerHTML = '<option value="" disabled selected>Select category</option>';
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = o.textContent = c;
      if (colors[c]) o.style.color = colors[c];
      catSelect.appendChild(o);
    });
  }
  function renderCategoryList(){
    const cats   = JSON.parse(localStorage.categories);
    const colors = JSON.parse(localStorage.categoryColors);
    catList.innerHTML = '';
    cats.forEach(c => {
      const li = document.createElement('li');
      li.textContent = c;
      if (colors[c]) li.style.color = colors[c];
      catList.appendChild(li);
    });
  }
  function renderRecent(){
    const all = [];
    for (let k in localStorage) {
      if (/^\d{4}-\d{2}$/.test(k)) {
        JSON.parse(localStorage[k]).forEach(e => all.push(e));
      }
    }
    all.sort((a,b) => b.date.localeCompare(a.date));
    const recent = all.slice(0,30);
    const colors = JSON.parse(localStorage.categoryColors);
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
  function renderTimeline(){
    const key = new Date().toISOString().slice(0,7);
    tlMonthLbl.textContent = key;
    const data = JSON.parse(localStorage[key]||'[]');
    const daily = {};
    data.forEach(e=> daily[e.date] = (daily[e.date]||0) + e.amt );
    const dates = Object.keys(daily).sort(), vals = dates.map(d=>daily[d]);
    const ctx = document.getElementById('timelineChart').getContext('2d');
    if (timelineChartInstance) timelineChartInstance.destroy();
    timelineChartInstance = new Chart(ctx, {
      type:'line',
      data:{ labels:dates, datasets:[{label:'Daily Spend',data:vals,fill:false,tension:0.2,borderWidth:2}] },
      options:{ scales:{ x:{title:{display:true,text:'Date'}}, y:{title:{display:true,text:'₹'}} }}
    });
  }
  function renderCategoryChart(){
    const key = new Date().toISOString().slice(0,7);
    const data = JSON.parse(localStorage[key]||'[]');
    const totals = {};
    data.forEach(e=> totals[e.category] = (totals[e.category]||0) + e.amt );
    const labels = Object.keys(totals), vals = labels.map(l=>totals[l]);
    const colors = labels.map(l=>JSON.parse(localStorage.categoryColors)[l]||'#23b79b');
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(catCtx, {
      type:'pie',
      data:{ labels, datasets:[{data:vals,backgroundColor:colors}] },
      options:{ plugins:{ legend:{ position:'bottom' } } }
    });
  }
  function renderBudget(){
    const mb = +localStorage.monthlyBudget, wb = +localStorage.weeklyBudget;
    monthlyDisp.textContent = mb.toFixed(2);
    weeklyDisp.textContent  = wb.toFixed(2);
    const key = new Date().toISOString().slice(0,7);
    const data = JSON.parse(localStorage[key]||'[]');
    const spentM = data.reduce((s,e)=>s+e.amt,0);
    const today  = new Date().getDate();
    const wk     = Math.floor((today-1)/7)+1;
    const spentW = data.filter(e=>Math.floor((+e.date.split('-')[2]-1)/7)+1===wk)
                       .reduce((s,e)=>s+e.amt,0);
    const pM = mb?Math.min(spentM/mb*100,100):0;
    const pW = wb?Math.min(spentW/wb*100,100):0;
    monthlyBar.style.width = pM+'%';
    weeklyBar.style.width  = pW+'%';
    monthlyRem.textContent = `Remaining: ₹${(mb-spentM).toFixed(2)}`;
    weeklyRem.textContent  = `Remaining: ₹${(wb-spentW).toFixed(2)}`;
  }
  function renderSettings(){
    monthInput.value = localStorage.monthlyBudget;
    weekInput.value  = localStorage.weeklyBudget;
    colorListDiv.innerHTML = '';
    JSON.parse(localStorage.categories).forEach(cat => {
      const div = document.createElement('div');
      div.className = 'color-item';
      div.innerHTML = `
        <label>${cat}</label>
        <input type="color" data-cat="${cat}"
               value="${JSON.parse(localStorage.categoryColors)[cat]||'#23b79b'}">
      `;
      colorListDiv.appendChild(div);
    });
  }
});
