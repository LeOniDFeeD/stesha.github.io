let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let records = [];
let services = [];
let clients = [];

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

async function init() {
  const savedRecords = await localforage.getItem('records');
  const savedServices = await localforage.getItem('services');
  const savedClients = await localforage.getItem('clients');
  records = savedRecords || [];
  services = savedServices || [];
  clients = savedClients || [];
  renderCalendar();
  updateTotalBar();
}

// ✅ Правильный формат даты (локальный)
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getServiceById(id) {
  return services.find(s => s.id === id) || { name: '—', price: 0 };
}

function getClientById(id) {
  return clients.find(c => c.id === id) || { firstName: '—', lastName: '', phone: '' };
}

async function saveServices() {
  await localforage.setItem('services', services);
}

async function saveClients() {
  await localforage.setItem('clients', clients);
}

function showNotification(text = 'Сохранено!') {
  const el = document.getElementById('notification');
  if (el) {
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 2000);
  }
}

function sortServices() {
  services.sort((a, b) => {
    const countA = a.usageCount || 0;
    const countB = b.usageCount || 0;
    if (countB !== countA) return countB - countA;
    return a.name.localeCompare(b.name);
  });
}

function sortClients() {
  clients.sort((a, b) => {
    return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
  });
}

function sortRecordsByTime(records) {
  return records.sort((a, b) => {
    const timeA = a.time || '99:99';
    const timeB = b.time || '99:99';
    return timeA.localeCompare(timeB);
  });
}

function renderCalendar() {
  const firstDay = new Date(currentYear, currentMonth, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const calendarEl = document.getElementById('calendar');
  calendarEl.innerHTML = '';

  ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(day => {
    const el = document.createElement('div');
    el.className = 'day-name';
    el.textContent = day;
    calendarEl.appendChild(el);
  });

  const today = new Date();
  const todayStr = formatDate(today);

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = formatDate(date);
    const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;

    const dayRecords = records.filter(r => r.date === dateStr);
    const dotsCount = dayRecords.length > 3 ? 3 : dayRecords.length;

    const dayEl = document.createElement('div');
    dayEl.className = 'day-cell';
    if (!isCurrentMonth) dayEl.classList.add('other-month');
    if (dateStr === todayStr) dayEl.classList.add('today');

    dayEl.textContent = date.getDate();

    if (isCurrentMonth) {
      // ✅ Клик работает напрямую
      dayEl.addEventListener('click', () => openDayModal(dateStr));
      
      if (dotsCount > 0) {
        const dots = document.createElement('div');
        dots.className = 'dots';
        for (let j = 0; j < dotsCount; j++) {
          const dot = document.createElement('div');
          dot.className = 'dot';
          dots.appendChild(dot);
        }
        dayEl.appendChild(dots);
      }
    }

    calendarEl.appendChild(dayEl);
  }

  document.getElementById('month-title').textContent = `${monthNames[currentMonth]} ${currentYear}`;
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
  updateTotalBar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
  updateTotalBar();
}

// ✅ Универсальная функция открытия модалки
function openModal(htmlContent) {
  document.getElementById('modal-content').innerHTML = htmlContent;
  const modal = document.getElementById('modal');
  modal.style.display = 'flex';
  // Небольшая задержка для запуска анимации
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
}

