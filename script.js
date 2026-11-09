const VN = 'Asia/Ho_Chi_Minh', SE = 'Europe/Stockholm';
const $ = id => document.getElementById(id);
const KEY = 'jisa-schedule-v1', PKEY = 'jisa-prefs-v1';
const cls = tz => tz === VN ? 'vn' : 'se';
const tag = tz => tz === VN ? 'VN' : 'SE';
const name = tz => tz === VN ? 'Vietnam' : 'Sweden';
const jname = tz => tz === VN ? 'ベトナム' : 'スウェーデン';

/* ---------- time helpers (DST-safe, via Intl) ---------- */
function parts(ms, tz){
  const f = new Intl.DateTimeFormat('en-CA',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const o = {}; f.formatToParts(ms).forEach(p => o[p.type] = p.value); return o;
}
function offset(ms, tz){
  const p = parts(ms, tz);
  return Date.UTC(p.year, p.month-1, p.day, p.hour, p.minute, p.second) - Math.floor(ms/1000)*1000;
}
function zonedToUtc(date, time, tz){
  const [y,m,d] = date.split('-').map(Number), [h,mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m-1, d, h, mi);
  let t = guess - offset(guess, tz);
  t = guess - offset(t, tz);
  return t;
}
const fmtDate = (ms,tz) => { const p = parts(ms,tz); return `${p.year}-${p.month}-${p.day}`; };
const fmtTime = (ms,tz) => { const p = parts(ms,tz); return `${p.hour}:${p.minute}`; };
function addDays(date, n){ const [y,m,d] = date.split('-').map(Number); return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10); }
function weekStartOf(date){ const [y,m,d] = date.split('-').map(Number); const dow = new Date(Date.UTC(y,m-1,d)).getUTCDay(); return addDays(date, -((dow+6)%7)); }
const uid = () => Math.random().toString(36).slice(2,9);
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- state ---------- */
let events = [];
let prefs = {view:'merged', base:VN};
let day = fmtDate(Date.now(), VN);
let editing = null;

function load(){
  try{ const p = JSON.parse(localStorage.getItem(PKEY)); if(p && (p.view==='merged'||p.view==='split') && (p.base===VN||p.base===SE)) prefs = p; }catch(e){}
  try{
    if(location.hash.startsWith('#d=')){
      events = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(3)))));
      save(); history.replaceState(null,'',location.pathname); return;
    }
    events = JSON.parse(localStorage.getItem(KEY)) || null;
  }catch(e){ events = null; }
  if(!events){
    // Examples: his lunch break (11:00-12:00 Sweden = 17:00-18:00 Vietnam) and a Sunday evening call
    events = [
      {id:uid(), title:'お昼 Lunch call', start:zonedToUtc(day,'11:00',SE), end:zonedToUtc(day,'12:00',SE)},
      {id:uid(), title:'Evening chat', start:zonedToUtc(addDays(day,2),'20:00',VN), end:zonedToUtc(addDays(day,2),'21:00',VN)}
    ];
  }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(events)); }catch(e){} }
function savePrefs(){ try{ localStorage.setItem(PKEY, JSON.stringify(prefs)); }catch(e){} }

