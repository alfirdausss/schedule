const state = {
  operators: [],
  recapSchedules: [],
  currentMonthSchedules: [],
  unassigned: [],
  exportImageUrl: '',
  exportFileName: '',
  confirmAction: null,
};

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const ACTIVE_SECTION_KEY = 'activeSection';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatDayName(dateString) {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(year, month - 1, day));
}

function monthLabel(monthValue) {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return '-';
  const [year, month] = monthValue.split('-').map(Number);
  return `${monthNames[month - 1]} ${year}`;
}

function currentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function showToast(message, type = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(payload.message || 'Permintaan gagal diproses.');
  }

  return payload;
}

function switchSection(sectionId) {
  if (!$(`#${sectionId}`)) return;

  $$('.content-section').forEach((section) => {
    section.classList.toggle('active', section.id === sectionId);
  });

  $$('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });

  document.body.dataset.activeSection = sectionId;
  $('#sidebar').classList.remove('open');
  localStorage.setItem(ACTIVE_SECTION_KEY, sectionId);

  if (sectionId === 'recap') loadRecap();
  if (sectionId === 'schedule-form') loadUnassigned();
}

function restoreActiveSection() {
  const savedSection = localStorage.getItem(ACTIVE_SECTION_KEY);
  if (savedSection && $(`#${savedSection}`)) {
    switchSection(savedSection);
  }
}

function operatorOptions(selectedId = '') {
  return [
    '<option value="">Belum ditentukan</option>',
    ...state.operators.map((operator) => (
      `<option value="${operator.id}" ${String(operator.id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(operator.nama)}</option>`
    )),
  ].join('');
}

function uppercaseTime(value) {
  return String(value || '').toUpperCase();
}

function selectedOptionText(select) {
  return select.options[select.selectedIndex]?.text || 'Pilih';
}

function waLink(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function formatWa(value) {
  return String(value || '').trim() || '-';
}

function enhanceSelect(select) {
  if (!select || select.dataset.customReady === 'true') return;

  select.dataset.customReady = 'true';
  select.classList.add('native-select-hidden');

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';
  wrapper.innerHTML = `
    <button type="button" class="custom-select-button" aria-haspopup="listbox" aria-expanded="false">
      <span></span>
      <i aria-hidden="true"></i>
    </button>
    <div class="custom-select-menu" role="listbox"></div>
  `;

  select.insertAdjacentElement('afterend', wrapper);
  syncCustomSelect(select);
}

function syncCustomSelect(select) {
  const wrapper = select?.nextElementSibling?.classList.contains('custom-select')
    ? select.nextElementSibling
    : null;

  if (!wrapper) return;

  wrapper.querySelector('.custom-select-button span').textContent = selectedOptionText(select);
  wrapper.querySelector('.custom-select-menu').innerHTML = [...select.options].map((option) => `
    <button
      type="button"
      class="custom-select-option ${option.selected ? 'selected' : ''}"
      role="option"
      aria-selected="${option.selected ? 'true' : 'false'}"
      data-value="${escapeAttribute(option.value)}"
    >${escapeHtml(option.text)}</button>
  `).join('');
}

function refreshCustomSelects(root = document) {
  root.querySelectorAll('select').forEach((select) => {
    enhanceSelect(select);
    syncCustomSelect(select);
  });
}

function closeCustomSelects(except = null) {
  $$('.custom-select.open').forEach((wrapper) => {
    if (wrapper === except) return;
    wrapper.classList.remove('open');
    wrapper.querySelector('.custom-select-button')?.setAttribute('aria-expanded', 'false');
  });
}

function autoResizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function bindAutoResizeTextarea(textarea) {
  if (!textarea || textarea.dataset.autoResizeReady === 'true') return;
  textarea.dataset.autoResizeReady = 'true';
  textarea.addEventListener('input', () => autoResizeTextarea(textarea));
  autoResizeTextarea(textarea);
}

async function loadOperators() {
  state.operators = await request('/api/operators');
  renderOperators();
  renderOperatorSelects();
  $('#statOperators').textContent = state.operators.length;
}

function renderOperators() {
  const rows = $('#operatorRows');
  $('#operatorCount').textContent = `${state.operators.length} operator`;

  if (!state.operators.length) {
    rows.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada operator. Tambahkan dari tombol Operator Baru.</td></tr>';
    return;
  }

  rows.innerHTML = state.operators.map((operator, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(operator.nama)}</strong></td>
      <td>
        ${operator.nomor_wa
          ? `<a class="wa-link" href="${waLink(operator.nomor_wa)}" target="_blank" rel="noopener">${escapeHtml(formatWa(operator.nomor_wa))}</a>`
          : '<span class="muted-text">-</span>'}
      </td>
      <td class="align-right">
        <span class="actions">
          <button class="icon-action" data-edit-operator="${operator.id}" aria-label="Edit operator" title="Edit">&#9998;</button>
          <button class="icon-action danger" data-delete-operator="${operator.id}" aria-label="Hapus operator" title="Hapus">&#128465;</button>
        </span>
      </td>
    </tr>
  `).join('');
}

function renderOperatorSelects() {
  $('#scheduleOperator').innerHTML = operatorOptions();
  $('#editScheduleOperator').innerHTML = operatorOptions();
  refreshCustomSelects();
}

async function addOperator(event) {
  event.preventDefault();
  const name = $('#operatorName').value.trim();
  const nomorWa = $('#operatorWa').value.trim();
  if (!name) return;

  try {
    const result = await request('/api/operators', {
      method: 'POST',
      body: JSON.stringify({ nama: name, nomor_wa: nomorWa }),
    });
    $('#operatorForm').reset();
    closeOperatorModal();
    showToast(result.message);
    await loadOperators();
    await Promise.all([loadUnassigned(), loadRecap(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openOperatorEditModal(operatorId) {
  const operator = state.operators.find((item) => item.id === Number(operatorId));
  if (!operator) return;

  $('#editOperatorId').value = operator.id;
  $('#editOperatorName').value = operator.nama;
  $('#editOperatorWa').value = operator.nomor_wa || '';
  $('#operatorEditModal').classList.add('open');
  $('#operatorEditModal').setAttribute('aria-hidden', 'false');
  $('#editOperatorName').focus();
}

function closeOperatorEditModal() {
  $('#operatorEditModal').classList.remove('open');
  $('#operatorEditModal').setAttribute('aria-hidden', 'true');
}

async function saveOperatorEdit(event) {
  event.preventDefault();

  const id = $('#editOperatorId').value;
  const nama = $('#editOperatorName').value.trim();
  const nomorWa = $('#editOperatorWa').value.trim();

  try {
    const result = await request(`/api/operators/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nama, nomor_wa: nomorWa }),
    });
    closeOperatorEditModal();
    showToast(result.message);
    await loadOperators();
    await Promise.all([loadUnassigned(), loadRecap(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openConfirmModal({ title, message, actionLabel = 'Hapus', onConfirm }) {
  state.confirmAction = onConfirm;
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = message;
  $('#confirmAction').textContent = actionLabel;
  $('#confirmModal').classList.add('open');
  $('#confirmModal').setAttribute('aria-hidden', 'false');
}

function closeConfirmModal() {
  $('#confirmModal').classList.remove('open');
  $('#confirmModal').setAttribute('aria-hidden', 'true');
  state.confirmAction = null;
}

function openOperatorModal() {
  $('#operatorModal').classList.add('open');
  $('#operatorModal').setAttribute('aria-hidden', 'false');
  $('#operatorName').focus();
}

function closeOperatorModal() {
  $('#operatorModal').classList.remove('open');
  $('#operatorModal').setAttribute('aria-hidden', 'true');
}

function openScheduleModal() {
  $('#scheduleModal').classList.add('open');
  $('#scheduleModal').setAttribute('aria-hidden', 'false');
  $('#scheduleDate').value ||= new Date().toISOString().slice(0, 10);
  autoResizeTextarea($('#scheduleDescription'));
  refreshCustomSelects($('#scheduleModal'));
}

function closeScheduleModal() {
  $('#scheduleModal').classList.remove('open');
  $('#scheduleModal').setAttribute('aria-hidden', 'true');
  closeCustomSelects();
}

async function runConfirmAction() {
  if (typeof state.confirmAction !== 'function') return;

  const action = state.confirmAction;
  closeConfirmModal();
  await action();
}

function confirmDeleteOperator(id) {
  openConfirmModal({
    title: 'Hapus Operator',
    message: 'Jadwal yang sudah memakai operator ini akan menjadi belum assigned.',
    actionLabel: 'Hapus Operator',
    onConfirm: () => deleteOperator(id),
  });
}

async function deleteOperator(id) {

  try {
    const result = await request(`/api/operators/${id}`, { method: 'DELETE' });
    showToast(result.message);
    await loadOperators();
    await Promise.all([loadUnassigned(), loadRecap(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function addSchedule(event) {
  event.preventDefault();

  const payload = {
    tanggal: $('#scheduleDate').value,
    estimasi_jam: uppercaseTime($('#scheduleTime').value),
    operator_id: $('#scheduleOperator').value || null,
    keterangan_acara: $('#scheduleDescription').value.trim(),
  };

  try {
    const result = await request('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    $('#scheduleForm').reset();
    $('#scheduleDate').value = new Date().toISOString().slice(0, 10);
    closeScheduleModal();
    showToast(result.message);
    await Promise.all([loadUnassigned(), loadRecap(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadUnassigned() {
  const month = $('#manageMonth').value || $('#recapMonth').value || currentMonthValue();
  $('#manageMonth').value = month;
  state.unassigned = await request(`/api/schedules?month=${encodeURIComponent(month)}`);
  $('#unassignedCount').textContent = `${state.unassigned.length} jadwal`;

  const scheduleCards = $('#unassignedCards');
  if (!state.unassigned.length) {
    scheduleCards.innerHTML = '<div class="empty-state recap-empty">Belum ada jadwal pada bulan ini.</div>';
    return;
  }

  const groupedSchedules = state.unassigned.reduce((groups, schedule) => {
    if (!groups.has(schedule.tanggal)) {
      groups.set(schedule.tanggal, []);
    }
    groups.get(schedule.tanggal).push(schedule);
    return groups;
  }, new Map());

  scheduleCards.innerHTML = [...groupedSchedules.entries()].map(([tanggal, schedules], groupIndex) => {
    const dayIndex = groupIndex % 2;
    return `
      <article class="recap-day-card day-tone-${dayIndex}">
        <header class="recap-day-header">
          <div>
            <strong>${formatDayName(tanggal)}, ${formatDate(tanggal)}</strong>
          </div>
          <em>${schedules.length} jadwal</em>
        </header>
        <div class="recap-day-items">
          ${schedules.map((schedule, index) => `
            <div class="recap-schedule-card assign-schedule-card ${schedule.operator_id ? 'is-assigned' : 'is-unassigned'}">
              <div class="recap-schedule-number">${index + 1}</div>
              <div class="recap-schedule-main">
                <div class="assign-schedule-title">
                  <strong>${escapeHtml(schedule.keterangan_acara)}</strong>
                  <button class="mobile-action-toggle" type="button" data-toggle-schedule-actions="${schedule.id}" aria-label="Buka aksi jadwal" aria-expanded="false">&#8942;</button>
                </div>
                <div class="recap-schedule-meta">
                  <span class="time-chip">${escapeHtml(uppercaseTime(schedule.estimasi_jam))}</span>
                  <span class="status-chip ${schedule.operator_id ? 'assigned' : 'unassigned'}">
                    ${schedule.operator_id ? 'Assigned' : 'Belum Assigned'}
                  </span>
                  <span class="operator-assign">
                    <small>Operator:</small>
                    <div class="operator-select-group">
                      <select class="inline-select" data-assign-select="${schedule.id}">
                        ${operatorOptions(schedule.operator_id || '')}
                      </select>
                      <button class="icon-action primary save-assign-btn" data-assign-schedule="${schedule.id}" aria-label="Simpan penugasan operator" title="Simpan Operator">&#10003;</button>
                    </div>
                  </span>
                </div>
              </div>
              <div class="actions recap-actions">
                <button class="icon-action" data-edit-schedule="${schedule.id}" aria-label="Edit jadwal" title="Edit">&#9998;</button>
                <button class="icon-action danger" data-delete-schedule="${schedule.id}" aria-label="Hapus jadwal" title="Hapus">&#128465;</button>
              </div>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }).join('');
  refreshCustomSelects(scheduleCards);
}

async function assignOperator(scheduleId) {
  const select = document.querySelector(`[data-assign-select="${scheduleId}"]`);
  const operatorId = select?.value ? Number(select.value) : null;

  try {
    const result = await request(`/api/schedules/${scheduleId}/operator`, {
      method: 'PATCH',
      body: JSON.stringify({ operator_id: operatorId }),
    });
    showToast(result.message);
    await Promise.all([loadUnassigned(), loadRecap(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadRecap() {
  const month = $('#recapMonth').value || currentMonthValue();
  $('#recapMonth').value = month;
  $('#exportPeriodLabel').textContent = monthLabel(month).toUpperCase();

  state.recapSchedules = await request(`/api/schedules?month=${encodeURIComponent(month)}`);
  renderRecap();
}

function renderRecap() {
  const recapCards = $('#recapCards');

  if (!state.recapSchedules.length) {
    recapCards.innerHTML = '<div class="empty-state recap-empty">Belum ada jadwal pada bulan yang dipilih.</div>';
    return;
  }

  const groupedSchedules = state.recapSchedules.reduce((groups, schedule) => {
    if (!groups.has(schedule.tanggal)) {
      groups.set(schedule.tanggal, []);
    }
    groups.get(schedule.tanggal).push(schedule);
    return groups;
  }, new Map());

  recapCards.innerHTML = [...groupedSchedules.entries()].map(([tanggal, schedules], groupIndex) => {
    const dayIndex = groupIndex % 2;
    return `
      <article class="recap-day-card day-tone-${dayIndex}">
        <header class="recap-day-header">
          <div>
            <strong>${formatDayName(tanggal)}, ${formatDate(tanggal)}</strong>
          </div>
          <em>${schedules.length} jadwal</em>
        </header>
        <div class="recap-day-items">
          ${schedules.map((schedule, index) => `
            <div class="recap-schedule-card">
              <div class="recap-schedule-number">${index + 1}</div>
              <div class="recap-schedule-main">
                <strong>${escapeHtml(schedule.keterangan_acara)}</strong>
                <div class="recap-schedule-meta">
                  <span class="time-chip">${escapeHtml(uppercaseTime(schedule.estimasi_jam))}</span>
                  <span class="operator-chip">
                    <small>Operator:</small>
                    ${schedule.operator_nama
                      ? `<span class="badge">${escapeHtml(schedule.operator_nama)}</span>`
                      : '<span class="badge missing">Belum Assigned</span>'}
                  </span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }).join('');
}

async function loadDashboard() {
  const month = currentMonthValue();
  state.currentMonthSchedules = await request(`/api/schedules?month=${month}`);
  const unassigned = state.currentMonthSchedules.filter((item) => !item.operator_id);

  $('#statSchedules').textContent = state.currentMonthSchedules.length;
  $('#statUnassigned').textContent = unassigned.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let upcoming = state.currentMonthSchedules.filter((item) => {
    const [y, m, d] = item.tanggal.split('-').map(Number);
    return new Date(y, m - 1, d) >= today;
  }).slice(0, 6);

  if (!upcoming.length) upcoming = state.currentMonthSchedules.slice(-6);

  const rows = $('#dashboardScheduleRows');
  if (!upcoming.length) {
    rows.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada jadwal bulan ini.</td></tr>';
    return;
  }

  rows.innerHTML = upcoming.map((schedule) => `
    <tr>
      <td>${formatDate(schedule.tanggal)}</td>
      <td>${escapeHtml(schedule.keterangan_acara)}</td>
      <td>${escapeHtml(uppercaseTime(schedule.estimasi_jam))}</td>
      <td>${schedule.operator_nama
        ? `<span class="badge">${escapeHtml(schedule.operator_nama)}</span>`
        : '<span class="badge missing">Belum Assigned</span>'}</td>
    </tr>
  `).join('');
}

function openEditModal(scheduleId) {
  const id = Number(scheduleId);
  const schedule = [
    ...state.recapSchedules,
    ...state.unassigned,
    ...state.currentMonthSchedules,
  ].find((item) => item.id === id);
  if (!schedule) return;

  $('#editScheduleId').value = schedule.id;
  $('#editScheduleDate').value = schedule.tanggal;
  $('#editScheduleDescription').value = schedule.keterangan_acara;
  $('#editScheduleTime').value = schedule.estimasi_jam;
  $('#editScheduleOperator').innerHTML = operatorOptions(schedule.operator_id || '');
  autoResizeTextarea($('#editScheduleDescription'));
  refreshCustomSelects($('#editModal'));
  $('#editModal').classList.add('open');
  $('#editModal').setAttribute('aria-hidden', 'false');
}

function closeEditModal() {
  $('#editModal').classList.remove('open');
  $('#editModal').setAttribute('aria-hidden', 'true');
}

function openPreviewModal(imageUrl, fileName) {
  state.exportImageUrl = imageUrl;
  state.exportFileName = fileName;
  $('#exportPreviewImage').src = imageUrl;
  $('#exportPreviewModal').classList.add('open');
  $('#exportPreviewModal').setAttribute('aria-hidden', 'false');
}

function closePreviewModal() {
  $('#exportPreviewModal').classList.remove('open');
  $('#exportPreviewModal').setAttribute('aria-hidden', 'true');
}

function downloadPreviewImage() {
  if (!state.exportImageUrl) return;

  const link = document.createElement('a');
  link.href = state.exportImageUrl;
  link.download = state.exportFileName || 'ALFACOM-PRODUCTION-Rekap-Jadwal.jpg';
  link.click();
  closePreviewModal();
  showToast('Rekap JPG berhasil didownload.');
}

async function saveEditSchedule(event) {
  event.preventDefault();
  const id = $('#editScheduleId').value;

  const payload = {
    tanggal: $('#editScheduleDate').value,
    keterangan_acara: $('#editScheduleDescription').value.trim(),
    estimasi_jam: uppercaseTime($('#editScheduleTime').value.trim()),
    operator_id: $('#editScheduleOperator').value || null,
  };

  try {
    const result = await request(`/api/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    closeEditModal();
    showToast(result.message);
    await Promise.all([loadUnassigned(), loadRecap(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function confirmDeleteSchedule(id) {
  openConfirmModal({
    title: 'Hapus Jadwal',
    message: 'Jadwal ini akan dihapus permanen dari rekap.',
    actionLabel: 'Hapus Jadwal',
    onConfirm: () => deleteSchedule(id),
  });
}

async function deleteSchedule(id) {

  try {
    const result = await request(`/api/schedules/${id}`, { method: 'DELETE' });
    showToast(result.message);
    await Promise.all([loadUnassigned(), loadRecap(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function exportToJpg() {
  if (typeof html2canvas !== 'function') {
    showToast('Library html2canvas belum termuat.', 'error');
    return;
  }

  if (!state.recapSchedules.length) {
    showToast('Tidak ada jadwal untuk diekspor.', 'error');
    return;
  }

  const exportArea = $('#exportArea');
  const hiddenElements = [...exportArea.querySelectorAll('.export-hide')];
  hiddenElements.forEach((el) => { el.dataset.previousDisplay = el.style.display; el.style.display = 'none'; });
  exportArea.classList.add('is-exporting');

  $('#exportGeneratedAt').textContent = `Diekspor ${new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date())}`;

  try {
    showToast('Menyiapkan gambar rekap...');
    const canvas = await html2canvas(exportArea, {
      backgroundColor: '#17171c',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: Math.max(exportArea.scrollWidth, 900),
    });

    const month = $('#recapMonth').value;
    openPreviewModal(
      canvas.toDataURL('image/jpeg', 0.95),
      `ALFACOM-PRODUCTION-Rekap-Jadwal-${month}.jpg`
    );
    showToast('Preview JPG siap.');
  } catch (error) {
    console.error(error);
    showToast('Gagal membuat file JPG.', 'error');
  } finally {
    exportArea.classList.remove('is-exporting');
    hiddenElements.forEach((el) => { el.style.display = el.dataset.previousDisplay || ''; });
  }
}

function setTodayLabel() {
  $('#todayLabel').textContent = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function applySidebarState() {
  const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  $('.app-shell').classList.toggle('sidebar-collapsed', isCollapsed);
  $('#sidebarToggle').setAttribute('aria-label', isCollapsed ? 'Besarkan sidebar' : 'Kecilkan sidebar');
  $('#sidebarToggle').setAttribute('title', isCollapsed ? 'Besarkan sidebar' : 'Kecilkan sidebar');
}

function toggleSidebarCollapse() {
  const shell = $('.app-shell');
  const nextState = !shell.classList.contains('sidebar-collapsed');
  shell.classList.toggle('sidebar-collapsed', nextState);
  localStorage.setItem('sidebarCollapsed', String(nextState));
  applySidebarState();
}

function bindEvents() {
  $$('.nav-item').forEach((item) => {
    item.addEventListener('click', () => switchSection(item.dataset.section));
  });

  $$('[data-go]').forEach((button) => {
    button.addEventListener('click', () => switchSection(button.dataset.go));
  });

  $('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#sidebarToggle').addEventListener('click', toggleSidebarCollapse);
  $('#openOperatorModal').addEventListener('click', openOperatorModal);
  $('#closeOperatorModal').addEventListener('click', closeOperatorModal);
  $('#cancelOperatorModal').addEventListener('click', closeOperatorModal);
  $('#openScheduleModal').addEventListener('click', openScheduleModal);
  $('#closeScheduleModal').addEventListener('click', closeScheduleModal);
  $('#operatorForm').addEventListener('submit', addOperator);
  $('#scheduleForm').addEventListener('submit', addSchedule);
  $('#scheduleForm').addEventListener('reset', () => {
    setTimeout(() => refreshCustomSelects($('#scheduleForm')), 0);
  });
  $('#scheduleTime').addEventListener('input', (event) => {
    const cursorPosition = event.target.selectionStart;
    event.target.value = uppercaseTime(event.target.value);
    event.target.setSelectionRange(cursorPosition, cursorPosition);
  });
  bindAutoResizeTextarea($('#scheduleDescription'));
  bindAutoResizeTextarea($('#editScheduleDescription'));
  $('#operatorEditForm').addEventListener('submit', saveOperatorEdit);
  $('#recapMonth').addEventListener('change', loadRecap);
  $('#manageMonth').addEventListener('change', loadUnassigned);
  $('#exportJpg').addEventListener('click', exportToJpg);
  $('#editScheduleForm').addEventListener('submit', saveEditSchedule);
  $('#closeEditModal').addEventListener('click', closeEditModal);
  $('#cancelEdit').addEventListener('click', closeEditModal);
  $('#closeOperatorEditModal').addEventListener('click', closeOperatorEditModal);
  $('#cancelOperatorEdit').addEventListener('click', closeOperatorEditModal);
  $('#closeConfirmModal').addEventListener('click', closeConfirmModal);
  $('#cancelConfirm').addEventListener('click', closeConfirmModal);
  $('#confirmAction').addEventListener('click', runConfirmAction);
  $('#closePreviewModal').addEventListener('click', closePreviewModal);
  $('#cancelPreview').addEventListener('click', closePreviewModal);
  $('#downloadPreview').addEventListener('click', downloadPreviewImage);

  $('#editModal').addEventListener('click', (event) => {
    if (event.target === $('#editModal')) closeEditModal();
  });

  $('#operatorModal').addEventListener('click', (event) => {
    if (event.target === $('#operatorModal')) closeOperatorModal();
  });

  $('#scheduleModal').addEventListener('click', (event) => {
    if (event.target === $('#scheduleModal')) closeScheduleModal();
  });

  $('#operatorEditModal').addEventListener('click', (event) => {
    if (event.target === $('#operatorEditModal')) closeOperatorEditModal();
  });

  $('#confirmModal').addEventListener('click', (event) => {
    if (event.target === $('#confirmModal')) closeConfirmModal();
  });

  $('#exportPreviewModal').addEventListener('click', (event) => {
    if (event.target === $('#exportPreviewModal')) closePreviewModal();
  });

  document.addEventListener('click', (event) => {
    const customSelectButton = event.target.closest('.custom-select-button');
    if (customSelectButton) {
      const wrapper = customSelectButton.closest('.custom-select');
      const willOpen = !wrapper.classList.contains('open');
      closeCustomSelects(wrapper);
      wrapper.classList.toggle('open', willOpen);
      customSelectButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      return;
    }

    const customSelectOption = event.target.closest('.custom-select-option');
    if (customSelectOption) {
      const wrapper = customSelectOption.closest('.custom-select');
      const select = wrapper.previousElementSibling;
      select.value = customSelectOption.dataset.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncCustomSelect(select);
      closeCustomSelects();
      return;
    }

    if (!event.target.closest('.custom-select')) {
      closeCustomSelects();
    }

    const actionToggle = event.target.closest('[data-toggle-schedule-actions]');
    if (actionToggle) {
      const card = actionToggle.closest('.assign-schedule-card');
      const willOpen = !card.classList.contains('actions-open');
      $$('.assign-schedule-card.actions-open').forEach((item) => {
        if (item !== card) {
          item.classList.remove('actions-open');
          item.querySelector('[data-toggle-schedule-actions]')?.setAttribute('aria-expanded', 'false');
        }
      });
      card.classList.toggle('actions-open', willOpen);
      actionToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      return;
    }

    if (!event.target.closest('.assign-schedule-card')) {
      $$('.assign-schedule-card.actions-open').forEach((item) => {
        item.classList.remove('actions-open');
        item.querySelector('[data-toggle-schedule-actions]')?.setAttribute('aria-expanded', 'false');
      });
    }

    const operatorEdit = event.target.closest('[data-edit-operator]');
    if (operatorEdit) openOperatorEditModal(operatorEdit.dataset.editOperator);

    const operatorDelete = event.target.closest('[data-delete-operator]');
    if (operatorDelete) confirmDeleteOperator(operatorDelete.dataset.deleteOperator);

    const assign = event.target.closest('[data-assign-schedule]');
    if (assign) {
      assign.closest('.assign-schedule-card')?.classList.remove('actions-open');
      assignOperator(assign.dataset.assignSchedule);
    }

    const edit = event.target.closest('[data-edit-schedule]');
    if (edit) {
      edit.closest('.assign-schedule-card')?.classList.remove('actions-open');
      openEditModal(edit.dataset.editSchedule);
    }

    const scheduleDelete = event.target.closest('[data-delete-schedule]');
    if (scheduleDelete) {
      scheduleDelete.closest('.assign-schedule-card')?.classList.remove('actions-open');
      confirmDeleteSchedule(scheduleDelete.dataset.deleteSchedule);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeEditModal();
      closeScheduleModal();
      closeOperatorModal();
      closeOperatorEditModal();
      closeConfirmModal();
      closePreviewModal();
      closeCustomSelects();
    }
  });
}

async function init() {
  setTodayLabel();
  applySidebarState();
  $('#recapMonth').value = currentMonthValue();
  $('#manageMonth').value = currentMonthValue();
  $('#scheduleDate').value = new Date().toISOString().slice(0, 10);
  bindEvents();
  refreshCustomSelects();
  restoreActiveSection();

  try {
    await loadOperators();
    await Promise.all([loadUnassigned(), loadRecap(), loadDashboard()]);
  } catch (error) {
    console.error(error);
    showToast(`Gagal memuat data: ${error.message}`, 'error');
  }
}

init();
