// Simple LocalStorage-backed logic for FocusMate (offline)
(function(){
  const username = localStorage.getItem('fm_username');
  if (!username) {
    location.href = 'index.html';
    return;
  }

  const greet = document.getElementById('greet');
  greet.textContent = username;

  const entryDate = document.getElementById('entryDate');
  const subject = document.getElementById('subject');
  const minutes = document.getElementById('minutes');
  const focus = document.getElementById('focus');
  const notes = document.getElementById('notes');
  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const entriesList = document.getElementById('entriesList');
  const logout = document.getElementById('logout');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('fileInput');
  const deleteToday = document.getElementById('deleteToday');

  // helpers
  function getEntries(){ return JSON.parse(localStorage.getItem('fm_entries')||'{}'); }
  function setEntries(obj){ localStorage.setItem('fm_entries', JSON.stringify(obj)); }

  // prefill date to today
  const today = new Date().toISOString().slice(0,10);
  entryDate.value = today;

  function renderList(){
    const entries = getEntries();
    const keys = Object.keys(entries).sort((a,b)=>b.localeCompare(a));
    entriesList.innerHTML = '';
    if (keys.length===0) { entriesList.innerHTML = '<div class="muted">No entries yet</div>'; return; }
    keys.forEach(k=>{
      const e = entries[k];
      const div = document.createElement('div');
      div.className = 'entry';
      div.innerHTML = `<div>
        <div><strong>${k}</strong></div>
        <div class="meta">${e.subject || '-'} · ${e.minutes || 0} min · ${e.focus || '-'} </div>
        <div class="meta" style="margin-top:6px">${(e.notes||'').slice(0,140)}</div>
      </div>
      <div class="actions">
        <button class="btn" data-date="${k}" data-action="view">View</button>
        <button class="btn" data-date="${k}" data-action="delete">Delete</button>
      </div>`;
      entriesList.appendChild(div);
    });
  }

  entriesList.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button');
    if (!btn) return;
    const date = btn.getAttribute('data-date');
    const action = btn.getAttribute('data-action');
    if (action==='view'){
      const e = getEntries()[date];
      if (!e) return;
      entryDate.value = date;
      subject.value = e.subject || '';
      minutes.value = e.minutes || '';
      focus.value = e.focus || 'Focused';
      notes.value = e.notes || '';
      window.scrollTo({top:0,behavior:'smooth'});
    } else if (action==='delete'){
      if (!confirm('Delete entry for ' + date + '?')) return;
      const entries = getEntries();
      delete entries[date];
      setEntries(entries);
      renderList();
      drawChart();
    }
  });

  saveBtn.addEventListener('click', ()=>{
    const d = entryDate.value;
    if (!d) { alert('Pick a date'); return; }
    const entries = getEntries();
    entries[d] = { subject: subject.value.trim(), minutes: Number(minutes.value)||0, focus: focus.value, notes: notes.value.trim() };
    setEntries(entries);
    renderList();
    drawChart();
    alert('Saved for ' + d);
  });

  clearBtn.addEventListener('click', ()=>{
    subject.value = ''; minutes.value=''; focus.value='Focused'; notes.value='';
  });

  deleteToday.addEventListener('click', ()=>{
    const d = entryDate.value;
    if (!d) return alert('Pick a date');
    const entries = getEntries();
    if (!entries[d]) return alert('No entry for ' + d);
    if (!confirm('Delete entry for ' + d + '?')) return;
    delete entries[d];
    setEntries(entries);
    renderList();
    drawChart();
  });

  logout.addEventListener('click', ()=>{
    if (!confirm('Logout and clear name from this browser?')) return;
    localStorage.removeItem('fm_username');
    location.href = 'index.html';
  });

  exportBtn.addEventListener('click', ()=>{
    const payload = {
      exportedAt: new Date().toISOString(),
      username: localStorage.getItem('fm_username'),
      entries: getEntries()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'focusmate-export-'+(new Date().toISOString().slice(0,10))+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', (ev)=>{
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      try {
        const data = JSON.parse(e.target.result);
        if (!data.entries) throw new Error('Invalid file');
        // merge entries (existing entries kept unless overwritten by imported)
        const current = getEntries();
        const merged = {...current, ...data.entries};
        setEntries(merged);
        alert('Imported ' + Object.keys(data.entries).length + ' entries. (Merged)');
        renderList(); drawChart();
      } catch(err){
        alert('Failed to import: ' + err.message);
      }
    };
    reader.readAsText(f);
    ev.target.value = '';
  });

  // chart drawing (two-series: minutes and focus score)
  function mapFocusToScore(f){
    if (!f) return 2;
    if (f.toLowerCase().startsWith('focus')) return 3;
    if (f.toLowerCase().startsWith('okay')) return 2;
    return 1;
  }

  function drawChart(){
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const entries = getEntries();
    // prepare last 30 days labels
    const labels = [];
    const mins = [];
    const scores = [];
    for (let i=29;i>=0;i--){
      const d = new Date();
      d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      labels.push(key.slice(5)); // MM-DD
      if (entries[key]) {
        mins.push(entries[key].minutes || 0);
        scores.push(mapFocusToScore(entries[key].focus));
      } else { mins.push(0); scores.push(null); }
    }

    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const w = canvas.width, h = canvas.height;
    const padding = 30;
    // y scale for minutes
    const maxMin = Math.max(30, ...mins);
    // draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i=0;i<=4;i++){
      const y = padding + (h - padding*2) * (i/4);
      ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w-padding, y); ctx.stroke();
    }

    // draw minutes as blue line
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6c8cff';
    mins.forEach((v,i)=>{
      const x = padding + (w-padding*2)*(i/(labels.length-1));
      const y = h - padding - (v/maxMin)*(h-padding*2);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // draw minutes points
    mins.forEach((v,i)=>{
      if (v===0) return;
      const x = padding + (w-padding*2)*(i/(labels.length-1));
      const y = h - padding - (v/maxMin)*(h-padding*2);
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle='#6c8cff'; ctx.fill();
    });

    // draw focus score as green bars (small)
    scores.forEach((s,i)=>{
      if (s==null) return;
      const x = padding + (w-padding*2)*(i/(labels.length-1));
      const barH = (s/3)*(h-padding*2)*0.35;
      ctx.fillStyle = '#00d4a6';
      ctx.fillRect(x-6, h-padding-barH, 12, barH);
    });

    // labels (sparse)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px system-ui';
    for (let i=0;i<labels.length;i+=7){
      const x = padding + (w-padding*2)*(i/(labels.length-1));
      ctx.fillText(labels[i], x-18, h-8);
    }
  }

  // initial render
  renderList();
  drawChart();

  // redraw on resize with debounce
  let t;
  window.addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(drawChart,120); });
})();
