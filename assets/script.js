
// Firebase Admin Premium - final script (includes Device Id multi-edit fix)
let allData = [];
let editIndex = null;

const $ = id => document.getElementById(id);
const escapeHtml = s => String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// config functions
function focusConfig(){ $('dbUrl').focus(); }
function saveConfig(){
  const url = $('dbUrl').value.trim();
  const secret = $('dbSecret').value.trim();
  if(!url){ alert('Isi Database URL!'); return; }
  localStorage.setItem('db_url', url);
  window._FB_SECRET = secret;
  alert('URL disimpan. Secret tidak disimpan.');
}
function clearConfig(){
  $('dbUrl').value=''; $('dbSecret').value=''; localStorage.removeItem('db_url'); window._FB_SECRET=''; allData=[]; renderData();
}

// load data (supports array or object)
function loadData(){
  const urlInput = $('dbUrl').value.trim();
  const urlStored = localStorage.getItem('db_url') || '';
  const url = urlInput || urlStored;
  const secret = ($('dbSecret').value.trim() || window._FB_SECRET || '');
  if(!url){ alert('Isi Database URL!'); return; }

  fetch(url + (url.endsWith('.json') ? '' : '.json') + '?auth=' + encodeURIComponent(secret))
    .then(r => r.json())
    .then(data => {
      allData = [];
      if(Array.isArray(data)){
        data.forEach((item, idx) => { if(item && typeof item === 'object') allData.push(Object.assign({ nodeKey: idx }, item)); });
      } else if(data && typeof data === 'object'){
        Object.keys(data).forEach(k => { const item = data[k]; if(item && typeof item === 'object') allData.push(Object.assign({ nodeKey: k }, item)); });
      }
      renderData();
    })
    .catch(err => { alert('Gagal memuat data. Cek URL/SECRET. ' + err); });
}

// render table (uses "Device Id" exactly)
function renderData(){
  const tbody = $('dataBody');
  if(!tbody) return;
  const searchVal = String($('search')?.value || '').toLowerCase();
  tbody.innerHTML = '';
  const filtered = allData.filter(item => {
    const dev = String(item['Device Id'] || '').toLowerCase();
    const uname = String(item.username || '').toLowerCase();
    return !searchVal || dev.includes(searchVal) || uname.includes(searchVal);
  });
  filtered.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="ck" data-key="${escapeHtml(item.nodeKey)}"></td>
      <td>${idx}</td>
      <td>${escapeHtml(item['Device Id'] || '')}</td>
      <td>${escapeHtml(item.username || '')}</td>
      <td>${escapeHtml(item.password || '')}</td>
      <td>${escapeHtml(item.expiry || '')}</td>
      <td>
        <button class="btn ghost" onclick="editUser('${escapeHtml(item.nodeKey)}')">Edit</button>
        <button class="btn danger" onclick="delUser('${escapeHtml(item.nodeKey)}')">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  const total = $('totalCount'); if(total) total.textContent = filtered.length;
  const userCount = $('userCount'); if(userCount) userCount.textContent = 'Users: ' + allData.length;
  const chkAll = $('checkAll'); if(chkAll) chkAll.checked = false;
}

// checkbox helpers
function toggleAll(src){ document.querySelectorAll('.ck').forEach(c => c.checked = src.checked); }
function getSelectedKeys(){ return Array.from(document.querySelectorAll('.ck:checked')).map(c => c.dataset.key); }

// single edit
function editUser(key){
  const item = allData.find(d => String(d.nodeKey) === String(key));
  if(!item) return;
  editIndex = key;
  $('modal').classList.add('show');
  $('device_id').value = item['Device Id'] || '';
  $('username').value = item.username || '';
  $('password').value = item.password || '';
  $('expiry').value = item.expiry || '';
  $('modalTitle').innerText = 'Edit User';
}
function closeModal(){ $('modal').classList.remove('show'); editIndex = null; }

function saveUser(){
  const url = ($('dbUrl').value.trim() || localStorage.getItem('db_url') || '');
  const secret = ($('dbSecret').value.trim() || window._FB_SECRET || '');
  if(!url){ alert('Isi Database URL!'); return; }
  const obj = {
    "Device Id": $('device_id').value.trim(),
    username: $('username').value.trim(),
    password: $('password').value.trim(),
    expiry: $('expiry').value.trim()
  };
  if(editIndex === null || editIndex === undefined){ alert('No target node'); return; }
  fetch(url.replace(/\.json$/,'') + '/' + editIndex + '.json?auth=' + encodeURIComponent(secret), {
    method: 'PUT', body: JSON.stringify(obj)
  }).then(()=>{ closeModal(); loadData(); });
}

// single delete
function delUser(key){
  if(!confirm('Hapus data ini?')) return;
  const url = ($('dbUrl').value.trim() || localStorage.getItem('db_url') || '');
  const secret = ($('dbSecret').value.trim() || window._FB_SECRET || '');
  fetch(url.replace(/\.json$/,'') + '/' + key + '.json?auth=' + encodeURIComponent(secret), { method: 'DELETE' })
    .then(()=> loadData());
}

// multi-edit (now includes Device Id)
function openMultiEdit(){
  if(getSelectedKeys().length === 0){ alert('Pilih data!'); return; }
  $('multiModal').classList.add('show');
}
function closeMulti(){ $('multiModal').classList.remove('show'); }

function applyMultiEdit(){
  const url = ($('dbUrl').value.trim() || localStorage.getItem('db_url') || '');
  const secret = ($('dbSecret').value.trim() || window._FB_SECRET || '');
  if(!url){ alert('Isi Database URL!'); return; }

  const dev = $('multi_deviceid').value.trim();
  const u = $('multi_username').value.trim();
  const p = $('multi_password').value.trim();
  const e = $('multi_expiry').value.trim();

  const keys = getSelectedKeys();
  if(keys.length === 0){ alert('Tidak ada data dipilih'); return; }

  keys.forEach(k => {
    const update = {};
    if(dev) update["Device Id"] = dev;
    if(u) update.username = u;
    if(p) update.password = p;
    if(e) update.expiry = e;

    fetch(url.replace(/\.json$/,'') + '/' + k + '.json?auth=' + encodeURIComponent(secret), {
      method: 'PATCH', body: JSON.stringify(update)
    });
  });

  alert('Edit massal selesai');
  closeMulti();
  loadData();
}

// multi-delete
function deleteSelected(){
  const keys = getSelectedKeys();
  if(keys.length === 0){ alert('Tidak ada data dipilih'); return; }
  if(!confirm('Hapus ' + keys.length + ' data?')) return;
  const url = ($('dbUrl').value.trim() || localStorage.getItem('db_url') || '');
  const secret = ($('dbSecret').value.trim() || window._FB_SECRET || '');
  keys.forEach(k => {
    fetch(url.replace(/\.json$/,'') + '/' + k + '.json?auth=' + encodeURIComponent(secret), { method: 'DELETE' });
  });
  alert('Hapus selesai');
  loadData();
}

// export selected
function exportSelected(){
  const keys = getSelectedKeys();
  if(keys.length === 0){ alert('Pilih data untuk export'); return; }
  const out = {};
  keys.forEach(k => {
    const item = allData.find(d => String(d.nodeKey) === String(k));
    if(item) out[k] = item;
  });
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'export-selected.json'; a.click();
  URL.revokeObjectURL(a.href);
}

// init
document.addEventListener('DOMContentLoaded', () => {
  const url = localStorage.getItem('db_url') || '';
  if(url) $('dbUrl').value = url;
});