function openDayModal(dateStr) {
  let dayRecords = records.filter(r => r.date === dateStr);
  dayRecords = sortRecordsByTime([...dayRecords]);

  const dateObj = new Date(dateStr);
  const formattedDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;

  const dayIncome = dayRecords.reduce((sum, r) => {
    const service = getServiceById(r.serviceId);
    return sum + service.price;
  }, 0);

  let html = `<h3>${formattedDate}</h3>`;
  html += `<p><strong>Доход за день: ${dayIncome.toFixed(0)} ₽</strong></p>`;

  if (dayRecords.length > 0) {
    html += '<h4>Записи:</h4>';
    dayRecords.forEach((r, idx) => {
      const client = getClientById(r.clientId);
      const service = getServiceById(r.serviceId);
      const time = r.time || '—';
      const fullName = `${client.firstName} ${client.lastName}`.trim() || '—';
      html += `
        <div class="record-item">
          <strong>${fullName}</strong> ${client.phone ? `(${client.phone})` : ''}<br>
          Услуга: ${service.name}<br>
          Сумма: ${service.price} ₽<br>
          Время: ${time}<br>
          ${r.comment ? `<small>${r.comment}</small>` : ''}
          <div style="margin-top:6px;">
            <button onclick="editRecord('${r.date}', ${idx})" style="background:#ff9500;padding:4px 8px;font-size:14px;margin-right:6px;">✏️</button>
            <button onclick="deleteRecord('${r.date}', ${idx})" style="background:#ff3b30;padding:4px 8px;font-size:14px;">🗑</button>
          </div>
        </div>
      `;
    });
  }

  sortServices();
  sortClients();

  let serviceOptions = services.length > 0 
    ? services.map(s => `<option value="${s.id}">${s.name} (${s.price} ₽)</option>`).join('')
    : '<option>Добавьте услуги</option>';

  let clientOptions = clients.length > 0
    ? clients.map(c => {
        const name = `${c.firstName} ${c.lastName}`.trim();
        return `<option value="${c.id}">${name} ${c.phone ? '(' + c.phone + ')' : ''}</option>`;
      }).join('')
    : '<option>Добавьте клиентов</option>';

  html += `
    <h4>Добавить запись</h4>
    <select id="new-client-id">
      ${clientOptions}
    </select>
    <select id="new-service-id">
      ${serviceOptions}
    </select>
    <input type="time" id="new-time" />
    <textarea id="new-comment" placeholder="Комментарий"></textarea>
    <button onclick="saveRecord('${dateStr}')">Сохранить</button>
    <button onclick="openClients()">👥 Клиенты</button>
    <button onclick="openServices()">🛠 Услуги</button>
    <button onclick="openStats()">📊 Статистика</button>
    <button onclick="closeModal()">Закрыть</button>
  `;

  openModal(html);
}

function saveRecord(dateStr) {
  const clientId = document.getElementById('new-client-id').value;
  const serviceId = document.getElementById('new-service-id').value;
  const time = document.getElementById('new-time').value || null;
  const comment = document.getElementById('new-comment').value.trim();

  if (!clientId || !serviceId || clients.length === 0 || services.length === 0) {
    alert('Выберите клиента и услугу');
    return;
  }

  const service = services.find(s => s.id === serviceId);
  if (service) {
    service.usageCount = (service.usageCount || 0) + 1;
    saveServices();
  }

  records.push({ date: dateStr, clientId, serviceId, time, comment });
  localforage.setItem('records', records);
  closeModal();
  renderCalendar();
  updateTotalBar();
}

// === РЕДАКТИРОВАНИЕ ЗАПИСИ ===
function editRecord(dateStr, index) {
  const dayRecords = records.filter(r => r.date === dateStr);
  if (index >= dayRecords.length) return;
  const record = dayRecords[index];

  sortServices();
  sortClients();

  let serviceOptions = services.map(s => 
    `<option value="${s.id}" ${s.id === record.serviceId ? 'selected' : ''}>${s.name} (${s.price} ₽)</option>`
  ).join('');

  let clientOptions = clients.map(c => {
    const name = `${c.firstName} ${c.lastName}`.trim();
    return `<option value="${c.id}" ${c.id === record.clientId ? 'selected' : ''}>${name} ${c.phone ? '(' + c.phone + ')' : ''}</option>`;
  }).join('');

  let html = `
    <h3>✏️ Редактировать запись</h3>
    <select id="edit-client-id">
      ${clientOptions}
    </select>
    <select id="edit-service-id">
      ${serviceOptions}
    </select>
    <input type="time" id="edit-time" value="${record.time || ''}" />
    <textarea id="edit-comment" placeholder="Комментарий">${record.comment || ''}</textarea>
    <button onclick="saveEditedRecord('${dateStr}', ${index})">Сохранить</button>
    <button onclick="openDayModal('${dateStr}')">Отмена</button>
  `;

  openModal(html);
}