/* ---------- analogue clocks ---------- */
const CX = 100, CY = 100;
function buildDial(svg){
  let s = '<circle class="face" cx="100" cy="100" r="94"/><circle class="ring" cx="100" cy="100" r="94"/>';
  for(let i=0;i<60;i++){
    const major = i%5===0;
    s += `<line class="${major?'th':'tm'}" x1="100" y1="${major?10:10}" x2="100" y2="${major?20:13}" transform="rotate(${i*6} 100 100)"/>`;
  }
  s += '<g class="arcs"></g>';
  s += '<text x="100" y="45" font-size="12">十二</text><text x="155" y="100" font-size="12">三</text><text x="100" y="155" font-size="12">六</text><text x="45" y="100" font-size="12">九</text>';
  s += '<text class="ampm" x="100" y="128" font-size="8.5" letter-spacing="2"></text>';
  s += '<line class="hh" x1="100" y1="100" x2="100" y2="58"/><line class="mm" x1="100" y1="100" x2="100" y2="32"/>';
  s += '<line class="ss" x1="100" y1="114" x2="100" y2="18"/><circle class="hub" cx="100" cy="100" r="3.6"/><circle class="hub2" cx="100" cy="100" r="1.8"/>';
  svg.innerHTML = s;
}
const rot = (el, deg) => el.setAttribute('transform', `rotate(${deg} 100 100)`);
const dialAngle = (ms, tz) => { const p = parts(ms,tz); return (((p.hour%12)*3600 + p.minute*60 + +p.second)/43200)*360; };
function arcPath(a0, len){
  const r = 70, rad = d => d*Math.PI/180;
  const pt = a => [CX + r*Math.sin(rad(a)), CY - r*Math.cos(rad(a))];
  if(len >= 359.5){ return `M ${CX} ${CY-r} A ${r} ${r} 0 1 1 ${CX} ${CY+r} A ${r} ${r} 0 1 1 ${CX} ${CY-r}`; }
  const [x0,y0] = pt(a0), [x1,y1] = pt(a0+len);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${len>180?1:0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function tickDial(svg, tz, now){
  const p = parts(now, tz), h = +p.hour, m = +p.minute, s = +p.second;
  rot(svg.querySelector('.hh'), ((h%12) + m/60 + s/3600)*30);
  rot(svg.querySelector('.mm'), (m + s/60)*6);
  rot(svg.querySelector('.ss'), s*6);
  svg.classList.toggle('night', h<7 || h>=19);
  svg.querySelector('.ampm').textContent = h<12 ? '午前' : '午後';
  // events in the next 12 hours drawn as arcs on the dial
  const arcs = events.filter(e => e.end > now && e.start < now+43200000).map(e => {
    const st = Math.max(e.start, now), en = Math.min(e.end, now+43200000);
    return `<path class="arc" d="${arcPath(dialAngle(st,tz), (en-st)/43200000*360)}"/>`;
  }).join('');
  const g = svg.querySelector('.arcs'); if(g.innerHTML !== arcs) g.innerHTML = arcs;
}

/* ---------- calendar ---------- */
function shortRange(e, tz){
  const f = ms => { const t = fmtTime(ms,tz); return t.endsWith(':00') ? t.slice(0,2) : t; };
  return `${f(e.start)}–${f(e.end)}`;
}
function layoutLanes(list){
  list.sort((a,b) => a.s - b.s);
  let cluster = [], end = 0;
  const flush = () => { if(!cluster.length) return; const n = Math.max(...cluster.map(c => c.lane))+1; cluster.forEach(c => c.n = n); cluster = []; };
  list.forEach(o => {
    if(cluster.length && o.s >= end) flush();
    if(!cluster.length) end = 0;
    const used = cluster.filter(c => c.t > o.s).map(c => c.lane);
    let l = 0; while(used.includes(l)) l++;
    o.lane = l; cluster.push(o); end = Math.max(end, o.t);
  });
  flush();
}
function buildWeek(base, other, HPX){
  const ws = weekStartOf(day), merged = !!other;
  const dates = [...Array(7)].map((_,i) => addDays(ws,i));
  const todayStr = fmtDate(Date.now(), base);
  const wk = document.createElement('div');
  wk.className = 'wk';
  wk.style.setProperty('--cols', merged ? '38px repeat(7,minmax(0,1fr)) 38px' : '38px repeat(7,minmax(0,1fr))');

  // header
  let head = `<div class="tag ${cls(base)}">${tag(base)}</div>`;
  dates.forEach(d => {
    const t = new Date(zonedToUtc(d,'12:00',base));
    const en = t.toLocaleDateString('en-GB',{timeZone:base,weekday:'short'});
    const ja = t.toLocaleDateString('ja-JP',{timeZone:base,weekday:'short'});
    head += `<div class="dh${d===todayStr?' today':''}"><b>${+d.slice(8)}</b><span>${en} ${ja}</span></div>`;
  });
  if(merged) head += `<div class="tag r ${cls(other)}">${tag(other)}</div>`;
  const hd = document.createElement('div'); hd.className = 'wkhead'; hd.innerHTML = head; wk.appendChild(hd);

  // body
  const body = document.createElement('div'); body.className = 'wkbody';
  const H = 24*HPX;
  const axis = (tz, side) => {
    const a = document.createElement('div'); a.className = `axis ${side} ${cls(tz)}`; a.style.height = H+'px';
    for(let h=0; h<24; h++){
      const hh = String(h).padStart(2,'0');
      const sp = document.createElement('span'); sp.style.top = (h*HPX-6)+'px';
      if(tz === base){ sp.textContent = hh; }
      else {
        const t = zonedToUtc(ws, hh+':00', base);
        const dd = Math.round((Date.parse(fmtDate(t,tz)) - Date.parse(ws))/864e5);
        sp.innerHTML = fmtTime(t,tz).slice(0,2) + (dd ? `<sup>${dd>0?'+':'−'}${Math.abs(dd)}</sup>` : '');
      }
      a.appendChild(sp);
    }
    return a;
  };
  body.appendChild(axis(base,'l'));

  dates.forEach(d => {
    const col = document.createElement('div');
    col.className = 'dcol' + (d===todayStr ? ' today' : '');
    col.style.height = H+'px';
    for(let h=0; h<24; h++){
      let rest;
      if(merged){
        const t = zonedToUtc(d, String(h).padStart(2,'0')+':00', base);
        const oh = +fmtTime(t,other).slice(0,2);
        rest = !(h>=7 && h<23 && oh>=7 && oh<23);
      } else rest = h<7 || h>=23;
      const c = document.createElement('div'); c.className = 'cell' + (rest?' rest':''); c.style.top = (h*HPX)+'px'; c.style.height = HPX+'px';
      col.appendChild(c);
    }
    const ds = zonedToUtc(d,'00:00',base), de = zonedToUtc(addDays(d,1),'00:00',base), span = de-ds;
    const list = events.filter(e => e.end > ds && e.start < de).map(e => ({e, s:Math.max(e.start,ds), t:Math.min(e.end,de)}));
    layoutLanes(list);
    list.forEach(o => {
      const e = o.e, div = document.createElement('div');
      div.className = `ev ${merged ? 'm' : cls(base)}`; div.dataset.id = e.id; div.tabIndex = 0;
      div.style.top = ((o.s-ds)/span*H)+'px';
      div.style.height = Math.max(24,(o.t-o.s)/span*H - 2)+'px';
      div.style.left = `calc(${o.lane/o.n*100}% + 3px)`;
      div.style.width = `calc(${100/o.n}% - 7px)`;
      const times = merged
        ? `<span class="${cls(base)}"><i class="d"></i>${shortRange(e,base)}</span> <span class="${cls(other)}"><i class="d"></i>${shortRange(e,other)}</span>`
        : `${fmtTime(e.start,base)} – ${fmtTime(e.end,base)}`;
      div.innerHTML = `<strong>${esc(e.title||'Untitled')}</strong><small>${times}</small>`;
      div.onclick = ev => { ev.stopPropagation(); openEditor(e); };
      div.onkeydown = ev => { if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); openEditor(e); } };
      col.appendChild(div);
    });
    const now = Date.now();
    if(now>=ds && now<de){ const n = document.createElement('div'); n.className = 'now'; n.style.top = ((now-ds)/span*H)+'px'; col.appendChild(n); }
    col.onclick = ev => {
      if(ev.target.closest('.ev')) return;
      const y = ev.clientY - col.getBoundingClientRect().top;
      const hour = Math.max(0,Math.min(23,Math.floor(y/HPX)));
      const st = zonedToUtc(d, String(hour).padStart(2,'0')+':00', base);
      openEditor({id:null,title:'',start:st,end:st+3600000});
    };
    body.appendChild(col);
  });
  if(merged) body.appendChild(axis(other,'r'));
  wk.appendChild(body);
  const sc = document.createElement('div'); sc.className = 'scroller'; sc.appendChild(wk);
  return sc;
}
// hovering an event lights up the same event everywhere else
document.addEventListener('mouseover', e => {
  const ev = e.target.closest && e.target.closest('.ev');
  document.querySelectorAll('.ev.link').forEach(n => n.classList.remove('link'));
  if(ev) document.querySelectorAll(`.ev[data-id="${ev.dataset.id}"]`).forEach(n => n.classList.add('link'));
});

