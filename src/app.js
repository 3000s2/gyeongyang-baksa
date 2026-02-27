// 나만의 경영박사 v4.5
const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
const fC=n=>'$'+Number(n||0).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2})+' CAD';
const fN=n=>Number(n||0).toLocaleString();
const today=()=>new Date().toISOString().slice(0,10);
const monthAgo=(m=1)=>{const d=new Date();d.setMonth(d.getMonth()-m);return d.toISOString().slice(0,10);};
const fSize=b=>b<1024?b+'B':b<1048576?(b/1024).toFixed(1)+'KB':(b/1048576).toFixed(1)+'MB';
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const PG=50;

// GloriaFood auto-poll listener
if(window.api?.onGlfAutoPoll){
  window.api.onGlfAutoPoll((result)=>{
    // Show in-app toast notification
    let toast=document.getElementById('glfToast');
    if(!toast){toast=document.createElement('div');toast.id='glfToast';toast.style.cssText='position:fixed;top:20px;right:20px;z-index:99999;padding:14px 20px;border-radius:10px;background:#2d5016;color:#fff;font-size:0.95em;box-shadow:0 4px 20px rgba(0,0,0,0.3);cursor:pointer;transition:opacity 0.3s;max-width:360px';toast.onclick=()=>{toast.style.opacity='0';setTimeout(()=>toast.remove(),300);};document.body.appendChild(toast);}
    const parts=[];
    if(result.newOrders>0)parts.push(`새 주문 ${result.newOrders}건`);
    if(result.updated>0)parts.push(`업데이트 ${result.updated}건`);
    if(result.cancelled>0)parts.push(`취소 ${result.cancelled}건`);
    toast.innerHTML=`🍕 <b>GloriaFood</b> — ${parts.join(' / ')}`;
    toast.style.opacity='1';
    setTimeout(()=>{if(toast){toast.style.opacity='0';setTimeout(()=>{try{toast.remove();}catch(e){}},300);}},6000);
    // Auto-refresh PO list if currently on PO page
    if(typeof refreshPO==='function' && typeof _poPg!=='undefined'){try{refreshPO(_poPg);}catch(e){}}
  });
}

const _f={
  dash:{from:monthAgo(1),to:today(),cid:'',cname:''},
  po:{from:monthAgo(3),to:today(),sr:''},
  exp:{from:monthAgo(3),to:today(),sr:''},
  sh:{from:monthAgo(3),to:today(),pid:''},
  cr:{cid:'',from:monthAgo(3),to:today()}
};

function nav(p,el){$$('.nav').forEach(n=>n.classList.remove('active'));if(el)el.classList.add('active');load(p);}
let _mdt=null;
document.addEventListener('DOMContentLoaded',()=>{const mod=$('#mod');mod.addEventListener('mousedown',e=>{_mdt=e.target;});mod.addEventListener('mouseup',e=>{if(e.target===mod&&_mdt===mod)closeM();_mdt=null;});});
function closeM(){$('#mod').style.display='none';}
function openM(h,cls){const box=$('#modBox');box.className='modal-box'+(cls?' '+cls:'');box.innerHTML=h;$('#mod').style.display='flex';setTimeout(()=>{const f=$('#modBox input:not([type=hidden]):not([disabled])');if(f)f.focus();},100);}

function showLoading(el){if(typeof el==='string')el=$(el);if(el)el.innerHTML='<div class="loading">로딩 중...</div>';}
function showInlineErr(msg){const box=$('#modBox');if(!box)return;let e=box.querySelector('.inline-err');if(!e){e=document.createElement('div');e.className='inline-err';box.prepend(e);}e.innerHTML=`<div class="info-box err" style="margin-bottom:12px">⚠️ ${msg}</div>`;setTimeout(()=>{if(e)e.innerHTML='';},3000);}

function validate(rules){let ok=true;$$('.error').forEach(e=>e.classList.remove('error'));$$('.error-msg').forEach(e=>e.remove());
  for(const{id,label,type,min,max}of rules){const el=$('#'+id);if(!el)continue;let val=el.value,err='';
    if(type==='required'&&!val.trim())err=`${label} is required`;
    if(type==='number'){const n=parseFloat(val);if(isNaN(n))err=`${label}: enter a number`;else if(min!==undefined&&n<min)err=`${label}: min ${min}`;else if(max!==undefined&&n>max)err=`${label}: max ${max}`;}
    if(type==='select'&&!val)err=`Please select ${label}`;
    if(type==='date'&&!val)err=`${label} is required`;
    if(err){el.classList.add('error');const m=document.createElement('div');m.className='error-msg';m.innerText=err;el.parentNode.appendChild(m);ok=false;}}return ok;}

let _ch=[];function destroyCharts(){_ch.forEach(c=>c.destroy());_ch=[];}
function makeChart(id,cfg){const c=document.getElementById(id);if(!c)return;const ch=new Chart(c,cfg);_ch.push(ch);return ch;}

function renderPager(total,cur,fn){const tp=Math.ceil(total/PG);if(tp<=1)return `<div class="pager"><span>${fN(total)} records</span></div>`;
  let h='<div class="pager">';h+=`<button ${cur<=1?'disabled':''} onclick="${fn}(1)">«</button><button ${cur<=1?'disabled':''} onclick="${fn}(${cur-1})">‹</button>`;
  const s=Math.max(1,cur-2),e=Math.min(tp,cur+2);for(let i=s;i<=e;i++)h+=`<button class="${i===cur?'active':''}" onclick="${fn}(${i})">${i}</button>`;
  h+=`<button ${cur>=tp?'disabled':''} onclick="${fn}(${cur+1})">›</button><button ${cur>=tp?'disabled':''} onclick="${fn}(${tp})">»</button>`;
  h+=`<span>${fN(total)} of ${(cur-1)*PG+1}-${Math.min(cur*PG,total)}</span></div>`;return h;}

// Autocomplete helper — creates a dropdown list below an input
function setupAutocomplete(inputId, getData, onSelect) {
  const inp = $('#'+inputId);
  if(!inp) return;
  // Remove any existing autocomplete list on this input
  const existing = inp.parentNode.querySelector('.autocomplete-list');
  if(existing) existing.remove();

  let listEl = document.createElement('div');
  listEl.className = 'autocomplete-list';
  inp.parentNode.style.position = 'relative';
  inp.parentNode.appendChild(listEl);

  const hideList = () => { listEl.style.display = 'none'; listEl.style.pointerEvents = 'none'; };
  const showList = () => { listEl.style.display = 'block'; listEl.style.pointerEvents = 'auto'; };
  hideList();

  inp.addEventListener('input', async () => {
    const val = inp.value.trim();
    if(val.length < 1) { listEl.innerHTML = ''; hideList(); return; }
    const items = await getData(val);
    if(items.length === 0) { listEl.innerHTML = ''; hideList(); return; }
    listEl.innerHTML = items.map((it,i) => `<div class="ac-item" data-idx="${i}">${it.display}</div>`).join('');
    showList();
    listEl.querySelectorAll('.ac-item').forEach((el,i) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onSelect(items[i]);
        listEl.innerHTML = '';
        hideList();
      });
    });
  });
  inp.addEventListener('blur', () => { setTimeout(hideList, 200); });
  inp.addEventListener('focus', () => { if(listEl.innerHTML) showList(); });
}

// Keyboard shortcuts
document.addEventListener('keydown',e=>{if($('#mod').style.display==='flex'&&e.key==='Escape')closeM();});

// ============================================================
// DASHBOARD
// ============================================================
async function loadDash(){destroyCharts();$('#hd').innerText='대시보드';
  $('#ct').innerHTML=`<div class="filter-bar">
    <div class="fg"><label>From</label><input type="date" id="dFrom" value="${_f.dash.from}"></div>
    <div class="fg"><label>To</label><input type="date" id="dTo" value="${_f.dash.to}"></div>
    <div class="fg" style="flex:1;position:relative"><label>Customer (optional)</label><input id="dCust" placeholder="Search customer..." autocomplete="off" value="${_f.dash.cname||''}"><input type="hidden" id="dCustId" value="${_f.dash.cid||''}"></div>
    <button class="btn" onclick="refreshDash()">Search</button>
  </div><div id="dashC"><div class="loading">로딩 중...</div></div>`;
  setTimeout(()=>{
    setupAutocomplete('dCust',async(val)=>{
      const cs=(await api.query("SELECT id,cust_id,name,type FROM customers WHERE name LIKE ? OR cust_id LIKE ? LIMIT 8",['%'+val+'%','%'+val+'%'])).data;
      return cs.map(c=>({display:`${c.cust_id} - ${c.name}`,value:c.name,id:c.id}));
    },(item)=>{$('#dCust').value=item.display;$('#dCustId').value=item.id;_f.dash.cid=item.id;_f.dash.cname=item.display;});
  },100);
  refreshDash();}

