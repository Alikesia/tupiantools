/* GIF / 动态 WebP 拆解：每一帧还原成完整画面，可单张或打包下载，也可送回「合成」重新编辑。 */

/* ---------------- GIF 解码器 ---------------- */
function decodeGIF(buf){
  const d = new Uint8Array(buf);
  const str = (o,n)=>String.fromCharCode(...d.subarray(o,o+n));
  if(str(0,3)!=='GIF') throw new Error('不是 GIF 文件');
  const W = d[6]|(d[7]<<8), H = d[8]|(d[9]<<8);
  const flags = d[10];
  let p = 13, gct = null;
  if(flags & 0x80){ const n = 3*(1<<((flags&7)+1)); gct = d.subarray(p, p+n); p += n; }
  const frames = []; let loop = 1;      // 没有循环信息的 GIF 只播放一次
  let gce = {disposal:0, trans:-1, delay:0};
  const readBlocks = ()=>{ const parts=[]; let len=0; while(p<d.length){ const n=d[p++]; if(!n) break; parts.push(d.subarray(p,p+n)); len+=n; p+=n; }
    const out=new Uint8Array(len); let o=0; for(const s of parts){ out.set(s,o); o+=s.length; } return out; };
  while(p < d.length){
    const b = d[p++];
    if(b === 0x3B) break;                       // 结尾
    if(b === 0x21){                              // 扩展块
      const label = d[p++];
      if(label === 0xF9){
        const len = d[p]; const f = d[p+1];
        gce = {disposal:(f>>2)&7, trans:(f&1)?d[p+4]:-1, delay:(d[p+2]|(d[p+3]<<8))*10};
        p += len+1; readBlocks();
      }else if(label === 0xFF){
        const len = d[p]; const id = str(p+1, 11); p += len+1;
        const sub = readBlocks();
        if((id==='NETSCAPE2.0'||id==='ANIMEXTS1.0') && sub[0]===1){ const v = sub[1]|(sub[2]<<8); loop = v===0 ? 0 : v+1; }   // 0 = 无限；其余是重复次数，加上第一遍
      }else readBlocks();
    }else if(b === 0x2C){                        // 图像
      const x=d[p]|(d[p+1]<<8), y=d[p+2]|(d[p+3]<<8), w=d[p+4]|(d[p+5]<<8), h=d[p+6]|(d[p+7]<<8), f=d[p+8]; p+=9;
      let ct = gct;
      if(f & 0x80){ const n = 3*(1<<((f&7)+1)); ct = d.subarray(p,p+n); p+=n; }
      const minCode = d[p++];
      const data = readBlocks();
      frames.push({x,y,w,h,interlace:!!(f&0x40),ct,minCode,data,...gce});
      gce = {disposal:0, trans:-1, delay:0};
    }else break;                                 // 数据损坏，停在这里
  }
  return {W,H,frames,loop};
}
function lzwDecode(minCode, data, count){
  const out = new Uint8Array(count);
  const clear = 1<<minCode, eoi = clear+1;
  const prefix = new Uint16Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097);
  for(let c=0;c<clear;c++) suffix[c] = c;
  let size = minCode+1, mask = (1<<size)-1, avail = clear+2, old = -1, first = 0;
  let datum = 0, bits = 0, top = 0, pi = 0, i = 0;
  while(pi < count){
    if(top === 0){
      while(bits < size){ if(i >= data.length) return out; datum |= data[i++]<<bits; bits += 8; }
      let code = datum & mask; datum >>= size; bits -= size;
      if(code === clear){ size = minCode+1; mask = (1<<size)-1; avail = clear+2; old = -1; continue; }
      if(code === eoi) break;
      if(old === -1){ out[pi++] = suffix[code]; old = code; first = code; continue; }
      const inCode = code;
      if(code >= avail){ stack[top++] = first; code = old; }
      while(code > clear){ stack[top++] = suffix[code]; code = prefix[code]; }
      first = suffix[code]; stack[top++] = first;
      if(avail < 4096){ prefix[avail] = old; suffix[avail] = first; avail++; if((avail & mask) === 0 && avail < 4096){ size++; mask += avail; } }
      old = inCode;
    }
    out[pi++] = stack[--top];
  }
  return out;
}
// 逐帧合成完整画面，onFrame(imageData, delay, index)
async function composeGIF(g, onFrame, check){
  const {W,H} = g;
  const cur = new Uint8ClampedArray(W*H*4);
  for(let fi=0; fi<g.frames.length; fi++){
    check && check();
    const f = g.frames[fi];
    const prev = f.disposal===3 ? cur.slice() : null;
    const idx = lzwDecode(f.minCode, f.data, f.w*f.h);
    const ct = f.ct;
    // 隔行扫描的行顺序
    let rows = null;
    if(f.interlace){ rows = []; for(const [s,st] of [[0,8],[4,8],[2,4],[1,2]]) for(let r=s;r<f.h;r+=st) rows.push(r); }
    for(let r=0; r<f.h; r++){
      const yy = f.y + (rows ? rows[r] : r); if(yy >= H) continue;
      for(let c=0; c<f.w; c++){
        const xx = f.x + c; if(xx >= W) continue;
        const k = idx[r*f.w+c]; if(k === f.trans || !ct || k*3+2 >= ct.length) continue;
        const o = (yy*W+xx)*4; cur[o]=ct[k*3]; cur[o+1]=ct[k*3+1]; cur[o+2]=ct[k*3+2]; cur[o+3]=255;
      }
    }
    // 浏览器把 0 或 10ms 的停留时间按 100ms 播放，这里保持一致
    await onFrame(new ImageData(cur.slice(), W, H), f.delay<=10 ? 100 : f.delay, fi);
    if(f.disposal === 2){
      for(let r=f.y; r<Math.min(H,f.y+f.h); r++) cur.fill(0, (r*W+f.x)*4, (r*W+Math.min(W,f.x+f.w))*4);
    }else if(f.disposal === 3 && prev) cur.set(prev);
  }
}