function niceDay(d, tz){
  const t = new Date(zonedToUtc(d,'12:00',tz));
  const en = t.toLocaleDateString('en-GB',{timeZone:tz,weekday:'short',day:'numeric',month:'short'});
  const ja = t.toLocaleDateString('ja-JP',{timeZone:tz,month:'numeric',day:'numeric',weekday:'short'});
  return `${en} · ${ja}`;
}
function rangeLabel(){
  const ws = weekStartOf(day), we = addDays(ws,6);
  const f = (d,o) => new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',Object.assign({timeZone:'UTC'},o));
  const a = f(ws,{day:'numeric',month:'short'}), b = f(we,{day:'numeric',month:'short',year:'numeric'});
  return `${a} – ${b}`;
}
function render(){
  $('day').value = day;
  $('range').innerHTML = rangeLabel() + `<span>${new Date(weekStartOf(day)+'T12:00:00Z').toLocaleDateString('ja-JP',{timeZone:'UTC',month:'long'})}</span>`;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view===prefs.view));
  document.querySelectorAll('[data-base]').forEach(b => b.classList.toggle('on', b.dataset.base===(prefs.base===VN?'VN':'SE')));
  $('baseGrp').hidden = prefs.view !== 'merged';
  const host = $('cal'); host.innerHTML = '';
  const base = prefs.base, other = base===VN ? SE : VN;
  if(prefs.view === 'merged'){
    host.appendChild(buildWeek(base, other, 30));
    $('legend').innerHTML = `<span class="${cls(base)}"><i></i>${jname(base)} ${name(base)}, left</span><span class="${cls(other)}"><i></i>${jname(other)} ${name(other)}, right</span>`;
    $('hint').textContent = `Unshaded hours are when you are both awake (07:00 to 23:00 on each side). The left scale follows ${name(base)}, the right scale shows ${name(other)}, and a small +1 or −1 marks the next or previous day there. Click an empty hour to add an event, or click an event to edit it. Events stay in this browser.`;
  } else {
    [VN,SE].forEach(tz => {
      const t = document.createElement('div'); t.className = `label zonetitle ${cls(tz)}`; t.innerHTML = `<i></i>${jname(tz)} · ${name(tz)}`;
      host.appendChild(t); host.appendChild(buildWeek(tz, null, 24));
    });
    $('legend').innerHTML = '';
    $('hint').textContent = 'Each country has its own week. An event appears in both at its own local time; hover one to see the other light up. Shaded hours are night (23:00 to 07:00). Events stay in this browser.';
  }
}
function tick(){
  const n = Date.now();
  [[VN,'VN'],[SE,'SE']].forEach(([tz,k]) => {
    $('clk'+k).textContent = fmtTime(n,tz);
    $('dt'+k).textContent = niceDay(fmtDate(n,tz),tz);
    tickDial($('dial'+k), tz, n);
  });
  $('diffN').textContent = (offset(n,VN)-offset(n,SE))/3600000;
}

