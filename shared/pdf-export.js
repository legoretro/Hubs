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
      '.hub-pdf-box{width:min(1060px,96vw);max-height:92vh;overflow:auto;border:1px solid rgba(120,150,170,.35);border-radius:18px;background:#fff;color:#182d3b;box-shadow:0 22px 70px rgba(0,0,0,.28);padding:22px}',
      '.hub-pdf-box h2{font:900 30px/1.05 Georgia,"Times New Roman",serif;margin:0 0 6px;color:#10283a;text-align:center}',
      '.hub-pdf-box p{font:700 14px/1.45 Georgia,"Times New Roman",serif;margin:0 0 18px;color:#61717a;text-align:center}',
      '.hub-pdf-layout{display:grid;grid-template-columns:minmax(260px,360px) minmax(360px,1fr);gap:18px;align-items:start}',
      '.hub-pdf-controls{min-width:0}',
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
      '.hub-pdf-preview{display:grid;gap:8px}',
      '.hub-pdf-preview-title{font:900 12px/1 Georgia,"Times New Roman",serif;color:#10283a;text-transform:uppercase;letter-spacing:.08em}',
      '.hub-pdf-preview-frame{width:100%;height:440px;border:1px solid rgba(16,40,58,.25);border-radius:10px;background:#e8edf0;overflow:auto;padding:14px}',
      '.hub-pdf-preview-page{position:relative;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.18);overflow:hidden;transform-origin:top left}',
      '.hub-pdf-preview-page.landscape{width:1056px;height:816px}',
      '.hub-pdf-preview-page.portrait{width:816px;height:1056px}',
      '.hub-pdf-preview-content{width:100%;height:100%;overflow:hidden;background:#fff}',
      '.hub-pdf-preview-content .print-page{width:100%!important;height:100%!important;overflow:hidden!important;background:#fff!important;break-after:auto!important}',
      '.hub-pdf-preview-content .flowchart,.hub-pdf-preview-content .simple-chart-shell{border:0!important;overflow:hidden!important;max-height:none!important}',
      '.hub-pdf-preview-content .flow-root{zoom:var(--hub-preview-scale,1)!important}',
      '.hub-pdf-preview-content .simple-tree-root{zoom:var(--hub-preview-scale,1)!important}',
      '.hub-pdf-no-preview .hub-pdf-box{width:min(520px,94vw)}',
      '.hub-pdf-no-preview .hub-pdf-layout{display:block}',
      '.hub-pdf-no-preview .hub-pdf-preview{display:none}',
      '@media(max-width:860px){.hub-pdf-layout{grid-template-columns:1fr}.hub-pdf-preview-frame{height:300px}.hub-pdf-box{width:min(620px,96vw)}}',
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
      '<div class="hub-pdf-layout">'+
        '<div class="hub-pdf-controls">'+
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
        '</div>'+
        '<div class="hub-pdf-preview" data-pdf-preview>'+
          '<div class="hub-pdf-preview-title">Live page preview</div>'+
          '<div class="hub-pdf-preview-frame" data-pdf-preview-frame>'+
            '<div class="hub-pdf-preview-page landscape" data-pdf-preview-page><div class="hub-pdf-preview-content" data-pdf-preview-content></div></div>'+
          '</div>'+
        '</div>'+
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
    var preview=modal.querySelector('[data-pdf-preview]');
    var previewFrame=modal.querySelector('[data-pdf-preview-frame]');
    var previewPage=modal.querySelector('[data-pdf-preview-page]');
    var previewContent=modal.querySelector('[data-pdf-preview-content]');
    title.textContent=options.modalTitle||'Export PDF Settings';
    subtitle.textContent=(options.title?options.title+' · ':'')+(options.orientation==='portrait'?'Portrait':'Landscape')+' export';
    hint.textContent=options.hint||'Chrome may not show a scale box, so this slider scales the page before the print dialog opens.';
    slider.min=String(Math.round(min*100));
    slider.max=String(Math.round(max*100));
    slider.step=String(Math.max(1,Math.round(step*100)));
    function hasPreview(){
      return !!previewContent&&(Object.prototype.hasOwnProperty.call(options,'contentHtml')||typeof options.buildContent==='function');
    }
    function fitPreview(){
      if(!previewFrame||!previewPage)return;
      var width=previewPage.classList.contains('portrait')?816:1056;
      var height=previewPage.classList.contains('portrait')?1056:816;
      var frameWidth=Math.max(120,previewFrame.clientWidth-30);
      var frameHeight=Math.max(120,previewFrame.clientHeight-30);
      var fit=Math.min(frameWidth/width,frameHeight/height);
      previewPage.style.transform='scale('+fit.toFixed(4)+')';
    }
    function renderPreview(scale){
      if(!hasPreview()){
        modal.classList.add('hub-pdf-no-preview');
        if(previewContent)previewContent.innerHTML='';
        return;
      }
      modal.classList.remove('hub-pdf-no-preview');
      previewPage.classList.toggle('portrait',options.orientation==='portrait');
      previewPage.classList.toggle('landscape',options.orientation!=='portrait');
      previewPage.style.setProperty('--hub-preview-scale',String(scale));
      previewPage.style.setProperty(options.scaleVar||'--hub-print-scale',String(scale));
      if(typeof options.buildContent==='function')previewContent.innerHTML=options.buildContent(scale)||'';
      else previewContent.innerHTML=options.contentHtml||'';
      if(typeof options.previewReady==='function')options.previewReady(scale,previewContent);
      requestAnimationFrame(fitPreview);
    }
    function setScale(scale){
      scale=clamp(scale,min,max);
      slider.value=String(Math.round(scale*100));
      value.textContent=Math.round(scale*100)+'%';
      renderPreview(scale);
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
    requestAnimationFrame(fitPreview);
  }
  window.addEventListener('afterprint',cleanup);
  window.HubPdfExport={open:open,escapeHtml:escapeHtml};
})();
