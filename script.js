let categoryChartInstance = null;
let timelineChartInstance = null;

// Editing state
let isEditing = false;
let editKey = null;
let editIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  // Nav buttons
  const navAdd      = document.getElementById('nav-add');
  const navPreview  = document.getElementById('nav-preview');
  const navTimeline = document.getElementById('nav-timeline');
  const navCat      = document.getElementById('nav-categories');
  const navBudget   = document.getElementById('nav-budget');

  // Sections
  const sections = {
    add:        document.getElementById('section-add'),
    preview:    document.getElementById('section-preview'),
    timeline:   document.getElementById('section-timeline'),
    categories: document.getElementById('section-categories'),
    budget:     document.getElementById('section-budget')
  };

  // Form & inputs
  const expenseForm        = document.getElementById('expenseForm');
  const dateInput          = document.getElementById('date');
  const categorySelect     = document.getElementById('categorySelect');
  const descInput          = document.getElementById('description');
  const amtInput           = document.getElementById('amount');
  const submitBtn          = document.getElementById('btn-submit-expense');
  const cancelEditBtn      = document.getElementById('btn-cancel-edit');

  // Preview table
  const currentMonthLbl    = document.getElementById('currentMonth');
  const tbodyPreview       = document.querySelector('#expensesTable tbody');
  const totalAmountCell    = document.getElementById('totalAmount');

  // Timeline
  const currentMonthTL     = document.getElementById('currentMonthTimeline');

  // Categories
  const categoryForm       = document.getElementById('categoryForm');
  const newCategoryInput   = document.getElementById('newCategory');
  const categoryList       = document.getElementById('categoryList');

  // Budget
  const monthlyVal         = document.getElementById('monthlyBudgetVal');
  const weeklyVal          = document.getElementById('weeklyBudgetVal');
  const monthlyBar         = document.getElementById('monthlyBar');
  const weeklyBar          = document.getElementById('weeklyBar');
  const monthlyPct         = document.getElementById('monthlyPercent');
  const weeklyPct          = document.getElementById('weeklyPercent');

  // Init
  dateInput.value = new Date().toISOString().slice(0,10);
  setupBudgets();
  loadCategories();
  renderCategoryOptions();
  switchView('add');

  // Navigation handlers
  navAdd.onclick      = () => switchView('add');
  navPreview.onclick  = () => switchView('preview');
  navTimeline.onclick = () => switchView('timeline');
  navCat.onclick      = () => switchView('categories');
  navBudget.onclick   = () => switchView('budget');

  function switchView(view) {
    // Hide all & clear active
    Object.keys(sections).forEach(k => {
      sections[k].classList.add('hidden');
      document.getElementById('nav-'+k).classList.remove('active');
    });
    // Show target
    sections[view].classList.remove('hidden');
    document.getElementById('nav-'+view).classList.add('active');

    // Render as needed
    if (view==='preview')    renderPreview();
    if (view==='timeline')   renderTimeline();
    if (view==='categories'){
      renderCategoryList();
      renderCategoryChart();
    }
    if (view==='budget')     renderBudget();
  }

  // Budgets
  function setupBudgets() {
    if (!localStorage.weeklyBudget) {
      localStorage.weeklyBudget = prompt('Enter weekly budget (₹):','0')||0;
    }
    if (!localStorage.monthlyBudget) {
      localStorage.monthlyBudget = prompt('Enter monthly budget (₹):','0')||0;
    }
  }

  // Categories
  function loadCategories() {
    if (!localStorage.categories) {
      localStorage.categories = JSON.stringify([]);
    }
  }
  function renderCategoryOptions() {
    const cats = JSON.parse(localStorage.categories);
    categorySelect.innerHTML = '<option value="" disabled selected>Select category</option>';
    cats.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }
  function renderCategoryList() {
    categoryList.innerHTML = '';
    JSON.parse(localStorage.categories).forEach(c=>{
      const li = document.createElement('li');
      li.textContent = c;
      categoryList.appendChild(li);
    });
  }
  categoryForm.onsubmit = e => {
    e.preventDefault();
    const c = newCategoryInput.value.trim();
    if (!c) return;
    const cats = JSON.parse(localStorage.categories);
    if (!cats.includes(c)) {
      cats.push(c);
      localStorage.categories = JSON.stringify(cats);
    }
    newCategoryInput.value = '';
    renderCategoryOptions();
    renderCategoryList();
  };

  // Add / Update Expense
  expenseForm.onsubmit = e => {
    e.preventDefault();
    const date     = dateInput.value;
    const cat      = categorySelect.value;
    const desc     = descInput.value.trim();
    const amt      = parseFloat(amtInput.value);
    if (!date||!cat||!desc||isNaN(amt)) {
      return alert('All fields required.');
    }
    const key = date.slice(0,7);
    const arr = JSON.parse(localStorage[key]||'[]');

    if (isEditing) {
      // Update existing
      arr[editIndex] = { date, category: cat, desc, amt };
      isEditing = false;
      submitBtn.textContent = 'Add Expense';
      cancelEditBtn.classList.add('hidden');
    } else {
      // New entry
      arr.push({ date, category: cat, desc, amt });
    }

    localStorage[key] = JSON.stringify(arr);
    descInput.value = amtInput.value = '';
    alert(isEditing ? '✅ Updated!' : '✅ Added!');
    switchView('preview');
  };

  // Cancel edit
  cancelEditBtn.onclick = () => {
    isEditing = false;
    submitBtn.textContent = 'Add Expense';
    cancelEditBtn.classList.add('hidden');
    dateInput.value = new Date().toISOString().slice(0,10);
    descInput.value = amtInput.value = '';
    categorySelect.selectedIndex = 0;
  };

  // Preview & Edit buttons
  function renderPreview() {
    const key = new Date().toISOString().slice(0,7);
    const data = JSON.parse(localStorage[key]||'[]');
    currentMonthLbl.textContent = key;
    tbodyPreview.innerHTML = '';
    let total=0;
    data.forEach((e,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.date}</td>
        <td>${e.category[0]}</td>
        <td>${e.desc}</td>
        <td>₹${e.amt.toFixed(2)}</td>
        <td><button class="edit-btn" data-index="${i}">Edit</button></td>`;
      tbodyPreview.appendChild(tr);
      total+=e.amt;
    });
    totalAmountCell.textContent = `₹${total.toFixed(2)}`;

    // Attach edit handlers
    Array.from(document.getElementsByClassName('edit-btn'))
      .forEach(btn=>{
        btn.onclick = () => {
          editIndex = +btn.dataset.index;
          editKey   = key;
          const entry = JSON.parse(localStorage[key])[editIndex];
          // Populate form
          dateInput.value       = entry.date;
          categorySelect.value  = entry.category;
          descInput.value       = entry.desc;
          amtInput.value        = entry.amt;
          // Switch to Add/Edit
          isEditing = true;
          submitBtn.textContent = 'Update Expense';
          cancelEditBtn.classList.remove('hidden');
          switchView('add');
        };
      });
  }

  // Timeline
  function renderTimeline() {
    const key = new Date().toISOString().slice(0,7);
    currentMonthTL.textContent = key;
    const data = JSON.parse(localStorage[key]||'[]');
    const daily = {};
    data.forEach(e=> daily[e.date]=(daily[e.date]||0)+e.amt );
    drawTimelineChart(daily);
  }

  // Category Pie Chart
  function renderCategoryChart() {
    const key = new Date().toISOString().slice(0,7);
    const data = JSON.parse(localStorage[key]||'[]');
    const totals = {};
    data.forEach(e=> totals[e.category]=(totals[e.category]||0)+e.amt );
    drawCategoryChart(totals);
  }

  // Budget
  function renderBudget() {
    const mb   = +localStorage.monthlyBudget;
    const wb   = +localStorage.weeklyBudget;
    monthlyVal.textContent = mb.toFixed(2);
    weeklyVal.textContent  = wb.toFixed(2);
    const key  = new Date().toISOString().slice(0,7);
    const data = JSON.parse(localStorage[key]||'[]');
    const mSpent = data.reduce((s,e)=>s+e.amt,0);
    const today = new Date().getDate();
    const wk    = Math.floor((today-1)/7)+1;
    const wSpent= data.filter(e=>
      Math.floor((+e.date.split('-')[2]-1)/7)+1===wk
    ).reduce((s,e)=>s+e.amt,0);
    const mPct = mb?Math.min(mSpent/mb*100,100):0;
    const wPct = wb?Math.min(wSpent/wb*100,100):0;
    monthlyBar.style.width = mPct+'%';
    weeklyBar.style.width  = wPct+'%';
    monthlyPct.textContent = mPct.toFixed(1)+'%';
    weeklyPct.textContent  = wPct.toFixed(1)+'%';
  }

  // Charts drawing
  function drawCategoryChart(totals) {
    const labels = Object.keys(totals);
    const data   = labels.map(l=>totals[l]);
    const colors = labels.map((_,i)=>`hsl(${i*360/labels.length},60%,60%)`);
    const ctx    = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctx,{type:'pie',
      data:{labels,datasets:[{data,backgroundColor:colors}]},
      options:{plugins:{legend:{position:'bottom',labels:{generateLabels:chart=>
        chart.data.labels.map((lbl,i)=>({
          text:`${lbl}: ₹${chart.data.datasets[0].data[i].toFixed(2)}`,
          fillStyle:chart.data.datasets[0].backgroundColor[i]
        }))
      }},tooltip:{callbacks:{label:c=>`${c.label}: ₹${c.raw.toFixed(2)}`}}}}
    });
  }

  function drawTimelineChart(daily) {
    const dates = Object.keys(daily).sort();
    const data  = dates.map(d=>daily[d]);
    const ctx   = document.getElementById('timelineChart').getContext('2d');
    if (timelineChartInstance) timelineChartInstance.destroy();
    timelineChartInstance = new Chart(ctx,{type:'line',
      data:{labels:dates,datasets:[{label:'Daily Spend',data,fill:false,tension:0.2,borderWidth:2}]},
      options:{scales:{x:{title:{display:true,text:'Date'}},y:{title:{display:true,text:'₹'}}}}
    });
  }
});