/* ---------- editor (two-way linked) ---------- */
function setFrom(tz, prefix, e){
  $(prefix+'Date').value = fmtDate(e.start,tz);
  $(prefix+'Start').value = fmtTime(e.start,tz);
  $(prefix+'End').value = fmtTime(e.end,tz);
}
function openEditor(e){
  editing = {...e};
  $('dlgTitle').textContent = e.id ? '予定を編集' : '新しい予定';
  $('title').value = e.title;
  setFrom(VN,'vn',e); setFrom(SE,'se',e);
  $('del').hidden = !e.id;
  $('dlg').showModal();
}
function readZone(tz, prefix){
  const d = $(prefix+'Date').value, s = $(prefix+'Start').value, en = $(prefix+'End').value;
  if(!d||!s||!en) return null;
  const start = zonedToUtc(d,s,tz);
  let end = zonedToUtc(d,en,tz);
  if(end <= start) end = zonedToUtc(addDays(d,1),en,tz); // crosses midnight
  return {start,end};
}
function syncFrom(tz, prefix, otherTz, otherPrefix){
  const r = readZone(tz,prefix); if(!r) return;
  editing.start = r.start; editing.end = r.end;
  setFrom(otherTz, otherPrefix, editing);
}
['vnDate','vnStart','vnEnd'].forEach(id => $(id).addEventListener('input', () => syncFrom(VN,'vn',SE,'se')));
['seDate','seStart','seEnd'].forEach(id => $(id).addEventListener('input', () => syncFrom(SE,'se',VN,'vn')));
$('save').onclick = () => {
  editing.title = $('title').value.trim() || 'Untitled';
  if(editing.id){ events = events.map(e => e.id===editing.id ? editing : e); }
  else { editing.id = uid(); events.push(editing); }
  save(); $('dlg').close(); render(); tick();
  toast('Saved. Both schedules updated.');
};
$('del').onclick = () => { events = events.filter(e => e.id!==editing.id); save(); $('dlg').close(); render(); tick(); };
$('cancel').onclick = () => $('dlg').close();

/* ---------- toolbar ---------- */
$('day').onchange = e => { if(e.target.value){ day = e.target.value; render(); } };
$('prev').onclick = () => { day = addDays(day,-7); render(); };
$('next').onclick = () => { day = addDays(day,7); render(); };
$('today').onclick = () => { day = fmtDate(Date.now(),prefs.base); render(); };
$('add').onclick = () => { const st = zonedToUtc(day,'17:00',VN); openEditor({id:null,title:'',start:st,end:st+3600000}); };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { prefs.view = b.dataset.view; savePrefs(); render(); });
document.querySelectorAll('[data-base]').forEach(b => b.onclick = () => { prefs.base = b.dataset.base==='VN' ? VN : SE; savePrefs(); render(); });
$('share').onclick = () => {
  const url = location.origin + location.pathname + '#d=' + btoa(unescape(encodeURIComponent(JSON.stringify(events))));
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(()=>toast('Link copied. Send it to him.'), ()=>toast('Copy is blocked here. Use Export instead.'));
};
$('export').onclick = () => {
  try{
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(events,null,2)],{type:'application/json'}));
    a.download = 'schedule.json'; a.click();
  }catch(e){ toast('Export is not available here.'); }
};
$('import').onclick = () => $('file').click();
$('file').onchange = async e => {
  try{ const data = JSON.parse(await e.target.files[0].text()); if(Array.isArray(data)){ events = data; save(); render(); tick(); toast('Imported'); } }
  catch(err){ toast('That file could not be read.'); }
};
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2400); }

load(); buildDial($('dialVN')); buildDial($('dialSE')); render(); tick();
setInterval(tick,1000); setInterval(render,60000);