function saveEditedRecord(dateStr, index) {
  const clientId = document.getElementById('edit-client-id').value;
  const serviceId = document.getElementById('edit-service-id').value;
  const time = document.getElementById('edit-time').value || null;
  const comment = document.getElementById('edit-comment').value.trim();

  if (!clientId || !serviceId) {
    alert('Выберите клиента и услугу');
    return;
  }

  const dayRecords = records.filter(r => r.date === dateStr);
  if (index >= dayRecords.length) return;

  const target = dayRecords[index];
  records = records.filter(r => 
    !(r.date === dateStr && 
      r.clientId === target.clientId && 
      r.serviceId === target.serviceId && 
      r.time === target.time)
  );

  records.push({ date: dateStr, clientId, serviceId, time, comment });

  localforage.setItem('records', records);
  showNotification('Запись обновлена!');
  openDayModal(dateStr);
}

function deleteRecord(dateStr, index) {
  if (!confirm('Удалить запись?')) return;

  const dayRecords = records.filter(r => r.date === dateStr);
  if (index >= dayRecords.length) return;

  const target = dayRecords[index];
  records = records.filter(r => 
    !(r.date === dateStr && 
      r.clientId === target.clientId && 
      r.serviceId === target.serviceId && 
      r.time === target.time)
  );

  localforage.setItem('records', records);
  showNotification('Запись удалена!');
  openDayModal(dateStr);
}

// === КЛИЕНТЫ ===
function openClients() {
  sortClients();
  let listHtml = '';
  if (clients.length > 0) {
    listHtml = '<div class="stats-list">';
    clients.forEach(c => {
      const name = `${c.firstName} ${c.lastName}`.trim();
      listHtml += `
        <div class="client-item">
          <label style="flex:1;">
            <input type="checkbox" class="client-checkbox" value="${c.id}" /> 
            ${name} ${c.phone ? '(' + c.phone + ')' : ''}
          </label>
          <div>
            <button onclick="editClient('${c.id}')" style="background:#ff9500;padding:4px 8px;font-size:14px;margin-right:4px;">✏️</button>
            <button onclick="deleteClient('${c.id}')" style="background:#ff3b30;padding:4px 8px;font-size:14px;">×</button>
          </div>
        </div>
      `;
    });
    listHtml += '</div>';
  }

  let html = `
    <h3>👥 Мои клиенты</h3>
    ${listHtml}

    <h4>Добавить нового</h4>
    <input type="text" id="client-first" placeholder="Имя" />
    <input type="text" id="client-last" placeholder="Фамилия (необязательно)" />
    <input type="text" id="client-phone" placeholder="Телефон (необязательно)" />
    <button onclick="addClient()">➕ Добавить</button>

    <div style="margin-top:12px;">
      <button onclick="deleteSelectedClients()">🗑 Удалить выбранные</button>
      <button onclick="closeModal()">✅ Готово</button>
    </div>
  `;

  openModal(html);
}

async function addClient() {
  const firstName = document.getElementById('client-first').value.trim();
  const lastName = document.getElementById('client-last').value.trim();
  const phone = document.getElementById('client-phone').value.trim();

  if (!firstName) {
    alert('Укажите имя');
    return;
  }

  const newClient = {
    id: Date.now().toString(),
    firstName,
    lastName,
    phone
  };
  clients.push(newClient);
  await saveClients();
  showNotification('Клиент сохранён!');
  openClients();
}

async function editClient(id) {
  const client = clients.find(c => c.id === id);
  if (!client) return;

  let html = `
    <h3>✏️ Редактировать клиента</h3>
    <input type="text" id="edit-first" value="${client.firstName}" placeholder="Имя" />
    <input type="text" id="edit-last" value="${client.lastName}" placeholder="Фамилия" />
    <input type="text" id="edit-phone" value="${client.phone}" placeholder="Телефон" />
    <button onclick="saveEditedClient('${id}')">Сохранить</button>
    <button onclick="openClients()">Отмена</button>
  `;

  openModal(html);
}