window.refreshDash=async()=>{destroyCharts();showLoading('#dashC');
  _f.dash.from=$('#dFrom').value;_f.dash.to=$('#dTo').value;
  if($('#dCustId'))_f.dash.cid=$('#dCustId').value;
  if($('#dCust')){_f.dash.cname=$('#dCust').value;if(!_f.dash.cname.trim()){_f.dash.cid='';$('#dCustId').value='';}}
  const from=_f.dash.from,to=_f.dash.to,cid=_f.dash.cid;

  // Low stock alert (always shown)
  const low=(await api.query("SELECT name,quantity,alert_qty,uom FROM materials WHERE quantity<=alert_qty AND alert_qty>0")).data;
  let al='';
  if(low.length>0) al=`<div class="alert-bar danger">⚠️ Low Stock: ${low.map(p=>`<strong>${p.name}</strong> (${p.quantity} ${p.uom})`).join(', ')}</div>`;

  if(cid){
    // === CUSTOMER VIEW ===
    const cust=(await api.query("SELECT * FROM customers WHERE id=?",[cid])).data[0];
    const rev=(await api.query("SELECT COUNT(*) as cnt,COALESCE(SUM(total),0) as s FROM purchase_orders WHERE customer_id=? AND order_date>=? AND order_date<=?",[cid,from,to])).data[0];
    const top5=(await api.query("SELECT pi.product_name,SUM(pi.qty) as tq,SUM(pi.total) as ta FROM purchase_orders po JOIN po_items pi ON pi.po_id=po.id WHERE po.customer_id=? AND po.order_date>=? AND po.order_date<=? GROUP BY pi.product_name ORDER BY tq DESC LIMIT 5",[cid,from,to])).data;

    let topHtml='';
    if(top5.length>0){
      topHtml=`<table><tr><th>#</th><th>Product</th><th>Qty</th><th>Amount</th></tr>`;
      top5.forEach((t,i)=>{topHtml+=`<tr><td>${i+1}</td><td><strong>${t.product_name}</strong></td><td>${fN(t.tq)}</td><td class="text-green">${fC(t.ta)}</td></tr>`;});
      topHtml+=`</table>`;
    } else {
      topHtml=`<p style="color:var(--text-muted);text-align:center;padding:20px">No orders in this period</p>`;
    }

    $('#dashC').innerHTML=`${al}
      <div style="background:var(--card);border-radius:12px;padding:16px 20px;margin-bottom:16px;border:1px solid var(--border)">
        <span class="badge ${cust?.type==='business'?'badge-blue':'badge-green'}" style="font-size:.75em">${cust?.type==='business'?'Business':'Individual'}</span>
        <strong style="margin-left:6px;font-size:1.1em">${cust?.cust_id} — ${cust?.name||''}</strong>
        ${cust?.phone?`<span style="margin-left:12px;color:var(--text-muted)">${cust.phone}</span>`:''}
      </div>
      <div class="grid">
        <div class="card"><h3>Total Orders</h3><h2>${fN(rev.cnt)}</h2></div>
        <div class="card"><h3>Total Revenue</h3><h2 class="text-green">${fC(rev.s)}</h2></div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Top 5 Items</h3>${topHtml}</div>`;
  } else {
    // === OVERALL VIEW ===
    const rev=(await api.query("SELECT COUNT(*) as cnt,COALESCE(SUM(total),0) as s FROM purchase_orders WHERE order_date>=? AND order_date<=?",[from,to])).data[0];
    const exp=(await api.query("SELECT COUNT(*) as cnt,COALESCE(SUM(amount),0) as e FROM expenses WHERE date>=? AND date<=?",[from,to])).data[0];
    const np=rev.s-exp.e;
    const top5=(await api.query("SELECT pi.product_name,SUM(pi.qty) as tq,SUM(pi.total) as ta FROM purchase_orders po JOIN po_items pi ON pi.po_id=po.id WHERE po.order_date>=? AND po.order_date<=? GROUP BY pi.product_name ORDER BY tq DESC LIMIT 5",[from,to])).data;

    // Monthly trend
    const moPo=(await api.query(`SELECT strftime('%Y-%m',order_date) as m,SUM(total) as r FROM purchase_orders WHERE order_date>=? AND order_date<=? GROUP BY m ORDER BY m`,[from,to])).data;
    const moExp=(await api.query(`SELECT strftime('%Y-%m',date) as m,SUM(amount) as e FROM expenses WHERE date>=? AND date<=? GROUP BY m ORDER BY m`,[from,to])).data;
    const months=new Set([...moPo.map(r=>r.m),...moExp.map(r=>r.m)]);
    const moAll=[...months].sort().map(m=>({m,r:(moPo.find(x=>x.m===m)||{}).r||0,e:(moExp.find(x=>x.m===m)||{}).e||0}));

    let topHtml='';
    if(top5.length>0){
      topHtml=`<table><tr><th>#</th><th>Product</th><th>Qty</th><th>Amount</th></tr>`;
      top5.forEach((t,i)=>{topHtml+=`<tr><td>${i+1}</td><td><strong>${t.product_name}</strong></td><td>${fN(t.tq)}</td><td class="text-green">${fC(t.ta)}</td></tr>`;});
      topHtml+=`</table>`;
    } else {
      topHtml=`<p style="color:var(--text-muted);text-align:center;padding:20px">No orders in this period</p>`;
    }

    $('#dashC').innerHTML=`${al}
      <div class="grid">
        <div class="card"><h3>Total Orders</h3><h2>${fN(rev.cnt)}</h2></div>
        <div class="card"><h3>Revenue</h3><h2 class="text-green">${fC(rev.s)}</h2></div>
        <div class="card"><h3>Expenses</h3><h2 class="text-red">${fC(exp.e)}</h2><p style="font-size:.8em;color:var(--text-muted)">${exp.cnt} items</p></div>
        <div class="card"><h3>Net Profit</h3><h2 style="color:${np>=0?'var(--green)':'var(--red)'};">${fC(np)}</h2></div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Top 5 Items</h3>${topHtml}</div>
      <div class="chart-row"><div class="chart-box"><h3>Revenue vs Expense</h3><canvas id="chBar" height="140"></canvas></div><div class="chart-box"><h3>Monthly Trend</h3><canvas id="chLine" height="140"></canvas></div></div>`;

    makeChart('chBar',{type:'bar',data:{labels:['Revenue','Expenses','Net Profit'],datasets:[{data:[rev.s,exp.e,np],backgroundColor:['#27AE60','#C0392B','#8B6F4E'],borderRadius:6}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
    if(moAll.length>0)makeChart('chLine',{type:'line',data:{labels:moAll.map(m=>m.m),datasets:[{label:'Revenue',data:moAll.map(m=>m.r),borderColor:'#27AE60',backgroundColor:'rgba(39,174,96,.1)',fill:true,tension:.3},{label:'Expenses',data:moAll.map(m=>m.e),borderColor:'#C0392B',backgroundColor:'rgba(192,57,43,.1)',fill:true,tension:.3}]},options:{plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});
  }
};

// ============================================================
// COMPANY INFO
// ============================================================
async function loadCompanyInfo(){destroyCharts();$('#hd').innerText='Company Info';
  const ci=(await api.query("SELECT * FROM company_info WHERE id=1")).data[0]||{};
  $('#ct').innerHTML=`<div class="card" style="max-width:650px">
    <h3 style="font-size:1em;margin-bottom:16px">Company Information</h3>
    <div class="fg"><label>Company Name</label><input id="ciName" value="${ci.name||''}"></div>
    <div class="fg"><label>Address</label><input id="ciAddr" value="${ci.address||''}"></div>
    <div class="fg"><label>Contact</label><input id="ciPhone" value="${ci.contact||''}"></div>
    <div class="fg"><label>Notes</label><textarea id="ciNotes">${ci.notes||''}</textarea></div>
    <div class="fg"><label>Receipt Folder</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="ciReceipt" value="${ci.receipt_folder||''}" readonly style="flex:1;background:#F0EDE6">
        <button class="btn" onclick="pickReceiptFolder()">📁 Browse</button>
        ${ci.receipt_folder?`<button class="btn gray" onclick="openReceiptFolder()">Open</button>`:''}
      </div>
    </div>
    <h3 style="font-size:1em;margin:20px 0 12px">Tax Rates (%)</h3>
    <div class="info-box">💡 PO 생성 시 기본 세율로 자동 적용됩니다. 주문별로 수정 가능합니다.</div>
    <div class="fg-row">
      <div class="fg"><label>GST (%)</label><input type="number" id="ciGST" value="${ci.tax_gst||0}" step="0.01" min="0"></div>
      <div class="fg"><label>PST (%)</label><input type="number" id="ciPST" value="${ci.tax_pst||0}" step="0.01" min="0"></div>
      <div class="fg"><label>HST (%)</label><input type="number" id="ciHST" value="${ci.tax_hst||0}" step="0.01" min="0"></div>
    </div>
    <div style="text-align:right;margin-top:20px"><button class="btn green" onclick="saveCompanyInfo()" style="padding:12px 30px">Save</button></div>
    <div id="ciMsg"></div>
  </div>
  <div class="card" style="max-width:650px;margin-top:20px">
    <h3 style="font-size:1em;margin-bottom:16px">🗺️ Google Maps (Delivery Optimization)</h3>
    <div class="info-box">💡 배달 최적화에 사용됩니다. Google Cloud Console에서 Directions API와 Geocoding API를 활성화하고 API 키를 입력하세요.</div>
    <div class="fg"><label>Google Maps API Key</label><input id="ciGmapKey" value="${ci.gmap_api_key||''}" placeholder="AIza..."></div>
    <div class="fg"><label>Store Address (출발지)</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="ciStoreAddr" value="${ci.store_address||''}" placeholder="123 Main St, Toronto, ON" style="flex:1">
        <button class="btn" onclick="geocodeStoreAddr()">📍 Verify</button>
      </div>
    </div>
    <div id="ciStoreCoords" style="font-size:.85em;color:var(--text-muted);margin-top:4px">${ci.store_lat&&ci.store_lat!==0?`✅ ${ci.store_lat.toFixed(6)}, ${ci.store_lng.toFixed(6)}`:''}</div>
    <div style="text-align:right;margin-top:16px"><button class="btn green" onclick="saveGmapSettings()">Save Maps Settings</button></div>
    <div id="ciGmapMsg"></div>
  </div>`;
}

window.pickReceiptFolder=async()=>{const r=await api.selectFolder();if(r.ok)$('#ciReceipt').value=r.path;};
window.openReceiptFolder=async()=>{const p=$('#ciReceipt').value;if(p)await api.openFolder(p);};
window.saveCompanyInfo=async()=>{
  await api.run("UPDATE company_info SET name=?,address=?,contact=?,notes=?,receipt_folder=?,tax_gst=?,tax_pst=?,tax_hst=? WHERE id=1",
    [$('#ciName').value,$('#ciAddr').value,$('#ciPhone').value,$('#ciNotes').value,$('#ciReceipt').value,
     parseFloat($('#ciGST').value)||0,parseFloat($('#ciPST').value)||0,parseFloat($('#ciHST').value)||0]);
  $('#ciMsg').innerHTML='<div class="info-box success" style="margin-top:12px">✅ Saved</div>';
  setTimeout(()=>{const m=$('#ciMsg');if(m)m.innerHTML='';},2000);
};

window.geocodeStoreAddr=async()=>{
  const addr=$('#ciStoreAddr').value.trim();
  if(!addr){$('#ciGmapMsg').innerHTML='<div class="info-box err" style="margin-top:8px">주소를 입력하세요</div>';return;}
  const key=$('#ciGmapKey').value.trim();
  if(!key){$('#ciGmapMsg').innerHTML='<div class="info-box err" style="margin-top:8px">API Key를 먼저 입력하세요</div>';return;}
  // Temporarily save key for geocoding
  await api.run("UPDATE company_info SET gmap_api_key=? WHERE id=1",[key]);
  $('#ciGmapMsg').innerHTML='<div class="info-box" style="margin-top:8px">📍 Verifying address...</div>';
  const r=await api.gmapGeocode(addr);
  if(r.ok){
    $('#ciStoreCoords').innerHTML=`✅ ${r.formatted}<br>Lat: ${r.lat.toFixed(6)}, Lng: ${r.lng.toFixed(6)}`;
    await api.run("UPDATE company_info SET store_address=?,store_lat=?,store_lng=? WHERE id=1",[addr,r.lat,r.lng]);
    $('#ciGmapMsg').innerHTML='<div class="info-box success" style="margin-top:8px">✅ Address verified and saved</div>';
  } else {
    $('#ciStoreCoords').innerHTML='';
    $('#ciGmapMsg').innerHTML=`<div class="info-box err" style="margin-top:8px">❌ ${r.error}</div>`;
  }
  setTimeout(()=>{const m=$('#ciGmapMsg');if(m)m.innerHTML='';},4000);
};

window.saveGmapSettings=async()=>{
  const key=$('#ciGmapKey').value.trim();
  const addr=$('#ciStoreAddr').value.trim();
  await api.run("UPDATE company_info SET gmap_api_key=?,store_address=? WHERE id=1",[key,addr]);
  $('#ciGmapMsg').innerHTML='<div class="info-box success" style="margin-top:8px">✅ Maps settings saved</div>';
  setTimeout(()=>{const m=$('#ciGmapMsg');if(m)m.innerHTML='';},2000);
};

// ============================================================
// MATERIALS (Raw Materials Management)
// ============================================================
async function loadMaterials(){destroyCharts();$('#hd').innerText='원자재 관리';
  $('#ct').innerHTML=`<div class="btn-group"><button class="btn" onclick="addMaterial()">+ Add Material</button><button class="btn blue" onclick="manageMaterialDB()">📋 Material DB</button></div>
    <div class="info-box">💡 Add raw materials and track usage. Low stock alerts appear on Dashboard.</div>
    <div class="search-bar"><input id="matSrch" placeholder="Search material name..." oninput="renderMats(1)"></div>
    <div id="matT"><div class="loading">로딩 중...</div></div>`;renderMats(1);}
let _matPg=1;
window.renderMats=async(pg)=>{_matPg=pg||1;showLoading('#matT');const s=$('#matSrch')?.value||'';
  let w='1=1',p=[];if(s){w+=" AND m.name LIKE ?";p.push('%'+s+'%');}
  const tot=(await api.query(`SELECT COUNT(*) as c FROM materials m WHERE ${w}`,p)).data[0]?.c||0;
  const off=(_matPg-1)*PG;
  const ms=(await api.query(`SELECT m.* FROM materials m WHERE ${w} ORDER BY m.name LIMIT ${PG} OFFSET ${off}`,p)).data;
  $('#matT').innerHTML=`<table><tr><th>Material</th><th>Quantity</th><th>UOM</th><th>Alert Qty</th><th>Status</th><th>Actions</th></tr>
    ${ms.length===0?'<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No materials</td></tr>':''}
    ${ms.map(m=>`<tr>
      <td class="text-bold">${m.name}</td>
      <td>${Number(m.quantity).toFixed(2)}</td>
      <td>${m.uom}</td>
      <td>${Number(m.alert_qty).toFixed(2)}</td>
      <td>${m.quantity<=m.alert_qty&&m.alert_qty>0?'<span class="badge badge-red">⚠️ Low</span>':'<span class="badge badge-green">OK</span>'}</td>
      <td><button class="act-btn" onclick="adjustMat(${m.id})">+/- Adjust</button><button class="act-btn" onclick="editMat(${m.id})">Edit</button><button class="act-btn del" onclick="delMat(${m.id})">Del</button></td>
    </tr>`).join('')}</table>${renderPager(tot,_matPg,'renderMats')}`;
};

window.addMaterial=async()=>{
  const mdb=(await api.query("SELECT * FROM material_db ORDER BY name")).data;
  const uoms=['Bottle','Kg','Ml','Box','NMB'];
  openM(`<h3>Add Material</h3>
    <div class="fg"><label>Material Name *</label>
      <select id="matName"><option value="">Select...</option>${mdb.map(m=>`<option value="${m.name}">${m.name}</option>`).join('')}</select>
    </div>
    <div class="fg"><label>Quantity *</label><input type="number" id="matQty" value="0" step="0.01"></div>
    <div class="fg"><label>UOM *</label><select id="matUom">${uoms.map(u=>`<option value="${u}">${u}</option>`).join('')}</select></div>
    <div class="fg"><label>Alert Quantity</label><input type="number" id="matAlert" value="0" step="0.01"></div>
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn" onclick="saveMaterial()">Save</button></div>`);
};

window.saveMaterial=async()=>{
  if(!validate([{id:'matName',label:'Material',type:'select'},{id:'matQty',label:'Quantity',type:'number',min:0}]))return;
  const name=$('#matName').value,qty=parseFloat($('#matQty').value)||0,uom=$('#matUom').value,alertQty=parseFloat($('#matAlert').value)||0;
  // Check if already exists
  const exists=(await api.query("SELECT id FROM materials WHERE name=?",[name])).data;
  if(exists.length>0){showInlineErr('Material already exists. Use Adjust to change quantity.');return;}
  await api.run("INSERT INTO materials (name,quantity,uom,alert_qty) VALUES (?,?,?,?)",[name,qty,uom,alertQty]);
  // Log initial
  const mid=(await api.query("SELECT id FROM materials WHERE name=?",[name])).data[0].id;
  await api.run("INSERT INTO material_log (material_id,type,qty,prev_qty,new_qty,date,note) VALUES (?,'add',?,0,?,?,?)",[mid,qty,qty,today(),'Initial stock']);
  closeM();renderMats();
};

window.editMat=async(id)=>{
  const m=(await api.query("SELECT * FROM materials WHERE id=?",[id])).data[0];
  const uoms=['Bottle','Kg','Ml','Box','NMB'];
  openM(`<h3>Edit Material</h3>
    <div class="fg"><label>Material Name</label><input id="matName" value="${m.name}" disabled style="background:#eee"></div>
    <div class="fg"><label>Current Qty: <strong>${Number(m.quantity).toFixed(2)} ${m.uom}</strong></label></div>
    <div class="fg"><label>UOM</label><select id="matUom">${uoms.map(u=>`<option value="${u}" ${m.uom===u?'selected':''}>${u}</option>`).join('')}</select></div>
    <div class="fg"><label>Alert Quantity</label><input type="number" id="matAlert" value="${m.alert_qty}" step="0.01"></div>
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn" onclick="updateMat(${id})">Save</button></div>`);
};

window.updateMat=async(id)=>{
  await api.run("UPDATE materials SET uom=?,alert_qty=? WHERE id=?",[$('#matUom').value,parseFloat($('#matAlert').value)||0,id]);
  closeM();renderMats();
};

window.adjustMat=async(id)=>{
  const m=(await api.query("SELECT * FROM materials WHERE id=?",[id])).data[0];
  openM(`<h3>Adjust: ${m.name}</h3>
    <div class="info-box">Current: <strong>${Number(m.quantity).toFixed(2)} ${m.uom}</strong></div>
    <div class="fg"><label>Type</label><select id="adjType"><option value="add">➕ Add (received)</option><option value="use">➖ Use (consumed)</option></select></div>
    <div class="fg"><label>Quantity *</label><input type="number" id="adjQty" value="0" step="0.01" min="0"></div>
    <div class="fg"><label>Note</label><input id="adjNote"></div>
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn blue" onclick="saveAdjMat(${id})">Apply</button></div>`);
};

window.saveAdjMat=async(id)=>{
  if(!validate([{id:'adjQty',label:'Quantity',type:'number',min:0.01}]))return;
  const m=(await api.query("SELECT * FROM materials WHERE id=?",[id])).data[0];
  const type=$('#adjType').value,qty=parseFloat($('#adjQty').value)||0;
  const prev=m.quantity;
  const nq=type==='add'?prev+qty:prev-qty;
  if(nq<0){showInlineErr('Not enough stock');return;}
  await api.run("UPDATE materials SET quantity=? WHERE id=?",[nq,id]);
  await api.run("INSERT INTO material_log (material_id,type,qty,prev_qty,new_qty,date,note) VALUES (?,?,?,?,?,?,?)",
    [id,type,qty,prev,nq,today(),$('#adjNote').value||'']);
  closeM();renderMats();
};

window.delMat=async(id)=>{if(!confirm('Delete this material?'))return;
  await api.run("DELETE FROM material_log WHERE material_id=?",[id]);
  await api.run("DELETE FROM materials WHERE id=?",[id]);renderMats();};

// Material DB management
window.manageMaterialDB=()=>{
  openM(`<h3>📋 Material Database</h3>
    <div class="info-box">Manage the list of material names available in the dropdown.</div>
    <div class="fg-row"><div class="fg" style="flex:1"><input id="newMatDB" placeholder="New material name..."></div><button class="btn" onclick="addMatDB()" style="align-self:flex-end;margin-bottom:12px">Add</button></div>
    <div id="matDBList"><div class="loading">로딩 중...</div></div>`);
  renderMatDB();
};

window.renderMatDB=async()=>{
  const ms=(await api.query("SELECT * FROM material_db ORDER BY name")).data;
  const el=$('#matDBList');if(!el)return;
  el.innerHTML=ms.length===0?'<p style="color:var(--text-muted)">No items</p>':
    `<table><tr><th>Name</th><th>Action</th></tr>${ms.map(m=>`<tr><td>${m.name}</td><td><button class="act-btn del" onclick="delMatDB(${m.id})">Delete</button></td></tr>`).join('')}</table>`;
};

window.addMatDB=async()=>{const n=$('#newMatDB')?.value?.trim();if(!n)return;
  const exists=(await api.query("SELECT id FROM material_db WHERE name=?",[n])).data;
  if(exists.length>0){showInlineErr('Already exists');return;}
  await api.run("INSERT INTO material_db (name) VALUES (?)",[n]);$('#newMatDB').value='';renderMatDB();};
window.delMatDB=async(id)=>{await api.run("DELETE FROM material_db WHERE id=?",[id]);renderMatDB();};

// ============================================================
// CUSTOMERS (Individual C-XX / Business I-XX)
// ============================================================
async function loadCust(){destroyCharts();$('#hd').innerText='거래처 관리';
  const tot=(await api.query("SELECT COUNT(*) as c FROM customers")).data[0]?.c||0;
  const indCnt=(await api.query("SELECT COUNT(*) as c FROM customers WHERE type='individual'")).data[0]?.c||0;
  const bizCnt=(await api.query("SELECT COUNT(*) as c FROM customers WHERE type='business'")).data[0]?.c||0;
  $('#ct').innerHTML=`<div class="btn-group"><button class="btn" onclick="addCust('individual')">+ Individual Customer (C-)</button><button class="btn blue" onclick="addCust('business')">+ Business Customer (I-)</button></div>
    <div class="info-box">Total: <strong>${tot}</strong> (Individual: ${indCnt} / Business: ${bizCnt})</div>
    <div class="filter-bar">
      <div class="fg"><label>Type</label><select id="custTypeF" onchange="renderCusts()"><option value="">All</option><option value="individual">Individual (C-)</option><option value="business">Business (I-)</option></select></div>
      <div class="fg" style="flex:1"><label>Search (Name or ID)</label><input id="custSrch" placeholder="Name or customer ID..." oninput="renderCusts()"></div>
    </div>
    <div id="cuT"><div class="loading">로딩 중...</div></div>`;renderCusts(1);}
let _custPg=1;
window.renderCusts=async(pg)=>{_custPg=pg||1;showLoading('#cuT');
  const s=$('#custSrch')?.value||'',ty=$('#custTypeF')?.value||'';
  let w='1=1',p=[];
  if(ty){w+=" AND c.type=?";p.push(ty);}
  if(s){w+=" AND (c.name LIKE ? OR c.cust_id LIKE ?)";p.push('%'+s+'%','%'+s+'%');}
  const tot=(await api.query(`SELECT COUNT(*) as c FROM customers c WHERE ${w}`,p)).data[0]?.c||0;
  const off=(_custPg-1)*PG;
  const cs=(await api.query(`SELECT c.* FROM customers c WHERE ${w} ORDER BY c.cust_id LIMIT ${PG} OFFSET ${off}`,p)).data;
  $('#cuT').innerHTML=`<table><tr><th>ID</th><th>Type</th><th>Name</th><th>Phone</th><th>Address</th><th>Discount</th><th>Actions</th></tr>
    ${cs.length===0?'<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No customers</td></tr>':''}
    ${cs.map(c=>`<tr>
      <td class="text-bold">${c.cust_id}</td>
      <td><span class="badge ${c.type==='individual'?'badge-green':'badge-blue'}">${c.type==='individual'?'Individual':'Business'}</span></td>
      <td class="text-bold">${c.name}</td>
      <td>${c.phone||'-'}</td>
      <td>${c.address||'-'}</td>
      <td>${c.type==='business'&&c.discount_rate>0?c.discount_rate+'%':'-'}</td>
      <td><button class="act-btn" onclick="editCust(${c.id})">Edit</button><button class="act-btn del" onclick="delCust(${c.id})">Del</button></td>
    </tr>`).join('')}</table>${renderPager(tot,_custPg,'renderCusts')}`;
};

async function getNextCustId(type){
  const prefix=type==='individual'?'C':'I';
  const last=(await api.query("SELECT cust_id FROM customers WHERE type=? ORDER BY id DESC LIMIT 1",[type])).data[0];
  if(!last)return prefix+'-01';
  const num=parseInt(last.cust_id.split('-')[1])||0;
  return prefix+'-'+String(num+1).padStart(2,'0');
}

window.addCust=async(type)=>{
  const nextId=await getNextCustId(type);
  const typeLabel=type==='individual'?'Individual Customer':'Business Customer';
  openM(`<h3>${typeLabel} Registration</h3>
    <div class="info-box">Auto-assigned ID: <strong>${nextId}</strong></div>
    <div class="fg"><label>Name *</label><input id="cuN"></div>
    <div class="fg"><label>Phone</label><input id="cuP"></div>
    <div class="fg"><label>Address</label><input id="cuA"></div>
    ${type==='business'?'<div class="fg"><label>Discount Rate (%)</label><input type="number" id="cuDR" value="0" step="0.1" min="0" max="100"></div>':''}
    <input type="hidden" id="cuType" value="${type}">
    <input type="hidden" id="cuNextId" value="${nextId}">
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn" onclick="saveCust()">Save</button></div>`);
};

window.saveCust=async()=>{
  if(!validate([{id:'cuN',label:'Name',type:'required'}]))return;
  const type=$('#cuType').value,cid=$('#cuNextId').value;
  const dr=type==='business'?(parseFloat($('#cuDR')?.value)||0):0;
  const r=await api.run("INSERT INTO customers (cust_id,type,name,phone,address,discount_rate) VALUES (?,?,?,?,?,?)",
    [cid,type,$('#cuN').value.trim(),$('#cuP').value||'',$('#cuA').value||'',dr]);
  if(!r.ok){showInlineErr('Save failed: '+(r.error||'Unknown error'));return;}
  closeM();loadCust();
};

window.editCust=async(id)=>{
  const c=(await api.query("SELECT * FROM customers WHERE id=?",[id])).data[0];
  openM(`<h3>Edit Customer</h3>
    <div class="info-box">ID: <strong>${c.cust_id}</strong> | Type: ${c.type==='individual'?'Individual':'Business'}</div>
    <div class="fg"><label>Name *</label><input id="cuN" value="${esc(c.name)}"></div>
    <div class="fg"><label>Phone</label><input id="cuP" value="${esc(c.phone)}"></div>
    <div class="fg"><label>Address</label><input id="cuA" value="${esc(c.address)}"></div>
    ${c.type==='business'?`<div class="fg"><label>Discount Rate (%)</label><input type="number" id="cuDR" value="${c.discount_rate||0}" step="0.1" min="0" max="100"></div>`:''}
    <input type="hidden" id="cuType" value="${c.type}">
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn" onclick="updateCust(${id})">Save</button></div>`);
};

window.updateCust=async(id)=>{
  if(!validate([{id:'cuN',label:'Name',type:'required'}]))return;
  const type=$('#cuType')?.value||'individual';
  const dr=type==='business'?(parseFloat($('#cuDR')?.value)||0):0;
  await api.run("UPDATE customers SET name=?,phone=?,address=?,discount_rate=? WHERE id=?",[$('#cuN').value.trim(),$('#cuP').value,$('#cuA').value,dr,id]);
  closeM();loadCust();
};
window.delCust=async(id)=>{if(!confirm('Delete?'))return;await api.run("DELETE FROM customers WHERE id=?",[id]);loadCust();};

// ============================================================
// CATALOG (Product Registration - simple: name, price, note)
// ============================================================
async function loadCatalog(){destroyCharts();$('#hd').innerText='제품 등록';
  const glfOn=(await api.query("SELECT glf_menu_key FROM company_info WHERE id=1")).data[0];
  const showGlf=glfOn&&glfOn.glf_menu_key;
  $('#ct').innerHTML=`<div class="btn-group"><button class="btn" onclick="addCatalog()">+ Add Product</button>${showGlf?`<button class="btn" onclick="glfSyncFromCatalog()" style="background:#FF6B00;color:#fff">🍕 Sync from GloriaFood</button>`:''}</div>
    <div id="catSyncMsg"></div>
    <div class="info-box">💡 Register products with prices. These will be used when creating POs.</div>
    <div class="search-bar"><input id="catSrch" placeholder="Search product name..." oninput="renderCatalog()"></div>
    <div id="catT"><div class="loading">로딩 중...</div></div>`;renderCatalog(1);}
let _catPg=1;
window.renderCatalog=async(pg)=>{_catPg=pg||1;showLoading('#catT');const s=$('#catSrch')?.value||'';
  let w='1=1',p=[];if(s){w+=" AND name LIKE ?";p.push('%'+s+'%');}
  const tot=(await api.query(`SELECT COUNT(*) as c FROM catalog WHERE ${w}`,p)).data[0]?.c||0;
  const off=(_catPg-1)*PG;
  const cs=(await api.query(`SELECT * FROM catalog WHERE ${w} ORDER BY name LIMIT ${PG} OFFSET ${off}`,p)).data;
  $('#catT').innerHTML=`<table><tr><th>Product Name</th><th>Price</th><th>Note</th><th>Actions</th></tr>
    ${cs.length===0?'<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No products</td></tr>':''}
    ${cs.map(c=>`<tr>
      <td class="text-bold">${c.name}</td>
      <td class="text-green text-bold">${fC(c.price)}</td>
      <td>${c.note||'-'}</td>
      <td><button class="act-btn" onclick="editCatalog(${c.id})">Edit</button><button class="act-btn del" onclick="delCatalog(${c.id})">Del</button></td>
    </tr>`).join('')}</table>${renderPager(tot,_catPg,'renderCatalog')}`;
};

window.addCatalog=()=>openM(`<h3>Add Product</h3>
  <div class="fg"><label>Product Name *</label><input id="catN"></div>
  <div class="fg"><label>Price ($) *</label><input type="number" id="catP" value="0" step="0.01" placeholder="$ 0.00"></div>
  <div class="fg"><label>Note</label><textarea id="catNote"></textarea></div>
  <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn" onclick="saveCatalog()">Save</button></div>`);

window.saveCatalog=async()=>{
  if(!validate([{id:'catN',label:'Product Name',type:'required'},{id:'catP',label:'Price',type:'number',min:0}]))return;
  await api.run("INSERT INTO catalog (name,price,note) VALUES (?,?,?)",[$('#catN').value.trim(),parseFloat($('#catP').value)||0,$('#catNote').value]);
  closeM();renderCatalog();
};

window.editCatalog=async(id)=>{
  const c=(await api.query("SELECT * FROM catalog WHERE id=?",[id])).data[0];
  openM(`<h3>Edit Product</h3>
    <div class="fg"><label>Product Name *</label><input id="catN" value="${esc(c.name)}"></div>
    <div class="fg"><label>Price ($) *</label><input type="number" id="catP" value="${c.price}" step="0.01" placeholder="$ 0.00"></div>
    <div class="fg"><label>Note</label><textarea id="catNote">${esc(c.note)}</textarea></div>
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn" onclick="updateCatalog(${id})">Save</button></div>`);
};

window.updateCatalog=async(id)=>{
  if(!validate([{id:'catN',label:'Product Name',type:'required'},{id:'catP',label:'Price',type:'number',min:0}]))return;
  await api.run("UPDATE catalog SET name=?,price=?,note=? WHERE id=?",[$('#catN').value.trim(),parseFloat($('#catP').value)||0,$('#catNote').value,id]);
  closeM();renderCatalog();
};
window.delCatalog=async(id)=>{if(!confirm('Delete?'))return;await api.run("DELETE FROM catalog WHERE id=?",[id]);renderCatalog();};

// Sync GloriaFood menu from Catalog tab
window.glfSyncFromCatalog=async()=>{
  const ci=(await api.query("SELECT glf_menu_key FROM company_info WHERE id=1")).data[0];
  if(!ci||!ci.glf_menu_key){alert('GloriaFood 설정에서 Menu API Key를 먼저 입력하세요');return;}
  const msg=$('#catSyncMsg');
  if(msg)msg.innerHTML='<div class="info-box" style="margin:8px 0">GloriaFood 메뉴를 가져오는 중...</div>';
  const r=await api.glfFetchMenu(ci.glf_menu_key);
  if(!r.ok){if(msg)msg.innerHTML=`<div class="info-box err" style="margin:8px 0">❌ ${r.error}</div>`;return;}
  if(!r.items.length){if(msg)msg.innerHTML='<div class="info-box warn" style="margin:8px 0">메뉴에 품목이 없습니다.</div>';return;}
  if(!confirm(`${r.items.length}개 품목을 Catalog에 동기화합니다.\n기존 품목: 가격/메모 업데이트\n새 품목: 자동 추가\n계속하시겠습니까?`))return;
  const sync=await api.glfSyncCatalog(r.items);
  if(sync.ok){
    if(msg)msg.innerHTML=`<div class="info-box success" style="margin:8px 0">✅ 추가: ${sync.added}건 / 업데이트: ${sync.updated}건 / 변경없음: ${sync.skipped}건</div>`;
    renderCatalog();
    setTimeout(()=>{if(msg)msg.innerHTML='';},5000);
  } else {
    if(msg)msg.innerHTML=`<div class="info-box err" style="margin:8px 0">❌ ${sync.error}</div>`;
  }
};

// ============================================================
// PO CREATE (Purchase Orders = Sales orders from customers)
// ============================================================
let _poPg=1;let _poSort='date_desc';
async function loadPO(){destroyCharts();$('#hd').innerText='PO Create';
  const glfOn=(await api.query("SELECT glf_enabled,glf_api_key FROM company_info WHERE id=1")).data[0];
  const showGlf=glfOn&&glfOn.glf_enabled&&glfOn.glf_api_key;
  const gmapOn=(await api.query("SELECT gmap_api_key,store_lat FROM company_info WHERE id=1")).data[0];
  const showGmap=gmapOn&&gmapOn.gmap_api_key&&gmapOn.store_lat;
  $('#ct').innerHTML=`<div class="btn-group"><button class="btn green" onclick="createPO()">+ New PO</button>${showGlf?`<button class="btn" id="glfPollBtn" onclick="glfPollFromPO()" style="background:#FF6B00;color:#fff">🍕 GloriaFood 주문 가져오기</button>`:''}${showGmap?`<button class="btn blue" onclick="openDeliveryOptimizer()">🚚 배달 최적화</button>`:''}</div>
    <div id="glfPollMsg"></div>
    <div class="filter-bar">
      <div class="fg"><label>From</label><input type="date" id="poFrom" value="${_f.po.from}"></div>
      <div class="fg"><label>To</label><input type="date" id="poTo" value="${_f.po.to}"></div>
      <div class="fg" style="flex:1"><label>Search (Customer Name/ID)</label><input id="poSrch" placeholder="Customer name or ID..." value="${_f.po.sr}"></div>
      <div class="fg"><label>Sort</label><select id="poSortSel" onchange="_poSort=this.value;refreshPO(1)">
        <option value="date_desc"${_poSort==='date_desc'?' selected':''}>Order Date ↓</option>
        <option value="date_asc"${_poSort==='date_asc'?' selected':''}>Order Date ↑</option>
        <option value="del_asc"${_poSort==='del_asc'?' selected':''}>Delivery Date ↑ (빠른순)</option>
        <option value="del_desc"${_poSort==='del_desc'?' selected':''}>Delivery Date ↓</option>
      </select></div>
      <button class="btn" onclick="refreshPO(1)">Search</button>
    </div>
    <div id="poT"><div class="loading">로딩 중...</div></div>`;
  // Setup autocomplete for search
  setTimeout(()=>{
    setupAutocomplete('poSrch',async(val)=>{
      const cs=(await api.query("SELECT cust_id,name FROM customers WHERE name LIKE ? OR cust_id LIKE ? LIMIT 8",['%'+val+'%','%'+val+'%'])).data;
      return cs.map(c=>({display:`${c.cust_id} - ${c.name}`,value:c.name,cust_id:c.cust_id}));
    },(item)=>{$('#poSrch').value=item.value;});
  },100);
  refreshPO(1);
}

window.refreshPO=async(pg)=>{_poPg=pg||1;showLoading('#poT');
  _f.po.from=$('#poFrom').value;_f.po.to=$('#poTo').value;_f.po.sr=$('#poSrch').value;
  const from=_f.po.from,to=_f.po.to,sr=_f.po.sr;
  let w="po.order_date>=? AND po.order_date<=?",p=[from,to];
  if(sr){w+=" AND (c.name LIKE ? OR c.cust_id LIKE ?)";p.push('%'+sr+'%','%'+sr+'%');}
  const sortMap={date_desc:'po.order_date DESC,po.id DESC',date_asc:'po.order_date ASC,po.id ASC',del_asc:"CASE WHEN po.delivery_date='' OR po.delivery_date IS NULL THEN 1 ELSE 0 END,po.delivery_date ASC,po.id ASC",del_desc:"CASE WHEN po.delivery_date='' OR po.delivery_date IS NULL THEN 1 ELSE 0 END,po.delivery_date DESC,po.id DESC"};
  const orderBy=sortMap[_poSort]||sortMap.date_desc;
  const tot=(await api.query(`SELECT COUNT(*) as cnt FROM purchase_orders po LEFT JOIN customers c ON po.customer_id=c.id WHERE ${w}`,p)).data[0]?.cnt||0;
  const off=(_poPg-1)*PG;
  const pos=(await api.query(`SELECT po.*,c.name as cn,c.cust_id as ccid,c.type as ctype FROM purchase_orders po LEFT JOIN customers c ON po.customer_id=c.id WHERE ${w} ORDER BY ${orderBy} LIMIT ${PG} OFFSET ${off}`,p)).data;

  // Summary
  const sm=(await api.query(`SELECT COALESCE(SUM(po.total),0) as t FROM purchase_orders po LEFT JOIN customers c ON po.customer_id=c.id WHERE ${w}`,p)).data[0];

  // Batch load items for all POs in one query (fixes N+1)
  const poIds=pos.map(po=>po.id);
  let itemsByPo={};
  if(poIds.length>0){
    const allItems=(await api.query(`SELECT pi.po_id,pi.product_name,pi.qty,cat.name as pname FROM po_items pi LEFT JOIN catalog cat ON pi.catalog_id=cat.id WHERE pi.po_id IN (${poIds.join(',')})`,[])).data;
    for(const it of allItems){if(!itemsByPo[it.po_id])itemsByPo[it.po_id]=[];itemsByPo[it.po_id].push(it);}
  }

  let tbl='';
  for(const po of pos){
    const items=itemsByPo[po.id]||[];
    const itemStr=items.map(it=>`${it.product_name||it.pname} x${it.qty}`).join(', ');
    const stBadge=po.payment_status==='Paid'?'badge-green':po.payment_status==='Partial'?'badge-orange':po.payment_status==='Cancelled'?'badge-dark':'badge-red';
    const cType=po.ctype||'individual';
    const paidAmt=po.paid_amount||0;
    const os=po.order_status||'';
    const osBadge=os==='pending'?'badge-orange':os==='accepted'?'badge-green':os==='canceled'||os==='cancelled'?'badge-dark':os==='rejected'?'badge-red':os==='missed'?'badge-red':'';
    const osLabel=os==='pending'?'⏳ Pending':os==='accepted'?'✅ Accepted':os==='canceled'||os==='cancelled'?'⛔ Cancelled':os==='rejected'?'❌ Rejected':os==='missed'?'⚠️ Missed':'';
    const dlv=po.delivered?1:0;
    const dlvIcon=dlv?'<span style="color:#27AE60;cursor:pointer" title="배송완료 — 클릭하여 취소">✅</span>':'<span style="color:#CCC;cursor:pointer" title="클릭하여 배송완료 처리">⬜</span>';
    tbl+=`<tr${os==='canceled'||os==='cancelled'?' style="opacity:0.5"':''}>
      <td>${po.order_date}</td>
      <td><span class="badge ${cType==='individual'?'badge-green':'badge-blue'}" style="font-size:.7em">${cType==='individual'?'C':'I'}</span> <strong>${po.ccid||''}</strong> ${po.cn||'-'}</td>
      <td>${osLabel?`<span class="badge ${osBadge}">${osLabel}</span>`:'-'}</td>
      <td>${po.delivery_date||'-'}</td>
      <td onclick="toggleDelivered(${po.id},${dlv})" style="cursor:pointer;text-align:center">${dlvIcon}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${itemStr||'-'}</td>
      <td class="text-green text-bold">${fC(po.total)}</td>
      <td><span class="badge ${po.payment_method==='CASH'?'badge-green':'badge-blue'}">${po.payment_method}</span></td>
      <td style="cursor:pointer" onclick="togglePayStatus(${po.id},'${po.payment_status||'Unpaid'}')"><span class="badge ${stBadge}">${po.payment_status||'Unpaid'}</span>${po.payment_status==='Partial'?`<div style="font-size:.75em;color:var(--text-muted);margin-top:2px">${fC(paidAmt)} / ${fC(po.total)}</div>`:''}</td>
      <td>${cType==='business'?(po.invoice_date?`<span class="badge badge-purple" title="Issued ${po.invoice_date}">✓ ${po.invoice_date}</span>`:`<span style="color:var(--text-light)">—</span>`):''}</td>
      <td><button class="act-btn" onclick="viewPO(${po.id})">View</button>${cType==='business'?`<button class="act-btn" onclick="genInvoice(${po.id})" style="color:var(--blue)">${po.invoice_date?'Re-issue':'Invoice'}</button>`:''}<button class="act-btn" onclick="editPO(${po.id})">Edit</button><button class="act-btn del" onclick="delPO(${po.id})">Del</button></td>
    </tr>`;
  }

  $('#poT').innerHTML=`<div class="summary-row"><div class="summary-item"><div class="label">Total Revenue</div><div class="value text-green">${fC(sm.t)}</div></div><div class="summary-item"><div class="label">Orders</div><div class="value">${fN(tot)}</div></div></div>
    <table><tr><th>Order Date</th><th>Customer</th><th>Order</th><th>Delivery</th><th>🚚</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Invoice</th><th>Actions</th></tr>
    ${tbl||'<tr><td colspan="11" style="text-align:center;color:var(--text-muted)">No POs found</td></tr>'}</table>${renderPager(tot,_poPg,'refreshPO')}`;
};

// PO detail view
window.viewPO=async(id)=>{
  const po=(await api.query("SELECT po.*,c.name as cn,c.cust_id as ccid,c.phone as cph,c.address as caddr,c.type as ctype FROM purchase_orders po LEFT JOIN customers c ON po.customer_id=c.id WHERE po.id=?",[id])).data[0];
  if(!po)return;
  const items=(await api.query("SELECT pi.*,cat.name as pname FROM po_items pi LEFT JOIN catalog cat ON pi.catalog_id=cat.id WHERE pi.po_id=?",[id])).data;
  const stBadge=po.payment_status==='Paid'?'badge-green':po.payment_status==='Partial'?'badge-orange':po.payment_status==='Cancelled'?'badge-dark':'badge-red';
  const disType=po.discount_type||'$';
  const discAmt=disType==='%'?(po.subtotal*po.discount/100):po.discount;
  const paidAmt=po.paid_amount||0;const remAmt=po.total-paidAmt;
  const os=po.order_status||'';
  const osBadge=os==='pending'?'badge-orange':os==='accepted'?'badge-green':os==='canceled'||os==='cancelled'?'badge-dark':os==='rejected'?'badge-red':os==='missed'?'badge-red':'';
  const osLabel=os==='pending'?'⏳ Pending':os==='accepted'?'✅ Accepted':os==='canceled'||os==='cancelled'?'⛔ Cancelled':os==='rejected'?'❌ Rejected':os==='missed'?'⚠️ Missed':os?os:'';
  openM(`<h3>PO #${id} <span class="badge ${stBadge}">${po.payment_status||'Unpaid'}</span>${osLabel?` <span class="badge ${osBadge}">${osLabel}</span>`:''}</h3>
    <div class="db-info-grid">
      <div class="db-info-item"><div class="label">Customer</div><div class="value">${po.ccid||''} ${po.cn||'-'}</div></div>
      <div class="db-info-item"><div class="label">Phone</div><div class="value">${po.cph||'-'}</div></div>
      <div class="db-info-item"><div class="label">Address</div><div class="value">${po.caddr||'-'}</div></div>
      <div class="db-info-item"><div class="label">Order Date</div><div class="value">${po.order_date}</div></div>
      <div class="db-info-item"><div class="label">Delivery Date</div><div class="value">${po.delivery_date||'-'}</div></div>
      <div class="db-info-item"><div class="label">Payment</div><div class="value">${po.payment_method}</div></div>
      <div class="db-info-item"><div class="label">Paid / Remaining</div><div class="value"><span class="text-green">${fC(paidAmt)}</span> / <span class="text-red">${fC(remAmt>0?remAmt:0)}</span></div></div>
    </div>
    <table><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
      ${items.map(it=>`<tr><td>${it.product_name||it.pname}</td><td>${it.qty}</td><td>${fC(it.price)}</td><td class="text-bold">${fC(it.total)}</td></tr>`).join('')}
      <tr style="background:#F5F0E8"><td colspan="3" style="text-align:right;font-weight:bold">Subtotal</td><td class="text-bold">${fC(po.subtotal)}</td></tr>
      ${po.discount>0?`<tr><td colspan="3" style="text-align:right;font-weight:bold;color:var(--red)">Discount${disType==='%'?' ('+po.discount+'%)':''}</td><td class="text-red text-bold">-${fC(discAmt)}</td></tr>`:''}
      ${(po.tax_hst||0)>0?`<tr><td colspan="3" style="text-align:right">HST (${po.tax_hst_rate||0}%)</td><td>${fC(po.tax_hst)}</td></tr>`:''}
      <tr style="background:#D5F5E3"><td colspan="3" style="text-align:right;font-weight:bold">Total</td><td class="text-green text-bold">${fC(po.total)}</td></tr>
    </table>
    ${po.note?`<div class="info-box" style="margin-top:12px">Note: ${po.note}</div>`:''}
    <div style="text-align:right;margin-top:16px">
      ${(po.ctype||'individual')==='business'?`<button class="btn blue" onclick="closeM();genInvoice(${id})" style="margin-right:8px">📄 Generate Invoice PDF</button>`:''}
      <button class="btn gray" onclick="closeM()">Close</button>
    </div>`);
};

// PO Create/Edit
let _poItems=[];let _poProds=[];
window.createPO=async()=>{
  _poProds=(await api.query("SELECT * FROM catalog ORDER BY name")).data;
  _poItems=[{catId:'',name:'',qty:1,price:0}];
  const ci=(await api.query("SELECT tax_gst,tax_pst,tax_hst FROM company_info WHERE id=1")).data[0]||{};
  openM(`<h3>New Purchase Order</h3>
    <div class="fg"><label>Customer *</label>
      <div style="position:relative"><input id="poCust" placeholder="Search customer..." autocomplete="off"><input type="hidden" id="poCustId">
      </div>
    </div>
    <div id="poCustInfo"></div>
    <div class="fg-row"><div class="fg"><label>Order Date *</label><input type="date" id="poDate" value="${today()}"></div><div class="fg"><label>Delivery Date</label><input type="date" id="poDel" value=""></div></div>
    <h4 style="margin:12px 0 8px;color:var(--text-muted)">Order Items</h4>
    <div id="poItemsArea"></div>
    <button class="btn" onclick="addPOItem()" style="margin:8px 0">+ Add Item</button>
    <div id="poTotalArea"></div>
    <div class="fg-row">
      <div class="fg"><label>Discount Type</label><select id="poDisType" onchange="calcPOTotal()"><option value="$">$ (Amount)</option><option value="%">% (Percentage)</option></select></div>
      <div class="fg"><label>Discount ($)</label><input type="number" id="poDis" value="0" step="0.01" oninput="calcPOTotal()"></div>
    </div>
    <div class="fg-row">
      <div class="fg"><label>GST (%)</label><input type="number" id="poGST" value="${ci.tax_gst||0}" step="0.01" min="0"></div>
      <div class="fg"><label>PST (%)</label><input type="number" id="poPST" value="${ci.tax_pst||0}" step="0.01" min="0"></div>
      <div class="fg"><label>HST (%) — applied</label><input type="number" id="poHST" value="${ci.tax_hst||0}" step="0.01" min="0" oninput="calcPOTotal()"></div>
    </div>
    <div class="fg"><label>Payment Method</label><select id="poPay"><option value="CASH">CASH</option><option value="E-transfer">E-transfer</option></select></div>
    <div class="fg"><label>Note</label><input id="poNote"></div>
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn green" id="savePOBtn" onclick="savePO()">Create PO</button></div>`);

  setTimeout(()=>{
    setupAutocomplete('poCust',async(val)=>{
      const cs=(await api.query("SELECT id,cust_id,name,type,discount_rate FROM customers WHERE name LIKE ? OR cust_id LIKE ? LIMIT 8",['%'+val+'%','%'+val+'%'])).data;
      return cs.map(c=>({display:`${c.cust_id} - ${c.name}`,value:c.name,id:c.id,type:c.type,discount_rate:c.discount_rate}));
    },(item)=>{
      $('#poCust').value=item.display;$('#poCustId').value=item.id;
      showCustPOSummary(item);
    });
  },100);
  renderPOItems();
};

// Show customer's past order summary when selected in PO create
async function showCustPOSummary(item){
  const infoEl=$('#poCustInfo');if(!infoEl)return;
  // Fetch summary
  const totals=(await api.query("SELECT COUNT(*) as cnt,COALESCE(SUM(total),0) as rev FROM purchase_orders WHERE customer_id=?",[item.id])).data[0];
  const topItems=(await api.query("SELECT pi.product_name,SUM(pi.qty) as tq,SUM(pi.total) as ta FROM purchase_orders po JOIN po_items pi ON pi.po_id=po.id WHERE po.customer_id=? GROUP BY pi.product_name ORDER BY tq DESC LIMIT 3",[item.id])).data;
  const lastPO=(await api.query("SELECT order_date FROM purchase_orders WHERE customer_id=? ORDER BY order_date DESC LIMIT 1",[item.id])).data[0];

  let html=`<div class="info-box" style="margin-bottom:8px">`;
  html+=`${item.type==='business'?'🏢 Business':'👤 Individual'}`;
  if(item.type==='business'&&item.discount_rate>0) html+=` — Default discount: <strong>${item.discount_rate}%</strong>`;
  html+=`<br><span style="font-size:.85em;color:var(--text-muted)">Past orders: <strong>${totals.cnt}</strong> | Total spent: <strong class="text-green">${fC(totals.rev)}</strong>`;
  if(lastPO) html+=` | Last order: ${lastPO.order_date}`;
  html+=`</span>`;
  if(topItems.length>0) html+=`<br><span style="font-size:.85em;color:var(--text-muted)">Top items: ${topItems.map(t=>`${t.product_name} (×${t.tq})`).join(', ')}</span>`;
  html+=`</div>`;
  infoEl.innerHTML=html;

  // Auto-fill discount for business
  if(item.type==='business'&&item.discount_rate>0){
    $('#poDisType').value='%';$('#poDis').value=item.discount_rate;calcPOTotal();
  }
}

window.addPOItem=()=>{_poItems.push({catId:'',name:'',qty:1,price:0});renderPOItems();};
window.rmPOItem=i=>{_poItems.splice(i,1);if(!_poItems.length)_poItems=[{catId:'',name:'',qty:1,price:0}];renderPOItems();};

function renderPOItems(){
  const opts=_poProds.map(p=>`<option value="${p.id}" data-price="${p.price}">${p.name}</option>`).join('');
  let h='';_poItems.forEach((it,i)=>{
    h+=`<div class="sale-item">
      <div class="fg"><label>Product</label><select onchange="poItemSel(${i},this)"><option value="">Select...</option>${opts}</select></div>
      <div class="fg" style="max-width:80px"><label>Qty</label><input type="number" value="${it.qty}" min="1" onchange="poItemQty(${i},this.value)"></div>
      <div class="fg" style="max-width:120px"><label>Price ($)</label><input type="number" value="${it.price}" step="0.01" onchange="poItemPrice(${i},this.value)"></div>
      <button class="remove-btn" onclick="rmPOItem(${i})">×</button>
    </div>`;
  });
  const area=$('#poItemsArea');if(area)area.innerHTML=h;
  // Restore selections
  const sels=$$('#poItemsArea select');
  sels.forEach((sel,i)=>{if(_poItems[i]&&_poItems[i].catId)sel.value=_poItems[i].catId;});
  calcPOTotal();
}

window.poItemSel=(i,sel)=>{
  const v=sel.value;_poItems[i].catId=v;
  if(v){const pr=_poProds.find(p=>p.id==v);if(pr){_poItems[i].name=pr.name;_poItems[i].price=pr.price;}}
  renderPOItems();
};
window.poItemQty=(i,v)=>{_poItems[i].qty=parseInt(v)||1;calcPOTotal();};
window.poItemPrice=(i,v)=>{_poItems[i].price=parseFloat(v)||0;calcPOTotal();};

function calcPOTotal(){
  const disType=$('#poDisType')?.value||'$';
  const disVal=parseFloat($('#poDis')?.value)||0;
  const hstR=parseFloat($('#poHST')?.value)||0;
  let sum=0;_poItems.forEach(it=>sum+=it.qty*(it.price||0));
  const discAmt=disType==='%'?(sum*disVal/100):disVal;
  const net=sum-discAmt;
  const hstAmt=net*hstR/100;
  const total=net+hstAmt;
  const el=$('#poTotalArea');
  if(!el)return;
  el.innerHTML=`<div class="sale-items-total">Subtotal: ${fC(sum)}${discAmt>0?` − Discount: ${disType==='%'?disVal+'% = ':''}${fC(discAmt)}`:''}${hstR>0?` + HST ${hstR}%: ${fC(hstAmt)}`:''} = <strong>Total: ${fC(total)}</strong></div>`;
}

window.savePO=async()=>{
  if(!validate([{id:'poDate',label:'Order Date',type:'date'}]))return;
  const custId=$('#poCustId').value;
  if(!custId){showInlineErr('Please select a customer');return;}
  const valid=_poItems.filter(it=>it.catId&&it.qty>0);
  if(!valid.length){showInlineErr('Add at least one item');return;}
  const disType=$('#poDisType').value||'$';
  const disVal=parseFloat($('#poDis').value)||0;
  const gstR=parseFloat($('#poGST').value)||0;
  const pstR=parseFloat($('#poPST').value)||0;
  const hstR=parseFloat($('#poHST').value)||0;
  let sub=0;valid.forEach(it=>sub+=it.qty*it.price);
  const discAmt=disType==='%'?(sub*disVal/100):disVal;
  const net=sub-discAmt;
  const hstAmt=net*hstR/100;
  const total=net+hstAmt;
  const btn=$('#savePOBtn');if(btn)btn.disabled=true;
  try{
    const r=await api.run("INSERT INTO purchase_orders (customer_id,order_date,delivery_date,discount,discount_type,tax_gst,tax_pst,tax_hst,tax_gst_rate,tax_pst_rate,tax_hst_rate,payment_method,payment_status,subtotal,total,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [custId,$('#poDate').value,$('#poDel').value||'',disVal,disType,0,0,hstAmt,gstR,pstR,hstR,$('#poPay').value,'Unpaid',sub,total,$('#poNote').value||'']);
    if(!r.ok)return;
    const poId=r.lastInsertRowid;
    for(const it of valid){
      await api.run("INSERT INTO po_items (po_id,catalog_id,product_name,qty,price,total) VALUES (?,?,?,?,?,?)",
        [poId,it.catId,it.name,it.qty,it.price,it.qty*it.price]);
    }
    closeM();refreshPO(1);
  }catch(e){}finally{if(btn)btn.disabled=false;}
};

window.editPO=async(id)=>{
  const po=(await api.query("SELECT po.*,c.name as cn,c.cust_id as ccid,c.type as ctype FROM purchase_orders po LEFT JOIN customers c ON po.customer_id=c.id WHERE po.id=?",[id])).data[0];
  if(!po)return;
  _poProds=(await api.query("SELECT * FROM catalog ORDER BY name")).data;
  const items=(await api.query("SELECT * FROM po_items WHERE po_id=?",[id])).data;
  _poItems=items.map(it=>({catId:String(it.catalog_id||''),name:it.product_name,qty:it.qty,price:it.price}));
  if(!_poItems.length)_poItems=[{catId:'',name:'',qty:1,price:0}];
  const dt=po.discount_type||'$';

  openM(`<h3>Edit PO #${id}</h3>
    <div class="fg"><label>Customer</label>
      <div style="position:relative"><input id="poCust" value="${esc(po.ccid+' '+po.cn)}" autocomplete="off"><input type="hidden" id="poCustId" value="${po.customer_id||''}"></div>
    </div>
    <div id="poCustInfo"></div>
    <div class="fg-row"><div class="fg"><label>Order Date</label><input type="date" id="poDate" value="${po.order_date}"></div><div class="fg"><label>Delivery Date</label><input type="date" id="poDel" value="${po.delivery_date||''}"></div></div>
    <h4 style="margin:12px 0 8px;color:var(--text-muted)">Order Items</h4>
    <div id="poItemsArea"></div>
    <button class="btn" onclick="addPOItem()" style="margin:8px 0">+ Add Item</button>
    <div id="poTotalArea"></div>
    <div class="fg-row">
      <div class="fg"><label>Discount Type</label><select id="poDisType" onchange="calcPOTotal()"><option value="$" ${dt==='$'?'selected':''}>$ (Amount)</option><option value="%" ${dt==='%'?'selected':''}>% (Percentage)</option></select></div>
      <div class="fg"><label>Discount ($)</label><input type="number" id="poDis" value="${po.discount||0}" step="0.01" oninput="calcPOTotal()"></div>
    </div>
    <div class="fg-row">
      <div class="fg"><label>GST (%)</label><input type="number" id="poGST" value="${po.tax_gst_rate||0}" step="0.01" min="0"></div>
      <div class="fg"><label>PST (%)</label><input type="number" id="poPST" value="${po.tax_pst_rate||0}" step="0.01" min="0"></div>
      <div class="fg"><label>HST (%) — applied</label><input type="number" id="poHST" value="${po.tax_hst_rate||0}" step="0.01" min="0" oninput="calcPOTotal()"></div>
    </div>
    <div class="fg"><label>Payment Method</label><select id="poPay"><option value="CASH" ${po.payment_method==='CASH'?'selected':''}>CASH</option><option value="E-transfer" ${po.payment_method==='E-transfer'?'selected':''}>E-transfer</option></select></div>
    <div class="fg"><label>Payment Status</label><select id="poPaySt"><option value="Unpaid" ${po.payment_status==='Unpaid'?'selected':''}>Unpaid</option><option value="Partial" ${po.payment_status==='Partial'?'selected':''}>Partial</option><option value="Paid" ${po.payment_status==='Paid'?'selected':''}>Paid</option><option value="Cancelled" ${po.payment_status==='Cancelled'?'selected':''}>⛔ Cancelled</option></select></div>
    <div class="fg"><label>Note</label><input id="poNote" value="${esc(po.note)}"></div>
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn green" onclick="updatePO(${id})">Save</button></div>`);

  setTimeout(()=>{
    setupAutocomplete('poCust',async(val)=>{
      const cs=(await api.query("SELECT id,cust_id,name,type,discount_rate FROM customers WHERE name LIKE ? OR cust_id LIKE ? LIMIT 8",['%'+val+'%','%'+val+'%'])).data;
      return cs.map(c=>({display:`${c.cust_id} - ${c.name}`,value:c.name,id:c.id,type:c.type,discount_rate:c.discount_rate}));
    },(item)=>{$('#poCust').value=item.display;$('#poCustId').value=item.id;showCustPOSummary(item);});
  },100);
  // Show current customer summary on edit load
  if(po.customer_id){
    const cData=(await api.query("SELECT id,cust_id,name,type,discount_rate FROM customers WHERE id=?",[po.customer_id])).data[0];
    if(cData) showCustPOSummary({display:`${cData.cust_id} - ${cData.name}`,id:cData.id,type:cData.type,discount_rate:cData.discount_rate});
  }
  renderPOItems();
};

window.updatePO=async(id)=>{
  if(!validate([{id:'poDate',label:'Order Date',type:'date'}]))return;
  const custId=$('#poCustId').value;
  if(!custId){showInlineErr('Please select a customer');return;}
  const valid=_poItems.filter(it=>it.catId&&it.qty>0);
  if(!valid.length){showInlineErr('Add at least one item');return;}
  const disType=$('#poDisType').value||'$';
  const disVal=parseFloat($('#poDis').value)||0;
  const gstR=parseFloat($('#poGST').value)||0;
  const pstR=parseFloat($('#poPST').value)||0;
  const hstR=parseFloat($('#poHST').value)||0;
  let sub=0;valid.forEach(it=>sub+=it.qty*it.price);
  const discAmt=disType==='%'?(sub*disVal/100):disVal;
  const net=sub-discAmt;
  const hstAmt=net*hstR/100;
  const total=net+hstAmt;
  const payStatus=$('#poPaySt')?.value||'Unpaid';
  await api.run("UPDATE purchase_orders SET customer_id=?,order_date=?,delivery_date=?,discount=?,discount_type=?,tax_gst=?,tax_pst=?,tax_hst=?,tax_gst_rate=?,tax_pst_rate=?,tax_hst_rate=?,payment_method=?,payment_status=?,subtotal=?,total=?,note=? WHERE id=?",
    [custId,$('#poDate').value,$('#poDel').value||'',disVal,disType,0,0,hstAmt,gstR,pstR,hstR,$('#poPay').value,payStatus,sub,total,$('#poNote').value||'',id]);
  await api.run("DELETE FROM po_items WHERE po_id=?",[id]);
  for(const it of valid){
    await api.run("INSERT INTO po_items (po_id,catalog_id,product_name,qty,price,total) VALUES (?,?,?,?,?,?)",
      [id,it.catId,it.name,it.qty,it.price,it.qty*it.price]);
  }
  closeM();refreshPO(1);
};

window.delPO=async(id)=>{if(!confirm('Delete this PO?'))return;
  await api.run("DELETE FROM payment_log WHERE po_id=?",[id]);
  await api.run("DELETE FROM po_items WHERE po_id=?",[id]);
  await api.run("DELETE FROM purchase_orders WHERE id=?",[id]);refreshPO(1);};

// Payment status management — click badge to record payment
window.toggleDelivered=async(id,cur)=>{
  await api.run("UPDATE purchase_orders SET delivered=? WHERE id=?",[cur?0:1,id]);
  refreshPO(_poPg);
};

window.togglePayStatus=async(id,cur)=>{
  const po=(await api.query("SELECT total,paid_amount FROM purchase_orders WHERE id=?",[id])).data[0];
  if(!po)return;
  const paid=po.paid_amount||0;const remaining=po.total-paid;
  const logs=(await api.query("SELECT * FROM payment_log WHERE po_id=? ORDER BY date DESC,id DESC",[id])).data;
  let logHtml='';
  if(logs.length>0){
    logHtml=`<h4 style="margin:16px 0 8px;color:var(--text-muted)">Payment History</h4>
      <table><tr><th>Date</th><th>Amount</th><th>Note</th><th></th></tr>
      ${logs.map(l=>`<tr><td>${l.date}</td><td class="text-green text-bold">${fC(l.amount)}</td><td>${l.note||'-'}</td><td><button class="act-btn del" onclick="delPayLog(${id},${l.id},${l.amount})">×</button></td></tr>`).join('')}</table>`;
  }
  openM(`<h3>💰 Record Payment — PO #${id}</h3>
    <div class="db-info-grid">
      <div class="db-info-item"><div class="label">Total</div><div class="value">${fC(po.total)}</div></div>
      <div class="db-info-item"><div class="label">Paid So Far</div><div class="value text-green">${fC(paid)}</div></div>
      <div class="db-info-item"><div class="label">Remaining</div><div class="value text-red">${fC(remaining>0?remaining:0)}</div></div>
      <div class="db-info-item"><div class="label">Status</div><div class="value">${cur}</div></div>
    </div>
    <div class="fg-row">
      <div class="fg"><label>Payment Amount ($) *</label><input type="number" id="payAmt" value="${remaining>0?remaining.toFixed(2):0}" step="0.01" min="0"></div>
      <div class="fg"><label>Date *</label><input type="date" id="payDate" value="${today()}"></div>
    </div>
    <div class="fg"><label>Note</label><input id="payNote" placeholder="e.g. E-transfer received, Cash payment..."></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn gray" onclick="closeM()">Cancel</button>
      <button class="btn green" onclick="applyPayment(${id})">Apply Payment</button>
    </div>
    ${logHtml}`);
};

window.applyPayment=async(id)=>{
  const amt=parseFloat($('#payAmt').value)||0;
  if(amt<=0){showInlineErr('Enter a payment amount');return;}
  const date=$('#payDate').value;
  if(!date){showInlineErr('Enter a date');return;}
  const note=$('#payNote').value||'';
  // Insert payment log
  await api.run("INSERT INTO payment_log (po_id,amount,date,note) VALUES (?,?,?,?)",[id,amt,date,note]);
  // Recalculate total paid
  const sum=(await api.query("SELECT COALESCE(SUM(amount),0) as s FROM payment_log WHERE po_id=?",[id])).data[0].s;
  const po=(await api.query("SELECT total FROM purchase_orders WHERE id=?",[id])).data[0];
  const status=sum<=0?'Unpaid':sum>=po.total?'Paid':'Partial';
  await api.run("UPDATE purchase_orders SET paid_amount=?,payment_status=? WHERE id=?",[sum,status,id]);
  closeM();refreshPO(_poPg);
};

window.delPayLog=async(poId,logId,amt)=>{
  if(!confirm('Delete this payment record?'))return;
  await api.run("DELETE FROM payment_log WHERE id=?",[logId]);
  // Recalculate
  const sum=(await api.query("SELECT COALESCE(SUM(amount),0) as s FROM payment_log WHERE po_id=?",[poId])).data[0].s;
  const po=(await api.query("SELECT total FROM purchase_orders WHERE id=?",[poId])).data[0];
  const status=sum<=0?'Unpaid':sum>=po.total?'Paid':'Partial';
  await api.run("UPDATE purchase_orders SET paid_amount=?,payment_status=? WHERE id=?",[sum,status,poId]);
  // Re-open the payment modal
  togglePayStatus(poId,status);
};

// Generate Invoice PDF (business customers only)
window.genInvoice=async(id)=>{
  const po=(await api.query("SELECT po.*,c.name as cn,c.cust_id as ccid,c.phone as cph,c.address as caddr,c.type as ctype FROM purchase_orders po LEFT JOIN customers c ON po.customer_id=c.id WHERE po.id=?",[id])).data[0];
  if(!po)return;
  const items=(await api.query("SELECT pi.* FROM po_items pi WHERE pi.po_id=?",[id])).data;
  const ci=(await api.query("SELECT * FROM company_info WHERE id=1")).data[0]||{};

  const disType=po.discount_type||'$';
  const discAmt=disType==='%'?(po.subtotal*po.discount/100):po.discount;

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#2C2418;font-size:13px;}
    .inv-header{display:flex;justify-content:space-between;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #8B6F4E;}
    .inv-title{font-size:28px;font-weight:bold;color:#8B6F4E;}
    .inv-company{text-align:right;font-size:12px;color:#555;}
    .inv-company strong{font-size:14px;color:#2C2418;}
    .inv-meta{display:flex;justify-content:space-between;margin-bottom:25px;}
    .inv-meta-box{background:#F5F1EB;padding:15px;border-radius:8px;flex:1;margin:0 5px;}
    .inv-meta-box:first-child{margin-left:0;}.inv-meta-box:last-child{margin-right:0;}
    .inv-meta-label{font-size:11px;color:#7A6B58;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
    .inv-meta-val{font-size:14px;font-weight:bold;}
    table{width:100%;border-collapse:collapse;margin:20px 0;}
    th{background:#8B6F4E;color:#fff;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;}
    td{padding:10px 12px;border-bottom:1px solid #E0D5C4;}
    tr:nth-child(even) td{background:#FAFAF7;}
    .text-right{text-align:right;}
    .totals{margin-top:10px;margin-left:auto;width:300px;}
    .totals-row{display:flex;justify-content:space-between;padding:8px 12px;font-size:13px;}
    .totals-row.final{background:#8B6F4E;color:#fff;border-radius:6px;font-size:16px;font-weight:bold;margin-top:5px;}
    .totals-row.disc{color:#C0392B;}
    .inv-footer{margin-top:40px;padding-top:15px;border-top:1px solid #E0D5C4;font-size:11px;color:#999;text-align:center;}
  </style></head><body>
    <div class="inv-header">
      <div><div class="inv-title">INVOICE</div><div style="margin-top:5px;color:#7A6B58">PO #${po.id} | Issued: ${today()}
      </div></div>
      <div class="inv-company"><strong>${ci.name||'My Business'}</strong><br>${ci.address||''}<br>${ci.contact||''}</div>
    </div>
    <div class="inv-meta">
      <div class="inv-meta-box"><div class="inv-meta-label">Bill To</div><div class="inv-meta-val">${po.ccid} - ${po.cn}</div><div style="font-size:12px;color:#555;margin-top:4px">${po.cph||''}<br>${po.caddr||''}</div></div>
      <div class="inv-meta-box"><div class="inv-meta-label">Order Date</div><div class="inv-meta-val">${po.order_date}</div></div>
      <div class="inv-meta-box"><div class="inv-meta-label">Delivery Date</div><div class="inv-meta-val">${po.delivery_date||'TBD'}</div></div>
      <div class="inv-meta-box"><div class="inv-meta-label">Payment</div><div class="inv-meta-val">${po.payment_method}</div></div>
    </div>
    <table>
      <tr><th>#</th><th>Product</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Subtotal</th></tr>
      ${items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.product_name}</td><td class="text-right">${it.qty}</td><td class="text-right">${fC(it.price)}</td><td class="text-right">${fC(it.total)}</td></tr>`).join('')}
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${fC(po.subtotal)}</span></div>
      ${po.discount>0?`<div class="totals-row disc"><span>Discount${disType==='%'?' ('+po.discount+'%)':''}</span><span>-${fC(discAmt)}</span></div>`:''}
      ${(po.tax_hst||0)>0?`<div class="totals-row"><span>HST (${po.tax_hst_rate||0}%)</span><span>${fC(po.tax_hst)}</span></div>`:''}
      <div class="totals-row final"><span>Total</span><span>${fC(po.total)}</span></div>
    </div>
    ${po.note?`<div style="margin-top:20px;padding:12px;background:#F5F1EB;border-radius:6px;font-size:12px"><strong>Note:</strong> ${po.note}</div>`:''}
    <div class="inv-footer">Thank you for your business!</div>
  </body></html>`;

  const result=await api.generateInvoice(html);
  if(result.ok){
    await api.run("UPDATE purchase_orders SET invoice_date=? WHERE id=?",[today(),id]);
    refreshPO(_poPg);
  }
};

// ============================================================
// EXPENSE
// ============================================================
let _expPg=1;
async function loadExpense(){destroyCharts();$('#hd').innerText='Expense';
  $('#ct').innerHTML=`<div class="btn-group"><button class="btn red" onclick="addExpense()">+ Add Expense</button></div>
    <div class="filter-bar">
      <div class="fg"><label>From</label><input type="date" id="expFrom" value="${_f.exp.from}"></div>
      <div class="fg"><label>To</label><input type="date" id="expTo" value="${_f.exp.to}"></div>
      <div class="fg" style="flex:1"><label>Search (Expense Name)</label><input id="expSrch" placeholder="Expense name..." value="${_f.exp.sr}"></div>
      <button class="btn" onclick="refreshExp(1)">Search</button>
    </div>
    <div id="expT"><div class="loading">로딩 중...</div></div>`;refreshExp(1);}

window.refreshExp=async(pg)=>{_expPg=pg||1;showLoading('#expT');
  _f.exp.from=$('#expFrom').value;_f.exp.to=$('#expTo').value;_f.exp.sr=$('#expSrch').value;
  const from=_f.exp.from,to=_f.exp.to,sr=_f.exp.sr;
  let w="e.date>=? AND e.date<=?",p=[from,to];
  if(sr){w+=" AND e.name LIKE ?";p.push('%'+sr+'%');}
  const tot=(await api.query(`SELECT COUNT(*) as c FROM expenses e WHERE ${w}`,p)).data[0]?.c||0;
  const sm=(await api.query(`SELECT COALESCE(SUM(e.amount),0) as t FROM expenses e WHERE ${w}`,p)).data[0];
  const off=(_expPg-1)*PG;
  const exps=(await api.query(`SELECT e.* FROM expenses e WHERE ${w} ORDER BY e.date DESC,e.id DESC LIMIT ${PG} OFFSET ${off}`,p)).data;

  $('#expT').innerHTML=`<div class="summary-row"><div class="summary-item"><div class="label">Total Expenses (before tax)</div><div class="value text-red">${fC(sm.t)}</div></div><div class="summary-item"><div class="label">Records</div><div class="value">${fN(tot)}</div></div></div>
    <table><tr><th>Date</th><th>Expense Name</th><th>Amount</th><th>HST</th><th>Total</th><th>Note</th><th>Receipt</th><th>Actions</th></tr>
    ${exps.length===0?'<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">No expenses</td></tr>':''}
    ${exps.map(e=>`<tr>
      <td>${e.date}</td>
      <td class="text-bold">${e.name}</td>
      <td class="text-red">${fC(e.amount)}</td>
      <td>${(e.tax_hst||0)>0?fC(e.tax_hst):'—'}</td>
      <td class="text-red text-bold">${fC(e.amount+(e.tax_hst||0))}</td>
      <td>${e.note||'-'}</td>
      <td>${e.receipt_path?e.receipt_path.split('|').filter(p=>p).map((p,i)=>`<button class="act-btn" data-rp="${encodeURIComponent(p)}" onclick="openReceipt(decodeURIComponent(this.dataset.rp))">📎 ${i+1}</button>`).join(' '):'<span style="color:var(--text-light)">-</span>'}</td>
      <td><button class="act-btn" onclick="editExpense(${e.id})">Edit</button><button class="act-btn del" onclick="delExpense(${e.id})">Del</button></td>
    </tr>`).join('')}</table>${renderPager(tot,_expPg,'refreshExp')}`;
};

window.openReceipt=async(path)=>{await api.openFile(path);};

window.addExpense=async()=>{
  _expReceipts=[];
  const ci=(await api.query("SELECT receipt_folder,tax_gst,tax_pst,tax_hst FROM company_info WHERE id=1")).data[0]||{};
  openM(`<h3>Add Expense</h3>
    <div class="fg"><label>Expense Name *</label><input id="expN"></div>
    <div class="fg"><label>Amount ($) * (before tax)</label><input type="number" id="expA" value="0" step="0.01"></div>
    <div class="fg"><label>Date *</label><input type="date" id="expD" value="${today()}"></div>
    <div class="fg-row">
      <div class="fg"><label>GST (%)</label><input type="number" id="expGST" value="${ci.tax_gst||0}" step="0.01" min="0"></div>
      <div class="fg"><label>PST (%)</label><input type="number" id="expPST" value="${ci.tax_pst||0}" step="0.01" min="0"></div>
      <div class="fg"><label>HST (%) — applied</label><input type="number" id="expHST" value="${ci.tax_hst||0}" step="0.01" min="0" oninput="calcExpTotal()"></div>
    </div>
    <div id="expTotalArea"></div>
    <div class="fg"><label>Note</label><input id="expNote"></div>
    <div class="fg"><label>Receipts</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="expReceipt" readonly placeholder="No files selected" style="flex:1;background:#F0EDE6">
        <button class="btn" onclick="uploadExpReceipt()">📎 Upload</button>
      </div>
      ${!ci?.receipt_folder?'<div class="error-msg">Set receipt folder in Company Info first</div>':''}
    </div>
    <input type="hidden" id="expReceiptPath" value="">
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn red" onclick="saveExpense()">Save</button></div>`);
  calcExpTotal();
};

let _expReceipts=[];
window.uploadExpReceipt=async()=>{
  const ci=(await api.query("SELECT receipt_folder FROM company_info WHERE id=1")).data[0];
  if(!ci?.receipt_folder){showInlineErr('Please set a receipt folder in Company Info first.');return;}
  const expName=$('#expN')?.value?.trim()||'receipt';
  const expDate=$('#expD')?.value||today();
  const r=await api.uploadReceipt(ci.receipt_folder,expName,expDate);
  if(r.ok&&r.files.length>0){
    for(const f of r.files) _expReceipts.push(f);
    $('#expReceipt').value=_expReceipts.map(f=>f.filename).join(', ');
    $('#expReceiptPath').value=_expReceipts.map(f=>f.path).join('|');
  }
};

window.calcExpTotal=()=>{
  const amt=parseFloat($('#expA')?.value)||0;
  const hstR=parseFloat($('#expHST')?.value)||0;
  const hstAmt=amt*hstR/100;
  const total=amt+hstAmt;
  const el=$('#expTotalArea');
  if(el)el.innerHTML=`<div class="sale-items-total" style="margin-bottom:8px">Amount: ${fC(amt)}${hstR>0?` + HST ${hstR}%: ${fC(hstAmt)}`:''} = <strong>Total: ${fC(total)}</strong></div>`;
};

window.saveExpense=async()=>{
  if(!validate([{id:'expN',label:'Name',type:'required'},{id:'expA',label:'Amount',type:'number',min:0},{id:'expD',label:'Date',type:'date'}]))return;
  const amt=parseFloat($('#expA').value)||0;
  const gstR=parseFloat($('#expGST')?.value)||0;
  const pstR=parseFloat($('#expPST')?.value)||0;
  const hstR=parseFloat($('#expHST')?.value)||0;
  const hstAmt=amt*hstR/100;
  await api.run("INSERT INTO expenses (name,amount,date,note,receipt_path,tax_gst,tax_pst,tax_hst,tax_gst_rate,tax_pst_rate,tax_hst_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [$('#expN').value.trim(),amt,$('#expD').value,$('#expNote').value,$('#expReceiptPath').value||'',0,0,hstAmt,gstR,pstR,hstR]);
  closeM();refreshExp(1);
};

window.editExpense=async(id)=>{
  const e=(await api.query("SELECT * FROM expenses WHERE id=?",[id])).data[0];
  _expReceipts=e.receipt_path?e.receipt_path.split('|').filter(p=>p).map(p=>({path:p,filename:p.split(/[\\/]/).pop()})):[];
  const displayNames=_expReceipts.map(f=>f.filename).join(', ');
  openM(`<h3>Edit Expense</h3>
    <div class="fg"><label>Expense Name *</label><input id="expN" value="${esc(e.name)}"></div>
    <div class="fg"><label>Amount ($) * (before tax)</label><input type="number" id="expA" value="${e.amount}" step="0.01" oninput="calcExpTotal()"></div>
    <div class="fg"><label>Date *</label><input type="date" id="expD" value="${e.date}"></div>
    <div class="fg-row">
      <div class="fg"><label>GST (%)</label><input type="number" id="expGST" value="${e.tax_gst_rate||0}" step="0.01" min="0"></div>
      <div class="fg"><label>PST (%)</label><input type="number" id="expPST" value="${e.tax_pst_rate||0}" step="0.01" min="0"></div>
      <div class="fg"><label>HST (%) — applied</label><input type="number" id="expHST" value="${e.tax_hst_rate||0}" step="0.01" min="0" oninput="calcExpTotal()"></div>
    </div>
    <div id="expTotalArea"></div>
    <div class="fg"><label>Note</label><input id="expNote" value="${esc(e.note)}"></div>
    <div class="fg"><label>Receipts (${_expReceipts.length})</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="expReceipt" readonly value="${displayNames}" style="flex:1;background:#F0EDE6">
        <button class="btn" onclick="uploadExpReceipt()">📎 Upload</button>
      </div>
    </div>
    <input type="hidden" id="expReceiptPath" value="${e.receipt_path||''}">
    <div style="text-align:right;margin-top:16px"><button class="btn gray" onclick="closeM()" style="margin-right:8px">Cancel</button><button class="btn red" onclick="updateExpense(${id})">Save</button></div>`);
  calcExpTotal();
};

window.updateExpense=async(id)=>{
  if(!validate([{id:'expN',label:'Name',type:'required'},{id:'expA',label:'Amount',type:'number',min:0},{id:'expD',label:'Date',type:'date'}]))return;
  const amt=parseFloat($('#expA').value)||0;
  const gstR=parseFloat($('#expGST')?.value)||0;
  const pstR=parseFloat($('#expPST')?.value)||0;
  const hstR=parseFloat($('#expHST')?.value)||0;
  const hstAmt=amt*hstR/100;
  await api.run("UPDATE expenses SET name=?,amount=?,date=?,note=?,receipt_path=?,tax_gst=?,tax_pst=?,tax_hst=?,tax_gst_rate=?,tax_pst_rate=?,tax_hst_rate=? WHERE id=?",
    [$('#expN').value.trim(),amt,$('#expD').value,$('#expNote').value,$('#expReceiptPath').value||'',0,0,hstAmt,gstR,pstR,hstR,id]);
  closeM();refreshExp(1);
};

window.delExpense=async(id)=>{if(!confirm('Delete?'))return;await api.run("DELETE FROM expenses WHERE id=?",[id]);refreshExp(1);};

// ============================================================
// CUSTOMER REPORT (fully reactive)
// ============================================================
async function loadCustReport(){destroyCharts();$('#hd').innerText='거래처 리포트';
  const cs=(await api.query("SELECT id,cust_id,name FROM customers ORDER BY name")).data;
  $('#ct').innerHTML=`<div class="filter-bar">
    <div class="fg"><label>Customer</label><select id="crC" onchange="refreshCR()"><option value="">All</option>${cs.map(c=>`<option value="${c.id}" ${_f.cr.cid==c.id?'selected':''}>${c.cust_id} - ${c.name}</option>`).join('')}</select></div>
    <div class="fg"><label>From</label><input type="date" id="crF" value="${_f.cr.from}" onchange="refreshCR()"></div>
    <div class="fg"><label>To</label><input type="date" id="crT" value="${_f.cr.to}" onchange="refreshCR()"></div>
  </div><div id="crBody"><div class="loading">로딩 중...</div></div>`;refreshCR();}

window.refreshCR=async()=>{destroyCharts();showLoading('#crBody');
  _f.cr.cid=$('#crC').value;_f.cr.from=$('#crF').value;_f.cr.to=$('#crT').value;
  const cid=_f.cr.cid,from=_f.cr.from,to=_f.cr.to;
  let df='1=1',p=[];
  if(cid){df+=' AND po.customer_id=?';p.push(cid);}
  if(from){df+=' AND po.order_date>=?';p.push(from);}
  if(to){df+=' AND po.order_date<=?';p.push(to);}

  let chartLabel='',chartData=[];
  if(cid){
    const cn=$('#crC').options[$('#crC').selectedIndex].text;
    chartLabel=cn+' - Products';
    chartData=(await api.query(`SELECT pi.product_name as name,COALESCE(SUM(pi.total),0) as s FROM purchase_orders po JOIN po_items pi ON pi.po_id=po.id WHERE ${df} GROUP BY pi.product_name ORDER BY s DESC LIMIT 10`,p)).data;
  }else{
    chartLabel='Top 10 Customers';
    chartData=(await api.query(`SELECT c.name,COALESCE(SUM(po.total),0) as s FROM purchase_orders po JOIN customers c ON po.customer_id=c.id WHERE ${df} GROUP BY c.id ORDER BY s DESC LIMIT 10`,p)).data;
  }

  const mo=(await api.query(`SELECT strftime('%Y-%m',po.order_date) as m,SUM(po.total) as s FROM purchase_orders po WHERE ${df} GROUP BY m ORDER BY m DESC LIMIT 12`,p)).data.reverse();

  let detailRows=[];
  if(cid){
    detailRows=(await api.query(`SELECT pi.product_name as pn,SUM(pi.qty) as q,SUM(pi.total) as a FROM purchase_orders po JOIN po_items pi ON pi.po_id=po.id WHERE ${df} GROUP BY pi.product_name ORDER BY a DESC`,p)).data;
  }else{
    detailRows=(await api.query(`SELECT c.cust_id as ccid,c.name as cn,SUM(po.total) as a,COUNT(po.id) as cnt FROM purchase_orders po JOIN customers c ON po.customer_id=c.id WHERE ${df} GROUP BY c.id ORDER BY a DESC LIMIT 20`,p)).data;
  }

  const sum=(await api.query(`SELECT COALESCE(SUM(po.total),0) as r,COUNT(*) as c FROM purchase_orders po WHERE ${df}`,p)).data[0];

  const titleText=cid?$('#crC').options[$('#crC').selectedIndex].text:'All Customers';
  const detailHeader=cid?'<tr><th>Product</th><th>Qty</th><th>Revenue</th></tr>':'<tr><th>ID</th><th>Customer</th><th>Orders</th><th>Revenue</th></tr>';
  const detailBody=detailRows.length===0?`<tr><td colspan="${cid?3:4}" style="text-align:center;color:var(--text-muted)">No data</td></tr>`:
    detailRows.map(r=>cid?
      `<tr><td class="text-bold">${r.pn}</td><td>${fN(r.q)}</td><td class="text-green text-bold">${fC(r.a)}</td></tr>`:
      `<tr><td class="text-bold">${r.ccid}</td><td>${r.cn}</td><td>${fN(r.cnt)}</td><td class="text-green text-bold">${fC(r.a)}</td></tr>`
    ).join('');

  $('#crBody').innerHTML=`
    <div class="info-box">${titleText} | Total Revenue: <strong class="text-green">${fC(sum.r)}</strong> | Orders: ${fN(sum.c)}</div>
    <div class="chart-row"><div class="chart-box"><h3>${chartLabel}</h3><canvas id="chCB" height="160"></canvas></div><div class="chart-box"><h3>Monthly Trend</h3><canvas id="chCL" height="160"></canvas></div></div>
    <h3 style="margin:0 0 10px;color:var(--text-muted)">${cid?'Product Detail':'Customer Summary (Top 20)'}</h3>
    <table>${detailHeader}${detailBody}</table>`;

  if(chartData.length>0)makeChart('chCB',{type:'bar',data:{labels:chartData.map(c=>c.name),datasets:[{data:chartData.map(c=>c.s),backgroundColor:'#8B6F4E',borderRadius:6}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}});
  if(mo.length>0)makeChart('chCL',{type:'line',data:{labels:mo.map(m=>m.m),datasets:[{data:mo.map(m=>m.s),borderColor:'#2980B9',backgroundColor:'rgba(41,128,185,.1)',fill:true,tension:.3}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
};

// ============================================================
// MATERIAL STOCK HISTORY
// ============================================================
let _shPg=1;
async function loadStockHistory(){destroyCharts();$('#hd').innerText='입출고 이력';
  const ms=(await api.query("SELECT id,name FROM materials ORDER BY name")).data;
  $('#ct').innerHTML=`<div class="filter-bar">
    <div class="fg"><label>Material</label><select id="shP" onchange="refreshSH(1)"><option value="">All</option>${ms.map(m=>`<option value="${m.id}" ${_f.sh.pid==m.id?'selected':''}>${m.name}</option>`).join('')}</select></div>
    <div class="fg"><label>From</label><input type="date" id="shF" value="${_f.sh.from}" onchange="refreshSH(1)"></div>
    <div class="fg"><label>To</label><input type="date" id="shT" value="${_f.sh.to}" onchange="refreshSH(1)"></div>
  </div><div id="shC"><div class="loading">로딩 중...</div></div>`;refreshSH(1);}

window.refreshSH=async(pg)=>{_shPg=pg||1;showLoading('#shC');
  _f.sh.pid=$('#shP').value;_f.sh.from=$('#shF').value;_f.sh.to=$('#shT').value;
  const pid=_f.sh.pid,from=_f.sh.from,to=_f.sh.to;
  let w="ml.date>=? AND ml.date<=?",p=[from,to];
  if(pid){w+=" AND ml.material_id=?";p.push(pid);}
  const tot=(await api.query(`SELECT COUNT(*) as c FROM material_log ml WHERE ${w}`,p)).data[0]?.c||0;
  const off=(_shPg-1)*PG;
  const logs=(await api.query(`SELECT ml.*,m.name as mn,m.uom FROM material_log ml JOIN materials m ON ml.material_id=m.id WHERE ${w} ORDER BY ml.date DESC,ml.id DESC LIMIT ${PG} OFFSET ${off}`,p)).data;

  $('#shC').innerHTML=`<table><tr><th>Date</th><th>Material</th><th>Type</th><th>Change</th><th>Before</th><th>After</th><th>Note</th></tr>
    ${logs.length===0?'<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No records</td></tr>':''}
    ${logs.map(l=>{const isAdd=l.type==='add';return`<tr>
      <td>${l.date}</td>
      <td class="text-bold">${l.mn}</td>
      <td><span class="badge ${isAdd?'badge-purple':'badge-orange'}">${isAdd?'Add':'Use'}</span></td>
      <td class="text-bold" style="color:${isAdd?'var(--purple)':'var(--orange)'}">${isAdd?'+':'-'}${Number(l.qty).toFixed(2)} ${l.uom}</td>
      <td>${Number(l.prev_qty).toFixed(2)}</td>
      <td>${Number(l.new_qty).toFixed(2)}</td>
      <td>${l.note||'-'}</td>
    </tr>`;}).join('')}</table>${renderPager(tot,_shPg,'refreshSH')}`;
};


// ============================================================
// TAX REPORT (Canadian Tax - HST/GST/PST)
// ============================================================
async function loadTaxReport(){destroyCharts();$('#hd').innerText='세금 보고서 (Tax Report)';
  const yr=new Date().getFullYear();
  const years=[];for(let y=yr;y>=yr-3;y--)years.push(y);
  $('#ct').innerHTML=`<div class="info-box">캐나다 세금 보고(T2125)에 필요한 매출/지출/HST 요약 리포트입니다.</div>
    <div class="filter-bar">
      <div class="fg"><label>Year</label><select id="taxYr" onchange="refreshTaxReport()">${years.map(y=>`<option value="${y}">${y}</option>`).join('')}</select></div>
      <button class="btn green" onclick="exportTaxXlsx()" style="margin-left:auto">📥 Export to Excel</button>
    </div>
    <div id="taxBody"><div class="loading">로딩 중...</div></div>`;
  refreshTaxReport();
}

let _taxData=null;
window.refreshTaxReport=async()=>{
  destroyCharts();showLoading('#taxBody');
  const yr=$('#taxYr').value;
  const yrS=yr+'-01-01',yrE=yr+'-12-31';

  // Revenue by payment method
  const revCash=(await api.query("SELECT COALESCE(SUM(subtotal),0) as sub,COALESCE(SUM(tax_hst),0) as hst,COALESCE(SUM(total),0) as tot,COUNT(*) as cnt FROM purchase_orders WHERE order_date>=? AND order_date<=? AND payment_method='CASH'",[yrS,yrE])).data[0];
  const revET=(await api.query("SELECT COALESCE(SUM(subtotal),0) as sub,COALESCE(SUM(tax_hst),0) as hst,COALESCE(SUM(total),0) as tot,COUNT(*) as cnt FROM purchase_orders WHERE order_date>=? AND order_date<=? AND payment_method='E-transfer'",[yrS,yrE])).data[0];
  const revAll=(await api.query("SELECT COALESCE(SUM(subtotal),0) as sub,COALESCE(SUM(tax_hst),0) as hst,COALESCE(SUM(total),0) as tot,COUNT(*) as cnt FROM purchase_orders WHERE order_date>=? AND order_date<=?",[yrS,yrE])).data[0];

  // Distinct tax rate combos from POs
  const revRates=(await api.query("SELECT tax_gst_rate as gr,tax_pst_rate as pr,tax_hst_rate as hr,COALESCE(SUM(tax_hst),0) as hst,COUNT(*) as cnt FROM purchase_orders WHERE order_date>=? AND order_date<=? GROUP BY tax_gst_rate,tax_pst_rate,tax_hst_rate ORDER BY cnt DESC",[yrS,yrE])).data;

  // Expense totals
  const expAll=(await api.query("SELECT COALESCE(SUM(amount),0) as sub,COALESCE(SUM(COALESCE(tax_hst,0)),0) as hst,COUNT(*) as cnt FROM expenses WHERE date>=? AND date<=?",[yrS,yrE])).data[0];

  // Distinct tax rate combos from expenses
  const expRates=(await api.query("SELECT COALESCE(tax_gst_rate,0) as gr,COALESCE(tax_pst_rate,0) as pr,COALESCE(tax_hst_rate,0) as hr,COALESCE(SUM(COALESCE(tax_hst,0)),0) as hst,COUNT(*) as cnt FROM expenses WHERE date>=? AND date<=? GROUP BY tax_gst_rate,tax_pst_rate,tax_hst_rate ORDER BY cnt DESC",[yrS,yrE])).data;

  // Expense by category with GST/PST/HST
  const expCats=(await api.query("SELECT name as cat,COALESCE(SUM(amount),0) as sub,COALESCE(SUM(COALESCE(tax_hst,0)),0) as hst,COALESCE(tax_gst_rate,0) as gr,COALESCE(tax_pst_rate,0) as pr,COALESCE(tax_hst_rate,0) as hr,COUNT(*) as cnt FROM expenses WHERE date>=? AND date<=? GROUP BY name,tax_gst_rate,tax_pst_rate,tax_hst_rate ORDER BY sub DESC",[yrS,yrE])).data;
  // Merge same-name categories
  const catMap={};
  for(const c of expCats){
    if(!catMap[c.cat])catMap[c.cat]={cat:c.cat,sub:0,hst:0,gst:0,pst:0,cnt:0};
    const s=splitHST(c.hst,c.gr,c.pr);
    catMap[c.cat].sub+=c.sub;catMap[c.cat].hst+=c.hst;catMap[c.cat].gst+=s.gst;catMap[c.cat].pst+=s.pst;catMap[c.cat].cnt+=c.cnt;
  }
  const catList=Object.values(catMap).sort((a,b)=>b.sub-a.sub);

  // Monthly breakdown
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const moRevCash=(await api.query("SELECT strftime('%m',order_date) as m,COALESCE(SUM(subtotal),0) as sub,COALESCE(SUM(tax_hst),0) as hst,COALESCE(SUM(total),0) as tot,COUNT(*) as cnt FROM purchase_orders WHERE order_date>=? AND order_date<=? AND payment_method='CASH' GROUP BY m",[yrS,yrE])).data;
  const moRevET=(await api.query("SELECT strftime('%m',order_date) as m,COALESCE(SUM(subtotal),0) as sub,COALESCE(SUM(tax_hst),0) as hst,COALESCE(SUM(total),0) as tot,COUNT(*) as cnt FROM purchase_orders WHERE order_date>=? AND order_date<=? AND payment_method='E-transfer' GROUP BY m",[yrS,yrE])).data;
  // Monthly revenue with GST/PST split per month
  const moRevRates=(await api.query("SELECT strftime('%m',order_date) as m,tax_gst_rate as gr,tax_pst_rate as pr,COALESCE(SUM(tax_hst),0) as hst FROM purchase_orders WHERE order_date>=? AND order_date<=? GROUP BY m,tax_gst_rate,tax_pst_rate",[yrS,yrE])).data;
  const moExp=(await api.query("SELECT strftime('%m',date) as m,COALESCE(SUM(amount),0) as sub,COALESCE(SUM(COALESCE(tax_hst,0)),0) as hst,COUNT(*) as cnt FROM expenses WHERE date>=? AND date<=? GROUP BY m",[yrS,yrE])).data;
  const moExpRates=(await api.query("SELECT strftime('%m',date) as m,COALESCE(tax_gst_rate,0) as gr,COALESCE(tax_pst_rate,0) as pr,COALESCE(SUM(COALESCE(tax_hst,0)),0) as hst FROM expenses WHERE date>=? AND date<=? GROUP BY m,tax_gst_rate,tax_pst_rate",[yrS,yrE])).data;

  // Split HST into estimated GST/PST
  function splitHST(hst,gr,pr){const gp=gr+pr;return gp>0?{gst:hst*(gr/gp),pst:hst*(pr/gp)}:{gst:0,pst:0};}
  let revTotalGST=0,revTotalPST=0;
  for(const r of revRates){const s=splitHST(r.hst,r.gr,r.pr);revTotalGST+=s.gst;revTotalPST+=s.pst;}
  let expTotalGST=0,expTotalPST=0;
  for(const r of expRates){const s=splitHST(r.hst,r.gr,r.pr);expTotalGST+=s.gst;expTotalPST+=s.pst;}

  const cashRatio=revAll.hst>0?(revCash.hst/revAll.hst):0;
  const etRatio=revAll.hst>0?(revET.hst/revAll.hst):0;
  const taxBalance=revAll.hst-expAll.hst;
  const netIncome=revAll.tot-(expAll.sub+expAll.hst);

  // HST Breakdown table (by actual rate combos used)
  let hstTbl='';
  const rateMap={};
  for(const r of revRates){const k=`${r.gr}/${r.pr}/${r.hr}`;if(!rateMap[k])rateMap[k]={gr:r.gr,pr:r.pr,hr:r.hr,rHST:0,eHST:0};rateMap[k].rHST+=r.hst;}
  for(const r of expRates){const k=`${r.gr}/${r.pr}/${r.hr}`;if(!rateMap[k])rateMap[k]={gr:r.gr,pr:r.pr,hr:r.hr,rHST:0,eHST:0};rateMap[k].eHST+=r.hst;}
  const hstBreakdown=[];
  for(const[k,v]of Object.entries(rateMap)){
    const rs=splitHST(v.rHST,v.gr,v.pr),es=splitHST(v.eHST,v.gr,v.pr);
    hstTbl+=`<tr><td>GST ${v.gr}% / PST ${v.pr}% / HST ${v.hr}%</td><td>${fC(rs.gst)}</td><td>${fC(rs.pst)}</td><td class="text-bold">${fC(v.rHST)}</td><td>${fC(es.gst)}</td><td>${fC(es.pst)}</td><td class="text-bold">${fC(v.eHST)}</td></tr>`;
    hstBreakdown.push({label:`GST ${v.gr}%/PST ${v.pr}%/HST ${v.hr}%`,gstRate:v.gr,pstRate:v.pr,hstRate:v.hr,revTax:v.rHST,expTax:v.eHST});
  }

  // Monthly table with GST/PST/HST split
  let moTbl='';const moT={rC:0,rE:0,rS:0,rGST:0,rPST:0,rHST:0,rT:0,o:0,eS:0,eGST:0,ePST:0,eHST:0,eT:0,eC:0,n:0};
  const monthlyData=[];
  for(let m=1;m<=12;m++){
    const ms=String(m).padStart(2,'0');
    const rc=moRevCash.find(x=>x.m===ms)||{sub:0,hst:0,tot:0,cnt:0};
    const re=moRevET.find(x=>x.m===ms)||{sub:0,hst:0,tot:0,cnt:0};
    const ex=moExp.find(x=>x.m===ms)||{sub:0,hst:0,cnt:0};
    const rSub=rc.sub+re.sub,rHST=rc.hst+re.hst,rTot=rc.tot+re.tot,ord=rc.cnt+re.cnt,eTotal=ex.sub+ex.hst,net=rTot-eTotal;
    // Monthly GST/PST split
    let mRevGST=0,mRevPST=0;
    for(const rr of moRevRates.filter(x=>x.m===ms)){const s=splitHST(rr.hst,rr.gr,rr.pr);mRevGST+=s.gst;mRevPST+=s.pst;}
    let mExpGST=0,mExpPST=0;
    for(const er of moExpRates.filter(x=>x.m===ms)){const s=splitHST(er.hst,er.gr,er.pr);mExpGST+=s.gst;mExpPST+=s.pst;}
    moT.rC+=rc.sub;moT.rE+=re.sub;moT.rS+=rSub;moT.rGST+=mRevGST;moT.rPST+=mRevPST;moT.rHST+=rHST;moT.rT+=rTot;moT.o+=ord;
    moT.eS+=ex.sub;moT.eGST+=mExpGST;moT.ePST+=mExpPST;moT.eHST+=ex.hst;moT.eT+=eTotal;moT.eC+=ex.cnt;moT.n+=net;
    monthlyData.push({month:months[m-1],revCash:rc.sub,revET:re.sub,revSub:rSub,revGST:mRevGST,revPST:mRevPST,revHST:rHST,revTotal:rTot,orders:ord,expSub:ex.sub,expGST:mExpGST,expPST:mExpPST,expHST:ex.hst,expTotal:eTotal,expCnt:ex.cnt,net});
    moTbl+=`<tr><td class="text-bold">${months[m-1]}</td><td>${fC(rc.sub)}</td><td>${fC(re.sub)}</td><td class="text-green">${fC(rSub)}</td><td>${fC(mRevGST)}</td><td>${fC(mRevPST)}</td><td>${fC(rHST)}</td><td class="text-green text-bold">${fC(rTot)}</td><td>${ord}</td><td class="text-red">${fC(ex.sub)}</td><td>${fC(mExpGST)}</td><td>${fC(mExpPST)}</td><td>${fC(ex.hst)}</td><td class="text-red text-bold">${fC(eTotal)}</td><td>${ex.cnt}</td><td class="text-bold" style="color:${net>=0?'var(--green)':'var(--red)'}">${fC(net)}</td></tr>`;
  }

  // Store for Excel export
  _taxData={year:yr,
    rev:{cashSub:revCash.sub,etSub:revET.sub,totalSub:revAll.sub,
      cashGST:revTotalGST*cashRatio,etGST:revTotalGST*etRatio,totalGST:revTotalGST,
      cashPST:revTotalPST*cashRatio,etPST:revTotalPST*etRatio,totalPST:revTotalPST,
      cashHST:revCash.hst,etHST:revET.hst,totalHST:revAll.hst,
      cashTax:revCash.hst,etTax:revET.hst,totalTax:revAll.hst,
      cashTotal:revCash.tot,etTotal:revET.tot,grandTotal:revAll.tot},
    exp:{totalSub:expAll.sub,totalGST:expTotalGST,totalPST:expTotalPST,totalHST:expAll.hst,totalTax:expAll.hst,grandTotal:expAll.sub+expAll.hst,totalCnt:expAll.cnt},
    netIncome,taxBalance,hstBreakdown,monthly:monthlyData,
    moTotal:{revCash:moT.rC,revET:moT.rE,revSub:moT.rS,revGST:moT.rGST,revPST:moT.rPST,revHST:moT.rHST,revTotal:moT.rT,orders:moT.o,expSub:moT.eS,expGST:moT.eGST,expPST:moT.ePST,expHST:moT.eHST,expTotal:moT.eT,expCnt:moT.eC,net:moT.n},
    expCats:catList.map(c=>({cat:c.cat,sub:c.sub,gst:c.gst,pst:c.pst,hst:c.hst,total:c.sub+c.hst,cnt:c.cnt}))
  };

  $('#taxBody').innerHTML=`
    <div class="summary-row">
      <div class="summary-item"><div class="label">Revenue (After Tax)</div><div class="value text-green">${fC(revAll.tot)}</div></div>
      <div class="summary-item"><div class="label">Expenses (After Tax)</div><div class="value text-red">${fC(expAll.sub+expAll.hst)}</div></div>
      <div class="summary-item"><div class="label">Net Income</div><div class="value" style="color:${netIncome>=0?'var(--green)':'var(--red)'}">${fC(netIncome)}</div></div>
      <div class="summary-item"><div class="label">Tax Balance (수금HST − 지급HST)</div><div class="value" style="color:${taxBalance>=0?'var(--red)':'var(--green)'}">${fC(taxBalance)}</div><div style="font-size:.75em;color:var(--text-muted);margin-top:2px">${taxBalance>=0?'CRA에 납부':'CRA에서 환급'}</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:1em;margin-bottom:12px">💰 Revenue Summary — by Payment Method</h3>
      <table>
        <tr><th></th><th>CASH</th><th>E-Transfer</th><th>Total</th></tr>
        <tr><td class="text-bold">Revenue (Before Tax)</td><td>${fC(revCash.sub)}</td><td>${fC(revET.sub)}</td><td class="text-bold">${fC(revAll.sub)}</td></tr>
        <tr><td>GST (est.)</td><td>${fC(revTotalGST*cashRatio)}</td><td>${fC(revTotalGST*etRatio)}</td><td>${fC(revTotalGST)}</td></tr>
        <tr><td>PST (est.)</td><td>${fC(revTotalPST*cashRatio)}</td><td>${fC(revTotalPST*etRatio)}</td><td>${fC(revTotalPST)}</td></tr>
        <tr><td class="text-bold">HST</td><td>${fC(revCash.hst)}</td><td>${fC(revET.hst)}</td><td class="text-bold">${fC(revAll.hst)}</td></tr>
        <tr style="background:#D5F5E3"><td class="text-bold">Revenue (After Tax)</td><td class="text-bold">${fC(revCash.tot)}</td><td class="text-bold">${fC(revET.tot)}</td><td class="text-green text-bold">${fC(revAll.tot)}</td></tr>
      </table>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:1em;margin-bottom:12px">💸 Expense Summary</h3>
      <table style="max-width:500px">
        <tr><th></th><th>Total</th></tr>
        <tr><td class="text-bold">Expenses (Before Tax)</td><td>${fC(expAll.sub)}</td></tr>
        <tr><td>GST (est.)</td><td>${fC(expTotalGST)}</td></tr>
        <tr><td>PST (est.)</td><td>${fC(expTotalPST)}</td></tr>
        <tr><td class="text-bold">HST</td><td class="text-bold">${fC(expAll.hst)}</td></tr>
        <tr style="background:#FADBD8"><td class="text-bold">Expenses (After Tax)</td><td class="text-red text-bold">${fC(expAll.sub+expAll.hst)}</td></tr>
      </table>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:1em;margin-bottom:12px">🧾 HST Breakdown (by Rate)</h3>
      <div class="info-box" style="margin-bottom:12px">PO/Expense에 적용된 실제 세율별로 집계합니다. 서로 다른 퍼센테이지가 사용된 경우 각각 별도로 표시됩니다.</div>
      <table>
        <tr><th>Rate</th><th>Rev GST</th><th>Rev PST</th><th>Rev HST</th><th>Exp GST</th><th>Exp PST</th><th>Exp HST</th></tr>
        ${hstTbl||'<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No data</td></tr>'}
        <tr style="background:#F5F1EB;font-weight:bold"><td>TOTAL</td><td>${fC(revTotalGST)}</td><td>${fC(revTotalPST)}</td><td>${fC(revAll.hst)}</td><td>${fC(expTotalGST)}</td><td>${fC(expTotalPST)}</td><td>${fC(expAll.hst)}</td></tr>
      </table>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:1em;margin-bottom:12px">📊 Monthly Summary — ${yr}</h3>
      <div style="overflow-x:auto"><table style="font-size:.8em">
        <tr><th>Month</th><th>Rev CASH</th><th>Rev E-Trf</th><th>Rev Sub</th><th>Rev GST</th><th>Rev PST</th><th>Rev HST</th><th>Rev Total</th><th>Orders</th><th>Exp Sub</th><th>Exp GST</th><th>Exp PST</th><th>Exp HST</th><th>Exp Total</th><th>Cnt</th><th>Net</th></tr>
        ${moTbl}
        <tr style="background:#F5F1EB;font-weight:bold">
          <td>TOTAL</td><td>${fC(moT.rC)}</td><td>${fC(moT.rE)}</td><td class="text-green">${fC(moT.rS)}</td><td>${fC(moT.rGST)}</td><td>${fC(moT.rPST)}</td><td>${fC(moT.rHST)}</td><td class="text-green">${fC(moT.rT)}</td><td>${moT.o}</td>
          <td class="text-red">${fC(moT.eS)}</td><td>${fC(moT.eGST)}</td><td>${fC(moT.ePST)}</td><td>${fC(moT.eHST)}</td><td class="text-red">${fC(moT.eT)}</td><td>${moT.eC}</td><td style="color:${moT.n>=0?'var(--green)':'var(--red)'}">${fC(moT.n)}</td>
        </tr>
      </table></div>
    </div>

    <div class="chart-row">
      <div class="chart-box"><h3>Monthly Revenue vs Expenses</h3><canvas id="chTax1" height="180"></canvas></div>
      <div class="chart-box"><h3>Expense by Category</h3><canvas id="chTax2" height="180"></canvas></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:1em;margin-bottom:12px">📂 Expense by Category (T2125)</h3>
      <div style="overflow-x:auto"><table>
        <tr><th>Category</th><th>Subtotal</th><th>GST</th><th>PST</th><th>HST</th><th>Total</th><th>Count</th></tr>
        ${catList.map(c=>`<tr><td class="text-bold">${c.cat}</td><td class="text-red">${fC(c.sub)}</td><td>${fC(c.gst)}</td><td>${fC(c.pst)}</td><td>${fC(c.hst)}</td><td class="text-red text-bold">${fC(c.sub+c.hst)}</td><td>${c.cnt}</td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No expenses</td></tr>'}
        <tr style="background:#FADBD8;font-weight:bold"><td>TOTAL</td><td>${fC(expAll.sub)}</td><td>${fC(expTotalGST)}</td><td>${fC(expTotalPST)}</td><td>${fC(expAll.hst)}</td><td class="text-red">${fC(expAll.sub+expAll.hst)}</td><td>${expAll.cnt}</td></tr>
      </table></div>
    </div>

    <div class="info-box warn" id="taxExportMsg">💡 <strong>세금 보고 팁:</strong> 📥 Export to Excel 버튼으로 이 리포트를 엑셀 파일로 내보내서 회계사에게 제출하세요. Tax Balance가 양수면 CRA에 납부, 음수면 환급받을 금액입니다.</div>`;

  // Charts
  const revArr=[],expArr=[];
  for(let m=1;m<=12;m++){const ms=String(m).padStart(2,'0');
    const rc=moRevCash.find(x=>x.m===ms)||{sub:0};const re=moRevET.find(x=>x.m===ms)||{sub:0};
    revArr.push(rc.sub+re.sub);expArr.push((moExp.find(x=>x.m===ms)||{sub:0}).sub);
  }
  makeChart('chTax1',{type:'bar',data:{labels:months,datasets:[
    {label:'Revenue',data:revArr,backgroundColor:'#27AE60',borderRadius:4},
    {label:'Expenses',data:expArr,backgroundColor:'#E74C3C',borderRadius:4}
  ]},options:{plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true}}}});
  if(catList.length>0){
    const clr=['#8B6F4E','#2980B9','#E74C3C','#F39C12','#9B59B6','#1ABC9C','#E67E22','#3498DB','#C0392B','#16A085'];
    makeChart('chTax2',{type:'doughnut',data:{labels:catList.map(c=>c.cat),datasets:[{data:catList.map(c=>c.sub),backgroundColor:clr.slice(0,catList.length)}]},options:{plugins:{legend:{position:'right'}}}});
  }
};

window.exportTaxXlsx=async()=>{
  if(!_taxData){alert('먼저 리포트를 로드하세요');return;}
  const r=await api.exportTaxXlsx(_taxData);
  const el=$('#taxExportMsg');
  if(r.ok&&el) el.innerHTML=`<div class="info-box success">✅ 엑셀 파일이 저장되었습니다.</div>`;
  else if(r.error&&el) el.innerHTML=`<div class="info-box err">❌ Export 실패: ${r.error}</div>`;
};

// ============================================================
// DELIVERY ROUTE OPTIMIZER
// ============================================================
let _geocodeCache={}; // address → {lat,lng} cache to avoid repeat API calls

window.openDeliveryOptimizer=async()=>{
  const ci=(await api.query("SELECT store_address,store_lat,store_lng,gmap_api_key FROM company_info WHERE id=1")).data[0]||{};
  if(!ci.gmap_api_key||!ci.store_lat){alert('Settings에서 Google Maps API Key와 출발지 주소를 먼저 설정하세요.');return;}

  // Get ALL non-cancelled POs that have a customer with address OR have delivery coords
  const today=new Date().toLocaleDateString('en-CA');
  const orders=(await api.query(`SELECT po.id,po.order_date,po.delivery_date,po.delivery_address,po.total,po.order_status,po.payment_status,po.payment_method,po.note,po.delivered,
      po.customer_id as cid, c.name as cn,c.cust_id as ccid,c.address as cust_addr,c.lat as cust_lat,c.lng as cust_lng
    FROM purchase_orders po LEFT JOIN customers c ON po.customer_id=c.id
    WHERE (po.order_status NOT IN ('canceled','cancelled','rejected') OR po.order_status IS NULL OR po.order_status='')
    AND po.payment_status!='Cancelled'
    ORDER BY po.delivery_date ASC, po.order_date DESC`)).data;

  // Resolve addresses
  for(const o of orders){
    if(!o.delivery_address && o.cust_addr) o.delivery_address=o.cust_addr;
    o._lat=o.cust_lat||0;
    o._lng=o.cust_lng||0;
  }

  openM(`<h3 style="margin-bottom:12px">🚚 배달 경로 최적화</h3>
    <div class="info-box">📍 출발지: <strong>${ci.store_address}</strong></div>
    <div style="margin:12px 0">
      <div class="fg-row">
        <div class="fg"><label>From</label><input type="date" id="delFrom" value="${today}"></div>
        <div class="fg"><label>To</label><input type="date" id="delTo" value="${today}"></div>
        <div class="fg"><label>배달원 수</label><input type="number" id="delDrivers" value="1" min="1" max="10" style="width:80px"></div>
        <div class="fg" style="align-self:flex-end"><button class="btn blue" onclick="filterDeliveryOrders()">🔍 Filter</button></div>
      </div>
      <div style="margin-top:8px;font-size:.85em;color:var(--text-muted)">💡 배송 완료된 주문은 자동 제외됩니다. 체크박스로 배달할 주문만 선택하세요.</div>
    </div>
    <div id="delOrderList"></div>
    <div id="delResult"></div>
  `, 'modal-lg');

  window._delOrders=orders;
  window._delStore={lat:ci.store_lat,lng:ci.store_lng,address:ci.store_address};
  filterDeliveryOrders();
};

window.filterDeliveryOrders=()=>{
  const from=$('#delFrom')?.value||'';
  const to=$('#delTo')?.value||'';
  const orders=window._delOrders||[];
  let filtered=orders.filter(o=>{
    // Exclude delivered
    if(o.delivered) return false;
    // Date range filter on delivery_date (or order_date if no delivery_date)
    const dt=o.delivery_date||o.order_date||'';
    if(from && dt<from) return false;
    if(to && dt>to) return false;
    return true;
  });

  // Only show orders that have an address
  filtered=filtered.filter(o=>o.delivery_address);

  if(filtered.length===0){
    $('#delOrderList').innerHTML=`<div class="info-box warn">해당 기간에 배달 가능한 주문이 없습니다. (배송 완료 제외)</div>`;
    $('#delResult').innerHTML='';
    window._delFiltered=[];
    return;
  }
  window._delFiltered=filtered;

  let tbl=`<table style="font-size:.9em"><tr><th><input type="checkbox" id="delCheckAll" onchange="toggleDelAll()"></th><th>PO#</th><th>Date</th><th>Customer</th><th>Address</th><th>📍</th><th>Total</th><th>Order</th><th>Payment</th><th>Status</th></tr>`;
  for(const o of filtered){
    const addr=o.delivery_address||'';
    const hasCoords=o._lat&&o._lat!==0;
    const os=o.order_status||'';
    const osBadge=os==='pending'?'badge-orange':os==='accepted'?'badge-green':'';
    const ps=o.payment_status||'Unpaid';
    const psBadge=ps==='Paid'?'badge-green':ps==='Partial'?'badge-orange':'badge-red';
    const pm=o.payment_method||'CASH';
    tbl+=`<tr>
      <td><input type="checkbox" class="del-chk" value="${o.id}" data-addr="${addr.replace(/"/g,'&quot;')}" data-lat="${o._lat}" data-lng="${o._lng}" data-cid="${o.cid||0}"></td>
      <td>#${o.id}</td>
      <td>${o.delivery_date||o.order_date||''}</td>
      <td>${o.ccid||''} ${o.cn||''}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${addr}">${addr||'-'}</td>
      <td>${hasCoords?'<span style="color:#27AE60" title="좌표 있음">✅</span>':'<span style="color:#E67E22" title="Geocoding 필요">📍</span>'}</td>
      <td class="text-green">${fC(o.total)}</td>
      <td>${os?`<span class="badge ${osBadge}">${os}</span>`:'-'}</td>
      <td><span class="badge ${pm==='CASH'?'badge-green':'badge-blue'}">${pm}</span></td>
      <td><span class="badge ${psBadge}">${ps}</span></td>
    </tr>`;
  }
  tbl+=`</table>`;

  const coordCnt=filtered.filter(o=>o._lat&&o._lat!==0).length;
  const needGeo=filtered.length-coordCnt;

  $('#delOrderList').innerHTML=`${tbl}
    <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span style="font-size:.85em;color:var(--text-muted)">
        총 ${filtered.length}건 | ✅ 좌표 ${coordCnt}건 | 📍 Geocoding 필요 ${needGeo}건
      </span>
      <button class="btn green" onclick="runDeliveryOptimize()" style="padding:10px 24px">🚀 최적 경로 계산</button>
    </div>`;
  $('#delResult').innerHTML='';
};

window.toggleDelAll=()=>{const c=$('#delCheckAll').checked;$$('.del-chk').forEach(cb=>cb.checked=c);};

window.runDeliveryOptimize=async()=>{
  const checkboxes=Array.from($$('.del-chk')).filter(cb=>cb.checked);
  if(checkboxes.length===0){alert('배달할 주문을 선택하세요.');return;}

  const drivers=parseInt($('#delDrivers')?.value)||1;
  const store=window._delStore;
  const allOrders=window._delFiltered||[];

  if(checkboxes.length<drivers){alert(`배달원 수(${drivers})가 주문 수(${checkboxes.length})보다 많습니다.`);return;}

  $('#delResult').innerHTML='<div class="info-box">🔄 좌표를 확인하고 경로를 계산 중입니다...</div>';

  try {
    // Build order list with coordinates — geocode if needed
    const selected=[];
    let geocoded=0, geoFailed=0;

    for(const cb of checkboxes){
      const id=parseInt(cb.value);
      const o=allOrders.find(x=>x.id===id);
      if(!o)continue;

      let lat=parseFloat(cb.dataset.lat)||0;
      let lng=parseFloat(cb.dataset.lng)||0;
      const addr=cb.dataset.addr||'';
      const custId=parseInt(cb.dataset.cid)||0;

      // Need geocoding?
      if((!lat||lat===0)&&addr){
        // Check memory cache first
        if(_geocodeCache[addr]){
          lat=_geocodeCache[addr].lat;
          lng=_geocodeCache[addr].lng;
        } else {
          const geo=await api.gmapGeocode(addr);
          if(geo.ok){
            lat=geo.lat;lng=geo.lng;
            _geocodeCache[addr]={lat,lng};
            // Save to customer for future reuse
            if(custId) await api.run("UPDATE customers SET lat=?,lng=? WHERE id=?",[lat,lng,custId]);
            geocoded++;
          } else {
            geoFailed++;
          }
        }
      }

      if(lat&&lat!==0){
        selected.push({...o, delivery_lat:lat, delivery_lng:lng, delivery_address:addr});
      }
    }

    if(selected.length===0){
      $('#delResult').innerHTML='<div class="info-box err">❌ 유효한 주소를 가진 주문이 없습니다. 고객 주소를 확인하세요.</div>';
      return;
    }

    let statusMsg='';
    if(geocoded>0) statusMsg+=`📍 ${geocoded}건 주소 → 좌표 변환 완료. `;
    if(geoFailed>0) statusMsg+=`⚠️ ${geoFailed}건 주소 변환 실패 (제외됨). `;

    // K-means clustering
    const clusters=kMeansCluster(selected,drivers);

    let resultHtml='';
    let grandDist=0, grandTime=0;
    const colors=['#E74C3C','#2980B9','#27AE60','#F39C12','#9B59B6','#1ABC9C','#E67E22','#34495E','#C0392B','#16A085'];

    for(let d=0;d<clusters.length;d++){
      const cluster=clusters[d];
      if(cluster.length===0)continue;
      const color=colors[d%colors.length];
      const origin=`${store.lat},${store.lng}`;
      const destination=origin;

      let routeResult;
      if(cluster.length===1){
        // Single stop: store → delivery → store (round trip)
        routeResult=await api.gmapDirections(origin,destination,[`${cluster[0].delivery_lat},${cluster[0].delivery_lng}`]);
      } else {
        const waypoints=cluster.map(o=>`${o.delivery_lat},${o.delivery_lng}`);
        routeResult=await api.gmapDirections(origin,destination,waypoints);
      }

      resultHtml+=`<div class="card" style="margin-top:12px;border-left:4px solid ${color}">
        <h4 style="color:${color}">🚗 배달원 ${d+1} — ${cluster.length}건</h4>`;

      if(routeResult.ok){
        grandDist+=routeResult.totalDistance;
        grandTime+=routeResult.totalDuration;

        let orderedCluster=cluster;
        if(routeResult.waypointOrder&&routeResult.waypointOrder.length>0){
          orderedCluster=routeResult.waypointOrder.map(i=>cluster[i]);
        }

        resultHtml+=`<div style="margin:8px 0;font-size:.9em;color:var(--text-muted)">총 거리: <strong>${routeResult.totalDistanceText}</strong> | 예상 시간: <strong>${routeResult.totalDurationText}</strong></div>`;
        resultHtml+=`<table style="font-size:.85em"><tr><th>#</th><th>PO</th><th>Customer</th><th>Address</th><th>Distance</th><th>Time</th></tr>`;

        const legs=routeResult.legs||[];
        for(let i=0;i<orderedCluster.length;i++){
          const o=orderedCluster[i];
          const leg=legs[i]||{};
          resultHtml+=`<tr>
            <td><span style="background:${color};color:#fff;padding:2px 8px;border-radius:10px;font-weight:bold">${i+1}</span></td>
            <td>#${o.id}</td>
            <td>${o.ccid||''} ${o.cn||''}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${o.delivery_address||''}">${o.delivery_address||''}</td>
            <td>${leg.distance||'-'}</td>
            <td>${leg.duration||'-'}</td>
          </tr>`;
        }
        if(legs.length>orderedCluster.length){
          const retLeg=legs[legs.length-1];
          resultHtml+=`<tr style="color:var(--text-muted);font-style:italic"><td>↩</td><td></td><td colspan="2">→ 가게 복귀</td><td>${retLeg.distance||'-'}</td><td>${retLeg.duration||'-'}</td></tr>`;
        }
        resultHtml+=`</table>`;

        // Generate Google Maps share link
        const storeAddr=encodeURIComponent(store.address);
        const stops=orderedCluster.map(o=>encodeURIComponent(o.delivery_address||`${o.delivery_lat},${o.delivery_lng}`)).join('/');
        const mapsLink=`https://www.google.com/maps/dir/${storeAddr}/${stops}/${storeAddr}`;
        resultHtml+=`<div style="display:flex;gap:8px;align-items:center;padding:8px 12px;background:#f8f6f2;border:1px solid var(--border);border-radius:6px;margin-top:8px;font-size:.82em">
          <span>📱</span>
          <input value="${mapsLink}" readonly style="flex:1;border:none;background:transparent;font-size:.85em;color:var(--text)" onclick="this.select()">
          <button class="btn" style="padding:4px 10px;font-size:.8em" onclick="navigator.clipboard.writeText('${mapsLink.replace(/'/g,"\\'")}');this.textContent='✓ Copied';setTimeout(()=>this.textContent='Copy',1500)">Copy</button>
        </div>`;
      } else {
        resultHtml+=`<div class="info-box err">❌ Route error: ${routeResult.error}</div>`;
        for(let i=0;i<cluster.length;i++){
          resultHtml+=`<div style="font-size:.85em;padding:4px 0">${i+1}. #${cluster[i].id} ${cluster[i].cn||''} — ${cluster[i].delivery_address||''}</div>`;
        }
      }
      resultHtml+=`</div>`;
    }

    resultHtml=`<div class="info-box success" style="margin-top:16px">
      <strong>🚚 총 ${clusters.length}명 배달원 | ${selected.length}건 배달</strong><br>
      총 이동거리: <strong>${(grandDist/1000).toFixed(1)} km</strong> | 총 예상시간: <strong>${Math.ceil(grandTime/60)}분</strong>
      ${statusMsg?`<br><span style="font-size:.85em">${statusMsg}</span>`:''}
    </div>`+resultHtml;

    $('#delResult').innerHTML=resultHtml;
  } catch(err){
    $('#delResult').innerHTML=`<div class="info-box err">❌ Error: ${err.message}</div>`;
  }
};

// K-Means clustering for delivery optimization
function kMeansCluster(orders,k){
  if(k<=1) return [orders];
  if(orders.length<=k) return orders.map(o=>[o]);

  // Initialize centroids using k-means++ strategy
  const centroids=[];
  centroids.push({lat:orders[0].delivery_lat,lng:orders[0].delivery_lng});
  for(let c=1;c<k;c++){
    let maxDist=-1,bestIdx=0;
    for(let i=0;i<orders.length;i++){
      let minD=Infinity;
      for(const cent of centroids){
        const d=haversine(orders[i].delivery_lat,orders[i].delivery_lng,cent.lat,cent.lng);
        if(d<minD) minD=d;
      }
      if(minD>maxDist){maxDist=minD;bestIdx=i;}
    }
    centroids.push({lat:orders[bestIdx].delivery_lat,lng:orders[bestIdx].delivery_lng});
  }

  // Iterate
  let assignments=new Array(orders.length).fill(0);
  for(let iter=0;iter<20;iter++){
    // Assign
    let changed=false;
    for(let i=0;i<orders.length;i++){
      let minD=Infinity,best=0;
      for(let c=0;c<k;c++){
        const d=haversine(orders[i].delivery_lat,orders[i].delivery_lng,centroids[c].lat,centroids[c].lng);
        if(d<minD){minD=d;best=c;}
      }
      if(assignments[i]!==best){assignments[i]=best;changed=true;}
    }
    if(!changed)break;
    // Update centroids
    for(let c=0;c<k;c++){
      const members=orders.filter((_,i)=>assignments[i]===c);
      if(members.length>0){
        centroids[c].lat=members.reduce((s,o)=>s+o.delivery_lat,0)/members.length;
        centroids[c].lng=members.reduce((s,o)=>s+o.delivery_lng,0)/members.length;
      }
    }
  }

  const clusters=[];
  for(let c=0;c<k;c++) clusters.push(orders.filter((_,i)=>assignments[i]===c));
  return clusters.filter(c=>c.length>0);
}

// Haversine distance in km
function haversine(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ============================================================
// BACKUP
// ============================================================
async function loadBackup(){destroyCharts();$('#hd').innerText='백업 / 복원';const info=await api.getDBInfo();const i=info.ok?info:{fileSize:0,path:'',counts:{catalog:0,customers:0,orders:0,materials:0,expenses:0},backup:{count:0,latest:'-',dir:''}};
  $('#ct').innerHTML=`<div class="info-box warn">💡 Auto-backup every 30 minutes. Manual backup recommended.</div>
    <div class="card" style="max-width:600px;margin-bottom:20px"><h3>Database Info</h3>
      <div class="db-info-grid">
        <div class="db-info-item"><div class="label">File Size</div><div class="value">${fSize(i.fileSize)}</div></div>
        <div class="db-info-item"><div class="label">Path</div><div class="value" style="font-size:.8em;word-break:break-all">${i.path}</div></div>
        <div class="db-info-item"><div class="label">Products / Customers</div><div class="value">${fN(i.counts.catalog)} / ${fN(i.counts.customers)}</div></div>
        <div class="db-info-item"><div class="label">POs / Materials</div><div class="value">${fN(i.counts.orders)} / ${fN(i.counts.materials)}</div></div>
        <div class="db-info-item"><div class="label">Expenses</div><div class="value">${fN(i.counts.expenses)}</div></div>
        <div class="db-info-item"><div class="label">Auto Backups</div><div class="value">${i.backup.count} (Latest: ${i.backup.latest})</div></div>
      </div></div>
    <div class="btn-group" style="gap:15px"><button class="btn blue" onclick="doBackup()" style="padding:15px 30px;font-size:1em">💾 Manual Backup</button><button class="btn red" onclick="doRestore()" style="padding:15px 30px;font-size:1em">📂 Restore</button></div><div id="bkMsg"></div>`;
}

window.doBackup=async()=>{$('#bkMsg').innerHTML='<div class="info-box">Backing up...</div>';const r=await api.backupDB();if(r.ok)$('#bkMsg').innerHTML=`<div class="info-box success">✅ Backup saved: ${r.path}</div>`;else $('#bkMsg').innerHTML=`<div class="info-box err">❌ Failed: ${r.error||'Cancelled'}</div>`;};
window.doRestore=async()=>{if(!confirm('Current data will be replaced. Continue?'))return;$('#bkMsg').innerHTML='<div class="info-box">Restoring...</div>';const r=await api.restoreDB();if(r.ok){$('#bkMsg').innerHTML='<div class="info-box success">✅ Restored! Refreshing...</div>';setTimeout(()=>location.reload(),1500);}else $('#bkMsg').innerHTML=`<div class="info-box err">❌ ${r.error||'Cancelled'}</div>`;};

// GloriaFood poll from PO tab
let _glfPollCooldown=false;
window.glfPollFromPO=async()=>{
  if(_glfPollCooldown)return;
  _glfPollCooldown=true;
  const btn=$('#glfPollBtn');const msg=$('#glfPollMsg');
  if(btn){btn.disabled=true;btn.innerText='🍕 가져오는 중...';}
  if(msg)msg.innerHTML='<div class="info-box" style="margin:8px 0">GloriaFood에서 주문을 가져오는 중...</div>';
  const result=await api.glfPollNow();
  if(btn){btn.disabled=false;btn.innerText='🍕 GloriaFood 주문 가져오기';}
  setTimeout(()=>{_glfPollCooldown=false;},3000); // 3s cooldown
  if(!result.ok){
    if(msg)msg.innerHTML=`<div class="info-box err" style="margin:8px 0">❌ ${result.error||'Failed'}<br><small>GloriaFood Integration 설정에서 Test Connection을 확인하세요.</small></div>`;
    setTimeout(()=>{if(msg)msg.innerHTML='';},4000);
    return;
  }
  const parts=[];
  if(result.newOrders>0)parts.push(`새 주문 ${result.newOrders}건`);
  if(result.updated>0)parts.push(`업데이트 ${result.updated}건`);
  if(result.cancelled>0)parts.push(`취소 ${result.cancelled}건`);
  if(parts.length>0){
    if(msg)msg.innerHTML=`<div class="info-box success" style="margin:8px 0">✅ ${parts.join(' / ')}</div>`;
    refreshPO(_poPg);
  } else {
    if(msg)msg.innerHTML='<div class="info-box warn" style="margin:8px 0">새로운 주문이 없습니다.</div>';
  }
  setTimeout(()=>{if(msg)msg.innerHTML='';},4000);
};

// ============================================================
// GLORIAFOOD INTEGRATION
// ============================================================
let _glfPg=1;
async function loadGloriaFood(){destroyCharts();$('#hd').innerText='GloriaFood Integration';
  const ci=(await api.query("SELECT glf_api_key,glf_enabled,glf_menu_key,glf_poll_interval FROM company_info WHERE id=1")).data[0]||{};
  const cnt=(await api.query("SELECT COUNT(*) as c FROM glf_orders")).data[0]?.c||0;
  const isOn=ci.glf_enabled?true:false;
  const interval=ci.glf_poll_interval||60;

  $('#ct').innerHTML=`<div class="card" style="max-width:700px;margin-bottom:20px">
    <h3 style="font-size:1em;margin-bottom:16px">🍕 GloriaFood API Settings</h3>
    <div class="info-box">${isOn?'✅ 자동 폴링 활성화 — '+interval+'초마다 새 주문을 자동으로 가져옵니다. 새 주문이 들어오면 데스크톱 알림이 표시됩니다.':'⛔ 비활성화 상태 — Enable & Save를 눌러 자동 폴링을 시작하세요.'}</div>
    <div class="fg"><label>Order API Key (Poll Accepted Orders)</label><input id="glfKey" value="${ci.glf_api_key||''}" placeholder="Integrations → Poll Accepted Orders v2 key"></div>
    <div class="fg"><label>Menu API Key (Fetch Menu)</label><input id="glfMenuKey" value="${ci.glf_menu_key||''}" placeholder="Integrations → Fetch Menu key"></div>
    <div class="fg"><label>Polling Interval (초)</label>
      <select id="glfInterval" style="width:200px">
        <option value="30" ${interval===30?'selected':''}>30초</option>
        <option value="60" ${interval===60?'selected':''}>60초 (기본)</option>
        <option value="120" ${interval===120?'selected':''}>2분</option>
        <option value="300" ${interval===300?'selected':''}>5분</option>
      </select>
    </div>
    <div class="fg"><label>Status</label>
      <span class="badge ${isOn?'badge-green':'badge-red'}" id="glfStatus">${isOn?'● Enabled (Auto-Polling)':'● Disabled'}</span>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn" onclick="glfTest()">🔌 Test Connection</button>
      <button class="btn green" onclick="glfSave(true)">✅ Enable & Save</button>
      <button class="btn red" onclick="glfSave(false)">⛔ Disable</button>
    </div>
    <div id="glfMsg"></div>
  </div>

  <div class="card" style="max-width:700px;margin-bottom:20px">
    <h3 style="font-size:1em;margin-bottom:12px">📋 Menu Sync</h3>
    <div class="info-box">GloriaFood 메뉴를 가져와서 제품 등록(Catalog)에 동기화합니다. 기존 품목은 가격/메모가 업데이트되고, 새 품목은 자동 추가됩니다.</div>
    <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
      <button class="btn blue" onclick="glfFetchMenu()">📥 Fetch Menu & Preview</button>
    </div>
    <div id="glfMenuMsg"></div>
    <div id="glfMenuPreview"></div>
  </div>

  <div class="card">
    <h3 style="font-size:1em;margin-bottom:12px">Import History <span class="badge badge-blue">${fN(cnt)} orders</span></h3>
    <div id="glfT"><div class="loading">로딩 중...</div></div>
  </div>`;
  refreshGlf(1);
}

window.glfTest=async()=>{
  const key=$('#glfKey').value.trim();
  if(!key){$('#glfMsg').innerHTML='<div class="info-box err" style="margin-top:8px">Enter API Key first</div>';return;}
  $('#glfMsg').innerHTML='<div class="info-box" style="margin-top:8px">Testing connection...</div>';
  const r=await api.glfTestConnection(key);
  if(r.ok){
    const saved=r.savedOrders>0?`<br>📦 ${r.savedOrders}건의 주문이 함께 저장되었습니다!`:'';
    const bodyPre=r.body?`<pre style="font-size:0.8em;max-height:120px;overflow:auto;margin-top:6px;background:#f5f5f0;padding:6px;border-radius:4px">${r.body.replace(/</g,'&lt;').slice(0,400)}</pre>`:'';
    $('#glfMsg').innerHTML=`<div class="info-box success" style="margin-top:8px">✅ Connection successful (HTTP ${r.status})${saved}${bodyPre}</div>`;
    if(r.savedOrders>0 && $('#poFrom')) refreshPO(_poPg);
  } else {
    const detail=r.body?`<pre style="font-size:0.8em;max-height:120px;overflow:auto;margin-top:6px;background:#fff0f0;padding:6px;border-radius:4px">${(r.body||'').replace(/</g,'&lt;').slice(0,400)}</pre>`:'';
    $('#glfMsg').innerHTML=`<div class="info-box err" style="margin-top:8px">❌ Failed: ${r.error||'HTTP '+r.status}${detail}</div>`;
  }
};

window.glfSave=async(enable)=>{
  const key=$('#glfKey').value.trim();
  const menuKey=$('#glfMenuKey').value.trim();
  const interval=parseInt($('#glfInterval')?.value)||60;
  await api.run("UPDATE company_info SET glf_api_key=?,glf_menu_key=?,glf_enabled=?,glf_poll_interval=? WHERE id=1",[key,menuKey,enable?1:0,interval]);
  const st=$('#glfStatus');
  if(st){st.className='badge '+(enable?'badge-green':'badge-red');st.innerText=enable?'● Enabled (Auto-Polling)':'● Disabled';}
  if(enable){
    await api.glfRestartAutoPoll();
    $('#glfMsg').innerHTML=`<div class="info-box success" style="margin-top:8px">✅ Enabled — ${interval}초마다 자동 폴링이 시작되었습니다. 새 주문이 들어오면 데스크톱 알림이 표시됩니다.</div>`;
  } else {
    await api.glfStopAutoPoll();
    $('#glfMsg').innerHTML='<div class="info-box warn" style="margin-top:8px">⛔ Disabled — 자동 폴링이 중지되었습니다.</div>';
  }
  setTimeout(()=>{const m=$('#glfMsg');if(m)m.innerHTML='';},4000);
};

// ============================================================
// ROUTER
// ============================================================
let _glfMenuItems=[];
window.glfFetchMenu=async()=>{
  const menuKey=$('#glfMenuKey')?.value?.trim();
  if(!menuKey){
    // Try from DB
    const ci=(await api.query("SELECT glf_menu_key FROM company_info WHERE id=1")).data[0];
    if(!ci||!ci.glf_menu_key){alert('Menu API Key를 먼저 입력하세요');return;}
  }
  const key=menuKey||(await api.query("SELECT glf_menu_key FROM company_info WHERE id=1")).data[0]?.glf_menu_key;
  if(!key){alert('Menu API Key를 먼저 입력하세요');return;}
  $('#glfMenuMsg').innerHTML='<div class="info-box" style="margin-top:8px">메뉴를 가져오는 중...</div>';
  $('#glfMenuPreview').innerHTML='';
  const r=await api.glfFetchMenu(key);
  if(!r.ok){
    $('#glfMenuMsg').innerHTML=`<div class="info-box err" style="margin-top:8px">❌ ${r.error}</div>`;
    return;
  }
  _glfMenuItems=r.items;
  if(!r.items.length){
    $('#glfMenuMsg').innerHTML='<div class="info-box warn" style="margin-top:8px">메뉴에 품목이 없습니다.</div>';
    return;
  }
  $('#glfMenuMsg').innerHTML=`<div class="info-box success" style="margin-top:8px">✅ ${r.items.length}개 품목 발견 (Currency: ${r.currency||'N/A'})</div>`;
  // Show preview table with checkboxes
  let tbl=`<div style="margin-top:12px"><div style="margin-bottom:8px;display:flex;gap:8px"><button class="btn" onclick="glfSelectAll(true)" style="font-size:.85em">✅ Select All</button><button class="btn gray" onclick="glfSelectAll(false)" style="font-size:.85em">☐ Deselect All</button></div><div style="max-height:400px;overflow-y:auto"><table><tr><th style="width:30px"><input type="checkbox" id="glfChkAll" checked onchange="glfSelectAll(this.checked)"></th><th>Category</th><th>Name</th><th>Price</th><th>Tags</th></tr>`;
  for(let i=0;i<r.items.length;i++){
    const it=r.items[i];
    tbl+=`<tr><td><input type="checkbox" class="glf-chk" data-idx="${i}" checked></td><td>${it.category}</td><td><strong>${it.name}</strong></td><td class="text-green">${fC(it.price)}</td><td style="font-size:.8em">${it.tags||'-'}</td></tr>`;
  }
  tbl+=`</table></div><div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center"><span id="glfSelCnt" style="color:var(--text-muted);font-size:.9em">${r.items.length}개 선택됨</span><button class="btn green" onclick="glfSyncMenu()">🔄 Sync Selected to Catalog</button></div></div>`;
  $('#glfMenuPreview').innerHTML=tbl;
  // Update count on checkbox change
  $$('.glf-chk').forEach(c=>c.addEventListener('change',()=>{
    const cnt=$$('.glf-chk:checked').length;
    const el=$('#glfSelCnt');if(el)el.innerText=cnt+'개 선택됨';
    const all=$('#glfChkAll');if(all)all.checked=cnt===_glfMenuItems.length;
  }));
};

window.glfSelectAll=(checked)=>{$$('.glf-chk').forEach(c=>c.checked=checked);const all=$('#glfChkAll');if(all)all.checked=checked;const cnt=$$('.glf-chk:checked').length;const el=$('#glfSelCnt');if(el)el.innerText=cnt+'개 선택됨';};

window.glfSyncMenu=async()=>{
  if(!_glfMenuItems.length){showInlineErr('먼저 Fetch Menu를 실행하세요');return;}
  const selected=[];
  $$('.glf-chk:checked').forEach(c=>{const idx=parseInt(c.dataset.idx);if(_glfMenuItems[idx])selected.push(_glfMenuItems[idx]);});
  if(!selected.length){$('#glfMenuMsg').innerHTML='<div class="info-box warn" style="margin-top:8px">⚠️ 동기화할 품목을 선택하세요</div>';return;}
  if(!confirm(`${selected.length}개 품목을 Catalog에 동기화합니다.\n기존 품목은 가격/메모가 업데이트되고, 새 품목은 추가됩니다.\n계속하시겠습니까?`))return;
  const r=await api.glfSyncCatalog(selected);
  if(r.ok){
    $('#glfMenuMsg').innerHTML=`<div class="info-box success" style="margin-top:8px">✅ 동기화 완료 — 추가: ${r.added}건, 업데이트: ${r.updated}건, 변경없음: ${r.skipped}건</div>`;
    $('#glfMenuPreview').innerHTML='';
    _glfMenuItems=[];
  } else {
    $('#glfMenuMsg').innerHTML=`<div class="info-box err" style="margin-top:8px">❌ ${r.error}</div>`;
  }
};

window.refreshGlf=async(pg)=>{_glfPg=pg||1;showLoading('#glfT');
  const off=(_glfPg-1)*PG;
  const tot=(await api.query("SELECT COUNT(*) as c FROM glf_orders")).data[0]?.c||0;
  const rows=(await api.query("SELECT g.*,po.order_date FROM glf_orders g LEFT JOIN purchase_orders po ON g.po_id=po.id ORDER BY g.received_at DESC LIMIT ? OFFSET ?",[PG,off])).data;

  let tbl='';
  for(const r of rows){
    const stBadge=r.status==='imported'?'badge-green':r.status==='updated'?'badge-blue':r.status==='cancelled'?'badge-red':'badge-orange';
    tbl+=`<tr>
      <td>${r.received_at||'-'}</td>
      <td>${r.glf_order_id}</td>
      <td><strong>${r.customer_name}</strong></td>
      <td><span class="badge ${r.order_type==='delivery'?'badge-orange':'badge-blue'}">${r.order_type}</span></td>
      <td>${r.payment||'-'}</td>
      <td class="text-green text-bold">${fC(r.total)}</td>
      <td><span class="badge ${stBadge}">${r.status}</span></td>
      <td>${r.po_id?`PO #${r.po_id}`:'-'}</td>
    </tr>`;
  }

  $('#glfT').innerHTML=`<table><tr><th>Received</th><th>GF Order ID</th><th>Customer</th><th>Type</th><th>Payment</th><th>Total</th><th>Status</th><th>PO</th></tr>
    ${tbl||'<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">No imported orders yet</td></tr>'}</table>${renderPager(tot,_glfPg,'refreshGlf')}`;
};

// ============================================================
function load(p){switch(p){
  case'dash':return loadDash();
  case'materials':return loadMaterials();
  case'cust':return loadCust();
  case'catalog':return loadCatalog();
  case'po':return loadPO();
  case'expense':return loadExpense();
  case'custReport':return loadCustReport();
  case'stockHistory':return loadStockHistory();
  case'taxReport':return loadTaxReport();
  case'companyInfo':return loadCompanyInfo();
  case'gloriafood':return loadGloriaFood();
  case'backup':return loadBackup();
}}
load('dash');
