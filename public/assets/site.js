/* 共用脚本：站点导航、页面之间传图、ZIP 打包。全部在本机运行。 */
(function(){
  'use strict';

  /* 网站根目录：从 site.js 自己的位置推算，这样本地双击打开和部署到网上都能用 */
  var ROOT = (document.currentScript && document.currentScript.src || location.href).replace(/assets\/site\.js(\?.*)?$/, '');
  var LOCAL = location.protocol === 'file:';

  /* ---------------- 浅色 / 深色 ---------------- */
  // 没手动选过就跟随电脑的系统设置；选过就记住
  function savedTheme(){ try{ return localStorage.getItem('imgtools.theme'); }catch(e){ return null; } }
  function systemTheme(){ return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
  function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); }
  applyTheme(savedTheme() || systemTheme());       // 在页面画出来之前就设好，避免闪一下
  if(window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', function(){ if(!savedTheme()){ applyTheme(systemTheme()); syncThemeBtn(); } });
  function curTheme(){ return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  function syncThemeBtn(){
    document.querySelectorAll('.themeBtn').forEach(function(b){
      var light = curTheme() === 'light';
      b.innerHTML = (light ? MOON : SUN) + '<span>' + (light ? '深色模式' : '浅色模式') + '</span>';
      b.title = light ? '切换到深色模式' : '切换到浅色模式';
    });
  }
  function toggleTheme(){
    var t = curTheme() === 'light' ? 'dark' : 'light';
    applyTheme(t); try{ localStorage.setItem('imgtools.theme', t); }catch(e){}
    syncThemeBtn();
  }
  // 本地打开时文件夹不会自动打开 index.html，要写全
  function url(key){
    var map = {compress:'compress/', bg:'remove-bg/', gif:'gif/', split:'gif/#split'};
    var p = map[key] == null ? key : map[key];
    if(LOCAL) p = p.replace(/(^|\/)(#.*)?$/, function(m, slash, hash){ return slash + 'index.html' + (hash||''); });
    return ROOT + p;
  }

  /* ---------------- 顶部：品牌 + 工具标签 ---------------- */
  var ICON = {
    compress:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>',
    bg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l5 5-9.5 9.5H5.5v-5z"/><path d="M12.5 6.5l5 5"/><path d="M4 21h16" stroke-dasharray="2 3"/></svg>',
    gif:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="13" rx="2"/><path d="M8 2h11a2 2 0 0 1 2 2v11"/><path d="M8 9.5l3.5 2-3.5 2z" fill="currentColor"/></svg>',
    split:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
  };
  var LINKS = [
    {key:'compress', text:'压缩 · 转换', sub:'缩小体积，转 WebP / JPG'},
    {key:'bg',       text:'去背景',     sub:'纯色背景变透明'},
    {key:'gif',      text:'动图合成',   sub:'多张图片做成 GIF'},
    {key:'split',    text:'GIF 拆解',   sub:'拆成一张张图片'}
  ];
  function renderBar(el, active){
    var h = '<div class="brand"><b>图片工具箱</b></div><nav class="tabs-app">';
    LINKS.forEach(function(l){
      h += '<a data-k="'+l.key+'" class="'+(l.key===active?'on':'')+'" href="'+url(l.key)+'"'+(l.key===active?' aria-current="page"':'')+'>'
        + '<span class="ic">'+ICON[l.key]+'</span><span class="t"><b>'+l.text+'</b><small>'+l.sub+'</small></span></a>';
    });
    h += '</nav><div class="side"><div class="local">'+ICON.lock+'图片只在你的电脑上处理，不上传</div><button type="button" class="themeBtn"></button></div>';
    el.innerHTML = h;
    el.querySelector('.themeBtn').onclick = toggleTheme;
    syncThemeBtn();
  }
  function setActive(active){
    document.querySelectorAll('.tabs-app a[data-k]').forEach(function(a){
      var on = a.getAttribute('data-k')===active; a.classList.toggle('on', on);
      if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
    try{ localStorage.setItem('imgtools.last', active); }catch(e){}
  }
  function initNav(){
    document.querySelectorAll('.appbar').forEach(function(el){
      var a = el.getAttribute('data-active')||'';
      renderBar(el, a);
      try{ if(a) localStorage.setItem('imgtools.last', a); }catch(e){}
    });
  }
  // 打开网站时进入上次用的工具（第一次默认「压缩 · 转换」）
  function lastTool(){ try{ var v = localStorage.getItem('imgtools.last'); if(v && /^(compress|bg|gif|split)$/.test(v)) return v; }catch(e){} return 'compress'; }

  /* ---------------- 页面之间传图（存在本机浏览器的 IndexedDB，不上传） ---------------- */
  function db(){
    return new Promise(function(res, rej){
      var r = indexedDB.open('imgtools', 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore('handoff'); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ rej(r.error); };
    });
  }
  // items: [{name, blob, delay?}]
  async function send(items, key){
    var d = await db();
    await new Promise(function(res, rej){
      var tx = d.transaction('handoff','readwrite');
      tx.objectStore('handoff').put({items:items, t:Date.now()}, 'pending');
      tx.oncomplete = res; tx.onerror = function(){ rej(tx.error); };
    });
    location.href = url(key);
  }
  async function take(){
    try{
      var d = await db();
      return await new Promise(function(res){
        var tx = d.transaction('handoff','readwrite'), st = tx.objectStore('handoff'), g = st.get('pending');
        g.onsuccess = function(){
          var v = g.result; st.delete('pending');
          // 只接收 10 分钟内发出的
          res(v && Date.now()-v.t < 600000 ? v.items : null);
        };
        g.onerror = function(){ res(null); };
      });
    }catch(e){ return null; }
  }
  function toFiles(items){
    return items.map(function(it){ return new File([it.blob], it.name, {type: it.blob.type || 'image/png'}); });
  }
  function toast(text){
    var t = document.createElement('div'); t.className = 'handoffToast'; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function(){ t.style.opacity = '0'; }, 2600);
    setTimeout(function(){ t.remove(); }, 3000);
  }

  /* ---------------- ZIP（不压缩，文件名用 UTF-8，中文不乱码） ---------------- */
  var crcTable = null;
  function crc32(data){
    if(!crcTable){
      crcTable = new Uint32Array(256);
      for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c = (c&1) ? (0xedb88320 ^ (c>>>1)) : (c>>>1); crcTable[n] = c>>>0; }
    }
    var crc = -1;
    for(var i=0;i<data.length;i++) crc = (crc>>>8) ^ crcTable[(crc ^ data[i]) & 255];
    return (crc ^ -1) >>> 0;
  }
  // files: [{name, blob}]
  async function zip(files){
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, used = {};
    var now = new Date();
    var dosTime = (now.getHours()<<11) | (now.getMinutes()<<5) | (now.getSeconds()>>1);
    var dosDate = ((now.getFullYear()-1980)<<9) | ((now.getMonth()+1)<<5) | now.getDate();
    for(var i=0;i<files.length;i++){
      var name = files[i].name, base = name, n = 2;
      while(used[name.toLowerCase()]){ name = base.replace(/(\.[^.\/]+)?$/, '_'+(n++)+'$1'); }
      used[name.toLowerCase()] = 1;
      var data = new Uint8Array(await files[i].blob.arrayBuffer());
      var nb = enc.encode(name), crc = crc32(data);
      var lh = new Uint8Array(30+nb.length), v = new DataView(lh.buffer);
      v.setUint32(0,0x04034b50,true); v.setUint16(4,20,true); v.setUint16(6,0x0800,true); v.setUint16(8,0,true);
      v.setUint16(10,dosTime,true); v.setUint16(12,dosDate,true); v.setUint32(14,crc,true);
      v.setUint32(18,data.length,true); v.setUint32(22,data.length,true); v.setUint16(26,nb.length,true); v.setUint16(28,0,true);
      lh.set(nb,30);
      var ch = new Uint8Array(46+nb.length), c = new DataView(ch.buffer);
      c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true);
      c.setUint16(12,dosTime,true); c.setUint16(14,dosDate,true); c.setUint32(16,crc,true);
      c.setUint32(20,data.length,true); c.setUint32(24,data.length,true); c.setUint16(28,nb.length,true);
      c.setUint32(42,offset,true); ch.set(nb,46);
      parts.push(lh, data); central.push(ch); offset += lh.length + data.length;
    }
    var csize = central.reduce(function(a,b){ return a+b.length; }, 0);
    var end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true);
    e.setUint32(12,csize,true); e.setUint32(16,offset,true);
    return new Blob(parts.concat(central,[end]), {type:'application/zip'});
  }

  function download(blob, name){
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
  }
  function stamp(){
    var d = new Date(), p = function(v){ return String(v).padStart(2,'0'); };
    return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds());
  }

  window.Site = {url:url, lastTool:lastTool, setActive:setActive, send:send, take:take, toFiles:toFiles, toast:toast, zip:zip, download:download, stamp:stamp};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNav); else initNav();
})();