async function saveEditedClient(id) {
  const firstName = document.getElementById('edit-first').value.trim();
  const lastName = document.getElementById('edit-last').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();

  if (!firstName) {
    alert('Укажите имя');
    return;
  }

  const client = clients.find(c => c.id === id);
  if (client) {
    client.firstName = firstName;
    client.lastName = lastName;
    client.phone = phone;
    await saveClients();
    showNotification('Клиент обновлён!');
    openClients();
  }
}

async function deleteClient(id) {
  if (!confirm('Удалить клиента и все его записи?')) return;
  clients = clients.filter(c => c.id !== id);
  records = records.filter(r => r.clientId !== id);
  await saveClients();
  localforage.setItem('records', records);
  openClients();
}

async function deleteSelectedClients() {
  const checkboxes = document.querySelectorAll('.client-checkbox:checked');
  const idsToDelete = Array.from(checkboxes).map(cb => cb.value);
  if (idsToDelete.length === 0) {
    alert('Выберите клиентов для удаления');
    return;
  }
  if (!confirm(`Удалить ${idsToDelete.length} клиентов и все их записи?`)) return;
  clients = clients.filter(c => !idsToDelete.includes(c.id));
  records = records.filter(r => !idsToDelete.includes(r.clientId));
  await saveClients();
  localforage.setItem('records', records);
  openClients();
}

// === УСЛУГИ ===
function openServices() {
  sortServices();
  let listHtml = '';
  if (services.length > 0) {
    listHtml = '<div class="stats-list">';
    services.forEach(s => {
      listHtml += `
        <div class="service-item">
          <label style="flex:1;">
            <input type="checkbox" class="service-checkbox" value="${s.id}" /> 
            ${s.name} — ${s.price} ₽ 
            <small>(${s.usageCount || 0})</small>
          </label>
          <div>
            <button onclick="editService('${s.id}')" style="background:#ff9500;padding:4px 8px;font-size:14px;margin-right:4px;">✏️</button>
            <button onclick="deleteService('${s.id}')" style="background:#ff3b30;padding:4px 8px;font-size:14px;">×</button>
          </div>
        </div>
      `;
    });
    listHtml += '</div>';
  }

  let html = `
    <h3>🛠 Мои услуги</h3>
    ${listHtml}

    <h4>Добавить новую</h4>
    <input type="text" id="service-name" placeholder="Название услуги" />
    <input type="number" id="service-price" placeholder="Стоимость" />
    <button onclick="addService()">➕ Добавить</button>

    <div style="margin-top:12px;">
      <button onclick="deleteSelectedServices()">🗑 Удалить выбранные</button>
      <button onclick="closeModal()">✅ Готово</button>
    </div>
  `;

  openModal(html);
}

async function addService() {
  const name = document.getElementById('service-name').value.trim();
  const price = parseFloat(document.getElementById('service-price').value);
  if (!name || isNaN(price)) {
    alert('Укажите название и стоимость');
    return;
  }
  const newService = {
    id: Date.now().toString(),
    name,
    price
  };
  services.push(newService);
  await saveServices();
  showNotification('Услуга сохранена!');
  openServices();
}

async function editService(id) {
  const service = services.find(s => s.id === id);
  if (!service) return;

  let html = `
    <h3>✏️ Редактировать услугу</h3>
    <input type="text" id="edit-name" value="${service.name}" placeholder="Название" />
    <input type="number" id="edit-price" value="${service.price}" placeholder="Стоимость" />
    <button onclick="saveEditedService('${id}')">Сохранить</button>
    <button onclick="openServices()">Отмена</button>
  `;

  openModal(html);
}

async function saveEditedService(id) {
  const name = document.getElementById('edit-name').value.trim();
  const price = parseFloat(document.getElementById('edit-price').value);
  if (!name || isNaN(price)) {
    alert('Заполните все поля');
    return;
  }

  const service = services.find(s => s.id === id);
  if (service) {
    service.name = name;
    service.price = price;
    await saveServices();
    showNotification('Услуга обновлена!');
    openServices();
  }
}

async function deleteService(id) {
  if (!confirm('Удалить услугу и все её записи?')) return;
  services = services.filter(s => s.id !== id);
  records = records.filter(r => r.serviceId !== id);
  await saveServices();
  localforage.setItem('records', records);
  openServices();
}

