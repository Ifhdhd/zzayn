
// === Firebase Admin Premium — script.js (Fixed for Device Id in Multi-Edit) ===

// NOTE: This file replaces the previous script.js exactly, but with the added Device Id support in multi-edit.

let allData = [];
let editIndex = null;

// --- Utility Functions ---
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function getSelectedKeys(){ return Array.from(document.querySelectorAll('.ck:checked')).map(c => c.dataset.key); }
function toggleAll(src){ document.querySelectorAll('.ck').forEach(c => c.checked = src.checked); }

// --- Config Handling ---
function saveConfig(){
  const url = dbUrl.value.trim();
  const secret = dbSecret.value.trim();
  if(!url){ alert('Isi Database URL!'); return; }
  localStorage.setItem('db_url', url);
  window._FB_SECRET = secret;
  alert('URL disimpan. Secret tidak disimpan.');
}
function clearConfig(){
  dbUrl.value=''; dbSecret.value=''; localStorage.removeItem('db_url'); window._FB_SECRET='';
  allData=[]; renderData();
}

// --- Load Data ---
function loadData(){
  const url = (dbUrl.value.trim() || localStorage.getItem('db_url') || '');
  const secret = (dbSecret.value.trim() || window._FB_SECRET || '');
  if(!url){ alert('Isi Database URL!'); return; }

  fetch(url + (url.endsWith('.json')?'':'.json') + '?auth=' + encodeURIComponent(secret))
    .then(r=>r.json()).then(data=>{
      allData=[];
      if(Array.isArray(data)){
        data.forEach((item,i)=>{ if(item && typeof item==='object') allData.push({...item,nodeKey:i}); });
      } else if(data && typeof data==='object'){
        Object.keys(data).forEach(k=>{ const item=data[k]; if(item && typeof item==='object') allData.push({...item,nodeKey:k}); });
      }
      renderData();
    })
    .catch(e=>alert('Gagal memuat: '+e));
}

// --- Render Table ---
function renderData(){
  const tbody = dataBody;
  tbody.innerHTML='';
  const searchVal = (search.value || '').toLowerCase();
  const filtered = allData.filter(item=>{
    const dev = (item['Device Id']||'').toLowerCase();
    const uname=(item.username||'').toLowerCase();
    return !searchVal || dev.includes(searchVal) || uname.includes(searchVal);
  });
  filtered.forEach((item,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><input type="checkbox" class="ck" data-key="${item.nodeKey}"></td>
      <td>${i}</td>
      <td>${escapeHtml(item['Device Id']||'')}</td>
      <td>${escapeHtml(item.username||'')}</td>
      <td>${escapeHtml(item.password||'')}</td>
      <td>${escapeHtml(item.expiry||'')}</td>
      <td>
        <button class="btn ghost" onclick="editUser('${item.nodeKey}')">Edit</button>
        <button class="btn danger" onclick="delUser('${item.nodeKey}')">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  totalCount.textContent = filtered.length;
  userCount.textContent = 'Users: ' + allData.length;
  if(checkAll) checkAll.checked=false;
}

// --- Edit Single ---
function editUser(key){
  const item = allData.find(d=>String(d.nodeKey)===String(key));
  if(!item) return;
  editIndex=key;
  modal.classList.add('show');
  device_id.value=item['Device Id']||'';
  username.value=item.username||'';
  password.value=item.password||'';
  expiry.value=item.expiry||'';
}
function closeModal(){ modal.classList.remove('show'); editIndex=null; }

function saveUser(){
  const url=(dbUrl.value.trim()||localStorage.getItem('db_url')||'');
  const secret=(dbSecret.value.trim()||window._FB_SECRET||'');
  if(!url){ alert('Isi Database URL'); return; }
  const obj={
    "Device Id": device_id.value.trim(),
    username:username.value.trim(),
    password:password.value.trim(),
    expiry:expiry.value.trim()
  };
  const node = editIndex;
  fetch(url.replace(/\.json$/,'')+'/'+node+'.json?auth='+encodeURIComponent(secret),{
    method:'PUT', body:JSON.stringify(obj)
  }).then(()=>{ closeModal(); loadData(); });
}

// --- Delete Single ---
function delUser(key){
  if(!confirm('Hapus data ini?')) return;
  const url=(dbUrl.value.trim()||localStorage.getItem('db_url')||'');
  const secret=(dbSecret.value.trim()||window._FB_SECRET||'');
  fetch(url.replace(/\.json$/,'')+'/'+key+'.json?auth='+encodeURIComponent(secret),{method:'DELETE'})
    .then(()=>loadData());
}

// --- Multi Edit (FIXED: Device Id included) ---
function openMultiEdit(){
  if(getSelectedKeys().length===0){ alert('Pilih data!'); return; }
  multiModal.classList.add('show');
}
function closeMulti(){ multiModal.classList.remove('show'); }

function applyMultiEdit(){
  const url=(dbUrl.value.trim()||localStorage.getItem('db_url')||'');
  const secret=(dbSecret.value.trim()||window._FB_SECRET||'');

  const dev = multi_deviceid.value.trim();    // NEW FIX
  const u   = multi_username.value.trim();
  const p   = multi_password.value.trim();
  const e   = multi_expiry.value.trim();

  const keys = getSelectedKeys();
  if(keys.length===0){ alert('Tidak ada data dipilih'); return; }

  keys.forEach(k=>{
    const update={};
    if(dev) update["Device Id"]=dev;   // <--- FIX
    if(u)   update.username=u;
    if(p)   update.password=p;
    if(e)   update.expiry=e;

    fetch(url.replace(/\.json$/,'')+'/'+k+'.json?auth='+encodeURIComponent(secret),{
      method:'PATCH', body:JSON.stringify(update)
    });
  });

  alert('Edit massal selesai');
  closeMulti();
  loadData();
}

// --- Multi Delete ---
function deleteSelected(){
  const keys=getSelectedKeys();
  if(keys.length===0){ alert('Tidak ada data dipilih');return;}
  if(!confirm('Hapus '+keys.length+' data?'))return;

  const url=(dbUrl.value.trim()||localStorage.getItem('db_url')||'');
  const secret=(dbSecret.value.trim()||window._FB_SECRET||'');

  keys.forEach(k=>{
    fetch(url.replace(/\.json$/,'')+'/'+k+'.json?auth='+encodeURIComponent(secret),{method:'DELETE'});
  });
  alert('Hapus selesai');
  loadData();
}

// --- Export Selected ---
function exportSelected(){
  const keys=getSelectedKeys();
  if(keys.length===0){ alert('Pilih data!');return; }
  const obj={};
  keys.forEach(k=>{
    const item=allData.find(d=>String(d.nodeKey)===String(k));
    if(item) obj[k]=item;
  });
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='export-selected.json'; a.click();
  URL.revokeObjectURL(url);
}
