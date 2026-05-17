(function(){
  var activeCleanup=null;
  var styleId='hubPdfExportStyle';
  var modalId='hubPdfExportModal';

  function clamp(value,min,max){
    value=Number(value);
    if(!Number.isFinite(value))value=1;
    return Math.max(min,Math.min(max,value));
  }
  function classes(value){
    if(!value)return [];
    return Array.isArray(value)?value:String(value).split(/\s+/).filter(Boolean);
  }
  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }
  function ensureStyle(){
    if(document.getElementById(styleId))return;
    var style=document.createElement('style');
    style.id=styleId;
    style.textContent=[
      '.hub-pdf-modal{position:fixed;inset:0;z-index:5000;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(8,24,35,.62);backdrop-filter:blur(2px)}',
      '.hub-pdf-modal.visible{display:flex}',
      '.hub-pdf-box{width:min(520px,94vw);border:1px solid rgba(120,150,170,.35);border-radius:18px;background:#fff;color:#182d3b;box-shadow:0 22px 70px rgba(0,0,0,.28);padding:24px}',
      '.hub-pdf-box h2{font:900 30px/1.05 Georgia,"Times New Roman",serif;margin:0 0 6px;color:#10283a;text-align:center}',
      '.hub-pdf-box p{font:700 14px/1.45 Georgia,"Times New Roman",serif;margin:0 0 18px;color:#61717a;text-align:center}',
      '.hub-pdf-row{display:grid;gap:8px;margin:14px 0}',
      '.hub-pdf-label{display:flex;align-items:center;justify-content:space-between;gap:12px;font:900 13px/1.2 Georgia,"Times New Roman",serif;color:#10283a;letter-spacing:.04em;text-transform:uppercase}',
      '.hub-pdf-value{font-size:18px;color:#0f7b61;text-transform:none;letter-spacing:0}',
      '.hub-pdf-slider{width:100%;accent-color:#0f7b61}',
      '.hub-pdf-presets{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}',
      '.hub-pdf-btn{border:1.5px solid rgba(16,40,58,.25);border-radius:999px;background:#fff;color:#10283a;padding:8px 14px;font:900 14px/1 Georgia,"Times New Roman",serif;cursor:pointer}',
      '.hub-pdf-btn:hover{background:#f4fbff}',
      '.hub-pdf-primary{background:#0f7b61;color:#fff;border-color:#0f7b61;box-shadow:0 8px 20px rgba(15,123,97,.22)}',
      '.hub-pdf-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}',
      '.hub-pdf-hint{font:700 12px/1.4 Georgia,"Times New Roman",serif;color:#61717a;text-align:center;margin-top:10px}',
      '@media print{.hub-pdf-modal{display:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }
  function ensureModal(){
    ensureStyle();
    var modal=document.getElementById(modalId);
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id=modalId;
    modal.className='hub-pdf-modal';
    modal.innerHTML='<div class="hub-pdf-box" role="dialog" aria-modal="true" aria-labelledby="hubPdfTitle">'+
      '<h2 id="hubPdfTitle">Export PDF Settings</h2>'+
      '<p id="hubPdfSubtitle">Adjust the scale before Chrome opens Save as PDF.</p>'+
      '<div class="hub-pdf-row">'+
        '<div class="hub-pdf-label"><span>Scale</span><span class="hub-pdf-value" data-pdf-value>100%</span></div>'+
        '<input class="hub-pdf-slider" data-pdf-scale type="range" min="40" max="120" step="1" value="100">'+
      '</div>'+
      '<div class="hub-pdf-presets">'+
        '<button type="button" class="hub-pdf-btn" data-pdf-preset="0.55">Tiny fit</button>'+
        '<button type="button" class="hub-pdf-btn" data-pdf-preset="0.75">Compact</button>'+
        '<button type="button" class="hub-pdf-btn" data-pdf-preset="1">Full size</button>'+
      '</div>'+
      '<div class="hub-pdf-hint" data-pdf-hint>Tip: use Chrome margins “None” or “Minimum” when you need every inch.</div>'+
      '<div class="hub-pdf-actions">'+
        '<button type="button" class="hub-pdf-btn hub-pdf-primary" data-pdf-print>Open Save as PDF</button>'+
        '<button type="button" class="hub-pdf-btn" data-pdf-cancel>Cancel</button>'+
      '</div>'+
    '</div>';
    document.body.appendChild(modal);
    return modal;
  }
  function cleanup(){
    if(activeCleanup){
      var fn=activeCleanup;
      activeCleanup=null;
      fn();
    }
  }
  function open(options){
    options=options||{};
    cleanup();
    var modal=ensureModal();
    var min=Number(options.minScale)||0.4;
    var max=Number(options.maxScale)||1.2;
    var step=Number(options.step)||0.01;
    var persistKey=options.persistKey||'hub-pdf-scale';
    var saved=null;
    try{saved=localStorage.getItem(persistKey)}catch(e){}
    var defaultScale=clamp(saved||options.defaultScale||1,min,max);
    var slider=modal.querySelector('[data-pdf-scale]');
    var value=modal.querySelector('[data-pdf-value]');
    var title=modal.querySelector('#hubPdfTitle');
    var subtitle=modal.querySelector('#hubPdfSubtitle');
    var hint=modal.querySelector('[data-pdf-hint]');
    title.textContent=options.modalTitle||'Export PDF Settings';
    subtitle.textContent=(options.title?options.title+' · ':'')+(options.orientation==='portrait'?'Portrait':'Landscape')+' export';
    hint.textContent=options.hint||'Chrome may not show a scale box, so this slider scales the page before the print dialog opens.';
    slider.min=String(Math.round(min*100));
    slider.max=String(Math.round(max*100));
    slider.step=String(Math.max(1,Math.round(step*100)));
    function setScale(scale){
      scale=clamp(scale,min,max);
      slider.value=String(Math.round(scale*100));
      value.textContent=Math.round(scale*100)+'%';
      return scale;
    }
    setScale(defaultScale);
    function close(){
      modal.classList.remove('visible');
      modal.removeEventListener('click',onClick);
      slider.removeEventListener('input',onInput);
      document.removeEventListener('keydown',onKey);
    }
    function onInput(){setScale(Number(slider.value)/100)}
    function onKey(event){if(event.key==='Escape')close()}
    function onClick(event){
      var preset=event.target.closest('[data-pdf-preset]');
      if(preset){setScale(Number(preset.dataset.pdfPreset));return}
      if(event.target.closest('[data-pdf-cancel]')){close();return}
      if(!event.target.closest('[data-pdf-print]'))return;
      var scale=setScale(Number(slider.value)/100);
      try{localStorage.setItem(persistKey,String(scale))}catch(e){}
      close();
      if(typeof options.customPrint==='function'){
        options.customPrint(scale);
        return;
      }
      var area=options.printArea||document.getElementById(options.printAreaId||'printArea');
      if(!area)return;
      if(typeof options.buildContent==='function')area.innerHTML=options.buildContent(scale)||'';
      else if(Object.prototype.hasOwnProperty.call(options,'contentHtml'))area.innerHTML=options.contentHtml||'';
      var classList=classes(options.bodyClass||'printing');
      classList.forEach(function(cls){document.body.classList.add(cls)});
      area.style.setProperty(options.scaleVar||'--hub-print-scale',String(scale));
      document.documentElement.style.setProperty(options.scaleVar||'--hub-print-scale',String(scale));
      if(typeof options.beforePrint==='function')options.beforePrint(scale,area);
      activeCleanup=function(){
        classList.forEach(function(cls){document.body.classList.remove(cls)});
        area.style.removeProperty(options.scaleVar||'--hub-print-scale');
        document.documentElement.style.removeProperty(options.scaleVar||'--hub-print-scale');
        if(options.clearAfterPrint!==false)area.innerHTML='';
        if(typeof options.afterPrint==='function')options.afterPrint(area);
      };
      window.print();
      setTimeout(cleanup,1400);
    }
    modal.addEventListener('click',onClick);
    slider.addEventListener('input',onInput);
    document.addEventListener('keydown',onKey);
    modal.classList.add('visible');
  }
  window.addEventListener('afterprint',cleanup);
  window.HubPdfExport={open:open,escapeHtml:escapeHtml};
})();