async function deleteSelectedServices() {
  const checkboxes = document.querySelectorAll('.service-checkbox:checked');
  const idsToDelete = Array.from(checkboxes).map(cb => cb.value);
  if (idsToDelete.length === 0) {
    alert('Выберите услуги для удаления');
    return;
  }
  if (!confirm(`Удалить ${idsToDelete.length} услуг(у/и) и все связанные записи?`)) return;
  services = services.filter(s => !idsToDelete.includes(s.id));
  records = records.filter(r => !idsToDelete.includes(r.serviceId));
  await saveServices();
  localforage.setItem('records', records);
  openServices();
}

// === СТАТИСТИКА ===
function openStats() {
  const monthly = {};
  const yearly = {};
  const serviceUsage = {};

  records.forEach(r => {
    const ym = r.date.substring(0, 7);
    const year = r.date.substring(0, 4);
    const service = getServiceById(r.serviceId);

    if (!monthly[ym]) monthly[ym] = { income: 0, services: {} };
    if (!yearly[year]) yearly[year] = { income: 0, services: {} };

    monthly[ym].income += service.price;
    yearly[year].income += service.price;

    monthly[ym].services[r.serviceId] = (monthly[ym].services[r.serviceId] || 0) + 1;
    yearly[year].services[r.serviceId] = (yearly[year].services[r.serviceId] || 0) + 1;

    serviceUsage[r.serviceId] = (serviceUsage[r.serviceId] || 0) + 1;
  });

  let topService = null;
  let maxCount = 0;
  for (const id in serviceUsage) {
    if (serviceUsage[id] > maxCount) {
      maxCount = serviceUsage[id];
      topService = id;
    }
  }

  let html = `<h3>📊 Статистика</h3>`;

  if (topService) {
    const s = getServiceById(topService);
    html += `<p>🔥 Самая популярная: <strong>${s.name}</strong> (${maxCount} раз)</p>`;
  }

  html += '<h4>По годам</h4><div class="stats-list">';
  Object.keys(yearly).sort().reverse().forEach(y => {
    const yData = yearly[y];
    let topInYear = null;
    let maxInYear = 0;
    for (const id in yData.services) {
      if (yData.services[id] > maxInYear) {
        maxInYear = yData.services[id];
        topInYear = id;
      }
    }
    const topName = topInYear ? getServiceById(topInYear).name : '—';
    html += `<div class="stats-item">${y}: ${yData.income.toFixed(0)} ₽<br><small>Популярная: ${topName}</small></div>`;
  });
  html += '</div>';

  html += '<h4>Последние месяцы</h4><div class="stats-list">';
  Object.keys(monthly)
    .sort()
    .reverse()
    .slice(0, 6)
    .forEach(ym => {
      const mData = monthly[ym];
      let topInMonth = null;
      let maxInMonth = 0;
      for (const id in mData.services) {
        if (mData.services[id] > maxInMonth) {
          maxInMonth = mData.services[id];
          topInMonth = id;
        }
      }
      const [y, m] = ym.split('-');
      const monthName = monthNames[parseInt(m) - 1];
      const topName = topInMonth ? getServiceById(topInMonth).name : '—';
      html += `<div class="stats-item">${monthName} ${y}: ${mData.income.toFixed(0)} ₽<br><small>Популярная: ${topName}</small></div>`;
    });
  html += '</div>';

  html += `<button onclick="closeModal()">Закрыть</button>`;

  openModal(html);
}

// ✅ Безопасное закрытие
function closeModal(e) {
  const modal = document.getElementById('modal');
  if (e && e.target !== modal) return;
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

function updateTotalBar() {
  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthIncome = records
    .filter(r => r.date.startsWith(monthKey))
    .reduce((sum, r) => {
      const service = getServiceById(r.serviceId);
      return sum + service.price;
    }, 0);

  let totalBar = document.querySelector('.total-bar');
  if (!totalBar) {
    totalBar = document.createElement('div');
    totalBar.className = 'total-bar';
    document.body.appendChild(totalBar);
  }
  totalBar.textContent = `${monthNames[currentMonth]}: ${monthIncome.toFixed(0)} ₽`;
}

window.onload = init;