/* ---------------- 拆解页面 ---------------- */
const SP = {name:'', W:0, H:0, loop:0, frames:[]};   // frames: {blob, url, delay, w, h}
const spSel = new Set(); let spLast = -1, spToken = 0;
const spCanvas = document.createElement('canvas');

async function splitFile(file){
  if(!file) return;
  const my = ++spToken; const check = ()=>{ if(my !== spToken) throw CANCEL; };
  spClear(true);
  SP.name = file.name.replace(/\.[^.]+$/,'') || '动图';
  spInfo(`正在读取 ${file.name}…`);
  try{
    const buf = await file.arrayBuffer();
    const head = String.fromCharCode(...new Uint8Array(buf,0,Math.min(12,buf.byteLength)));
    if(head.startsWith('GIF')){
      const g = decodeGIF(buf);
      if(!g.frames.length) throw new Error('这个 GIF 里没有找到图像');
      SP.W = g.W; SP.H = g.H; SP.loop = g.loop;
      await composeGIF(g, async (img, delay, i)=>{ await spAdd(img, delay); check(); spInfo(`正在拆解… ${i+1}/${g.frames.length}`); if(i%4===3){ spRender(); await tick(); } }, check);
    }else if(head.startsWith('RIFF') && head.slice(8,12)==='WEBP'){
      await splitWebP(buf, check);
    }else throw new Error('只支持 GIF 和动态 WebP');
    check(); spRender(); spInfo();
  }catch(e){ if(e === CANCEL) return; console.error(e); spInfo('拆解失败：'+e.message, true); spRender(); }
}
async function splitWebP(buf, check){
  if(!('ImageDecoder' in window)) throw new Error('当前浏览器不能拆解 WebP 动图，请用 Chrome 或 Edge 打开');
  const dec = new ImageDecoder({data:buf, type:'image/webp'});
  await dec.tracks.ready;
  const tr = dec.tracks.selectedTrack, n = tr.frameCount;
  SP.loop = tr.repetitionCount === Infinity ? 0 : (tr.repetitionCount||0)+1;
  for(let i=0;i<n;i++){
    const {image} = await dec.decode({frameIndex:i}); check();
    const W = image.displayWidth, H = image.displayHeight; SP.W = W; SP.H = H;
    spCanvas.width = W; spCanvas.height = H;
    const x = spCanvas.getContext('2d'); x.clearRect(0,0,W,H); x.drawImage(image,0,0);
    const delay = Math.max(10, Math.round((image.duration||100000)/1000));
    image.close();
    await spAdd(x.getImageData(0,0,W,H), delay);
    spInfo(`正在拆解… ${i+1}/${n}`); if(i%4===3){ spRender(); await tick(); }
  }
  dec.close();
}
async function spAdd(img, delay){
  spCanvas.width = img.width; spCanvas.height = img.height;
  spCanvas.getContext('2d').putImageData(img,0,0);
  const blob = await new Promise(r=>spCanvas.toBlob(r,'image/png'));
  SP.frames.push({blob, url:URL.createObjectURL(blob), delay, w:img.width, h:img.height});
}
function spClear(keepInfo){
  spToken += keepInfo ? 0 : 1;
  SP.frames.forEach(f=>URL.revokeObjectURL(f.url));
  SP.frames = []; spSel.clear(); spLast = -1;
  if(!keepInfo){ SP.name=''; spInfo(); }
  spRender();
}
function spFileName(i){ const f = SP.frames[i]; return `${SP.name}_${String(i+1).padStart(3,'0')}_${f.delay}ms.png`; }
function spInfo(text, warn){
  const el = $('spInfo');
  if(text){ el.textContent = text; el.style.color = warn ? 'var(--warn)' : ''; return; }
  el.style.color = '';
  if(!SP.frames.length){ el.textContent = '还没有动图'; return; }
  const total = SP.frames.reduce((a,f)=>a+f.delay,0);
  el.textContent = `${SP.name} · ${SP.W} × ${SP.H} px · ${SP.frames.length} 帧 · 一轮 ${(total/1000).toFixed(2)} 秒 · ${SP.loop===0?'无限循环':'播放 '+SP.loop+' 次'}`;
}
function spRender(){
  const g = $('spGrid'), keep = g.scrollTop; g.innerHTML = '';
  if(!SP.frames.length){
    const h = document.createElement('div'); h.className = 'emptyHint';
    h.innerHTML = '<b>＋ 把 GIF 或动态 WebP 拖到这里，或点击选择</b><span>拆成一张张完整的图片，可以下载，也可以送去「合成」重新编辑</span>';
    h.onclick = ()=>$('spPicker').click(); g.appendChild(h);
  }
  SP.frames.forEach((f,i)=>{
    const t = document.createElement('div');
    t.className = 'tile sp' + (spSel.has(i)?' sel':'');
    t.innerHTML = `<div class="thumb"><img src="${f.url}" alt="" loading="lazy"></div><span class="chk"></span><span class="no">${i+1}</span>
      <div class="body"><div class="name">${f.delay} ms</div><div class="acts"><button class="cp">下载</button></div></div>`;
    t.onclick = e=>{
      if(e.target.closest('button')) return;
      if(e.shiftKey && spLast>=0){ const [a,b]=[Math.min(spLast,i),Math.max(spLast,i)]; for(let k=a;k<=b;k++) spSel.add(k); }
      else { spSel.has(i) ? spSel.delete(i) : spSel.add(i); spLast = i; }
      spRender();
    };
    t.querySelector('.cp').onclick = ()=>Site.download(f.blob, spFileName(i));
    g.appendChild(t);
  });
  g.scrollTop = keep;
  const n = SP.frames.length, s = spSel.size;
  $('spAll').disabled = !n || s===n; $('spNone').disabled = !s; $('spClear').disabled = !n && !SP.name;
  $('spZip').disabled = !n; $('spZip').textContent = s ? `下载所选 ${s} 张（ZIP）` : '全部下载（ZIP）';
  $('spSend').disabled = !n; $('spSend').textContent = s ? `所选 ${s} 张送去合成` : '全部送去合成';
  $('spCount').textContent = n ? (s ? `已选 ${s} 张` : '点击选中 · ⇧Shift 连选') : '';
}
const spPicked = ()=> spSel.size ? [...spSel].sort((a,b)=>a-b) : SP.frames.map((_,i)=>i);
$('spPicker').onchange = e=>{ splitFile(e.target.files[0]); e.target.value=''; };
$('spAdd').onclick = ()=>$('spPicker').click();
$('spAll').onclick = ()=>{ SP.frames.forEach((_,i)=>spSel.add(i)); spRender(); };
$('spNone').onclick = ()=>{ spSel.clear(); spLast=-1; spRender(); };
$('spClear').onclick = ()=>spClear(false);
$('spZip').onclick = async ()=>{
  const ids = spPicked(); $('spZip').disabled = true;
  try{
    const z = await Site.zip(ids.map(i=>({name:spFileName(i), blob:SP.frames[i].blob})));
    Site.download(z, `${SP.name}_${ids.length}帧.zip`);
    spInfo(); setTimeout(()=>spInfo(`已下载 ${SP.name}_${ids.length}帧.zip（${fmtSize(z.size)}）`), 0);
  }finally{ spRender(); }
};
$('spSend').onclick = async ()=>{
  const ids = spPicked();
  if(S.frames.length && !confirm(`「合成」里已经有 ${S.frames.length} 张图。\n\n确定：清空后放入这 ${ids.length} 帧\n取消：加在原来的图后面`)) {}
  else if(S.frames.length){ S.frames = []; sel.clear(); }
  $('spSend').disabled = true;
  for(const i of ids){
    const f = SP.frames[i];
    const fr = await loadImage(new File([f.blob], spFileName(i), {type:'image/png'}));
    fr.delay = clampDelay(f.delay); S.frames.push(fr);
  }
  if(SP.loop>0){ S.loop='n'; S.loopN=SP.loop; } else S.loop='inf';
  initControls();
  framesChanged(); setView('make');
  setStatus(`已从拆解放入 ${ids.length} 帧，停留时间和循环次数沿用原动图`);
};

/* ---------------- 合成 / 拆解 切换 ---------------- */
let view = 'make';
function setView(v){
  view = v;
  $('viewMake').classList.toggle('hidden', v!=='make');
  $('viewSplit').classList.toggle('hidden', v!=='split');
  document.querySelectorAll('#viewTabs button').forEach(b=>b.classList.toggle('on', b.dataset.v===v));
  document.querySelectorAll('.appbar').forEach(n=>n.setAttribute('data-active', v==='split' ? 'split' : 'gif'));
  Site.setActive(v==='split' ? 'split' : 'gif');
  const want = v==='split' ? '#split' : '';
  if(location.hash !== want) history.replaceState(null, '', location.pathname + want);
  document.title = v==='split' ? 'GIF 拆解' : '动图合成工具';
}
document.querySelectorAll('#viewTabs button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
window.addEventListener('imgtools:navigate', e=>{
  if(e.detail.key !== 'gif' && e.detail.key !== 'split') return;
  e.preventDefault();
  setView(e.detail.key === 'split' ? 'split' : 'make');
});
window.addEventListener('hashchange', ()=>setView(location.hash==='#split' ? 'split' : 'make'));
setView(location.hash==='#split' ? 'split' : 'make');
spRender();
