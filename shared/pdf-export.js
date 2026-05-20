(function(){
  var activeCleanup=null;
  var styleId='hubPdfExportStyle';
  var modalId='hubPdfExportModal';
  var pageStyleId='hubPdfDynamicPageStyle';

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
      '.hub-pdf-btn{border:1.5px solid rgba(16,40,58,.25)!important;border-radius:999px!important;background:#fff!important;color:#10283a!important;padding:8px 14px!important;font:900 14px/1 Georgia,"Times New Roman",serif!important;cursor:pointer!important;text-decoration:none!important;opacity:1!important}',
      '.hub-pdf-btn:hover{background:#f4fbff!important}',
      '.hub-pdf-btn.active{background:#0f7b61!important;color:#fff!important;border-color:#0f7b61!important}',
      '.hub-pdf-primary{background:#0f7b61!important;color:#fff!important;border-color:#0f7b61!important;box-shadow:0 8px 20px rgba(15,123,97,.22)!important}',
      '.hub-pdf-orientation{display:none}',
      '.hub-pdf-orientation.visible{display:grid}',
      '.hub-pdf-orientation .hub-pdf-presets{justify-content:flex-start}',
      '.hub-pdf-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}',
      '.hub-pdf-hint{font:700 12px/1.4 Georgia,"Times New Roman",serif;color:#61717a;text-align:center;margin-top:10px}',
      '.hub-pdf-preview{display:grid;gap:8px}',
      '.hub-pdf-preview-title{font:900 12px/1 Georgia,"Times New Roman",serif;color:#10283a;text-transform:uppercase;letter-spacing:.08em}',
      '.hub-pdf-preview-frame{width:100%;height:440px;border:1px solid rgba(16,40,58,.25);border-radius:10px;background:#e8edf0;overflow:auto;padding:14px}',
      '.hub-pdf-preview-iframe{display:none;width:100%;height:100%;border:0;border-radius:8px;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.18)}',
      '.hub-pdf-preview-page{position:relative;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.18);overflow:hidden;transform-origin:top left}',
      '.hub-pdf-preview-page.landscape{width:1056px;height:816px}',
      '.hub-pdf-preview-page.portrait{width:816px;height:1056px}',
      '.hub-pdf-preview-content{width:100%;height:100%;overflow:hidden;background:#fff}',
      '.hub-pdf-preview-content .print-page{width:100%!important;height:100%!important;overflow:hidden!important;background:#fff!important;break-after:auto!important}',
      '.hub-pdf-preview-content .flowchart,.hub-pdf-preview-content .simple-chart-shell{border:0!important;overflow:hidden!important;max-height:none!important}',
      '.hub-pdf-preview-content .flow-root{zoom:var(--hub-preview-scale,1)!important}',
      '.hub-pdf-preview-content .simple-tree-root{zoom:var(--hub-preview-scale,1)!important}',
      '.hub-pdf-preview-content .hub-worksheet{width:100%;height:100%;overflow:hidden}',
      '.hub-pdf-preview-content .hub-worksheet-page{height:100%;break-after:auto;page-break-after:auto}',
      '.hub-worksheet{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff}',
      '.hub-worksheet-page{break-after:page;page-break-after:always;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.16in;padding:.18in;background:#fff}',
      '.hub-worksheet-page:last-child{break-after:auto;page-break-after:auto}',
      '.hub-worksheet-card{border:2px solid #000;background:#fff;color:#000;padding:.1in;min-height:0;break-inside:avoid;page-break-inside:avoid;overflow:hidden;display:grid;grid-template-rows:auto 1fr;gap:.08in}',
      '.hub-worksheet-card h2{font:900 18px/1.05 Arial,Helvetica,sans-serif;color:#000;margin:0;border-bottom:2px solid #000;padding:0 0 .055in;text-align:center}',
      '.hub-worksheet-note{font:700 10px/1.25 Arial,Helvetica,sans-serif;color:#111;margin:0;text-align:center}',
      '.hub-worksheet-row{display:grid;grid-template-columns:1fr 2fr;gap:.12in;min-height:0;height:100%}',
      '.hub-worksheet-visual,.hub-worksheet-info{border:2px solid #000;background:#fff;color:#000;min-height:0;overflow:hidden}',
      '.hub-worksheet-visual{display:flex;align-items:center;justify-content:center;text-align:center;padding:.08in}',
      '.hub-worksheet-visual img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border:0;margin:0 auto}',
      '.hub-worksheet-acronym{display:grid;gap:.05in;justify-items:center;color:#000}',
      '.hub-worksheet-acronym strong{font:900 28px/1 Arial,Helvetica,sans-serif;color:#000}',
      '.hub-worksheet-acronym span{font:800 11px/1.15 Arial,Helvetica,sans-serif;color:#111;text-transform:uppercase;letter-spacing:.04em}',
      '.hub-worksheet-info{padding:.1in .12in;font:700 12.5px/1.25 Arial,Helvetica,sans-serif}',
      '.hub-worksheet-fact{margin:0 0 .055in;break-inside:avoid}',
      '.hub-worksheet-fact strong{font-weight:900;color:#000;text-transform:uppercase;font-size:10.5px;letter-spacing:.025em}',
      '.hub-worksheet-empty{color:#555;font-style:italic}',
      '.hub-worksheet-table{width:100%;border-collapse:collapse;table-layout:fixed;font:700 11px/1.22 Arial,Helvetica,sans-serif;color:#000}',
      '.hub-worksheet-table th{background:#fff!important;color:#000!important;border:1px solid #000;border-bottom:2px solid #000;padding:5px 6px;text-align:left;font:900 10px/1.12 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.3px}',
      '.hub-worksheet-table td{border:1px solid #000;padding:5px 6px;vertical-align:top;background:#fff!important;white-space:normal;overflow-wrap:anywhere}',
      '.hub-worksheet-one .hub-worksheet-page{grid-template-columns:1fr;grid-template-rows:1fr}.hub-worksheet-one .hub-worksheet-card h2{font-size:30px}.hub-worksheet-one .hub-worksheet-info{font-size:18px}.hub-worksheet-one .hub-worksheet-fact strong{font-size:14px}.hub-worksheet-one .hub-worksheet-acronym strong{font-size:54px}',
      '.hub-worksheet-two .hub-worksheet-page{grid-template-columns:1fr;grid-template-rows:1fr 1fr}.hub-worksheet-two .hub-worksheet-card h2{font-size:24px}.hub-worksheet-two .hub-worksheet-info{font-size:15px}',
      '.hub-worksheet-portrait .hub-worksheet-four .hub-worksheet-page{grid-template-columns:1fr;grid-template-rows:repeat(4,1fr);gap:.12in;padding:.16in}',
      '.hub-worksheet-portrait .hub-worksheet-four .hub-worksheet-card{padding:.08in;gap:.05in}',
      '.hub-worksheet-portrait .hub-worksheet-four .hub-worksheet-card h2{font-size:16px}',
      '.hub-worksheet-portrait .hub-worksheet-four .hub-worksheet-row{grid-template-columns:.9fr 2.1fr;gap:.09in}',
      '.hub-worksheet-portrait .hub-worksheet-four .hub-worksheet-visual{padding:.04in}',
      '.hub-worksheet-portrait .hub-worksheet-four .hub-worksheet-visual img{width:100%;height:100%;object-fit:cover}',
      '.hub-worksheet-portrait .hub-worksheet-four .hub-worksheet-info{font-size:11px;line-height:1.18;padding:.07in .08in}',
      '.hub-worksheet-portrait .hub-worksheet-four .hub-worksheet-fact strong{font-size:9px}',
      '@media print{body.worksheet-printing #printArea{display:block!important;background:#fff;color:#000}body.worksheet-printing #printArea .hub-worksheet{width:100%}body.worksheet-printing #printArea .hub-worksheet-page{height:7.45in;overflow:hidden}body.hub-worksheet-portrait #printArea .hub-worksheet-page{height:10.45in}body.hub-worksheet-portrait #printArea .hub-worksheet-four .hub-worksheet-page{grid-template-columns:1fr;grid-template-rows:repeat(4,1fr);gap:.12in;padding:.16in}body.hub-worksheet-portrait #printArea .hub-worksheet-four .hub-worksheet-card{padding:.08in;gap:.05in}body.hub-worksheet-portrait #printArea .hub-worksheet-four .hub-worksheet-card h2{font-size:16px}body.hub-worksheet-portrait #printArea .hub-worksheet-four .hub-worksheet-row{grid-template-columns:.9fr 2.1fr;gap:.09in}body.hub-worksheet-portrait #printArea .hub-worksheet-four .hub-worksheet-visual{padding:.04in}body.hub-worksheet-portrait #printArea .hub-worksheet-four .hub-worksheet-visual img{width:100%;height:100%;object-fit:cover}body.hub-worksheet-portrait #printArea .hub-worksheet-four .hub-worksheet-info{font-size:11px;line-height:1.18;padding:.07in .08in}body.hub-worksheet-portrait #printArea .hub-worksheet-four .hub-worksheet-fact strong{font-size:9px}body.worksheet-printing #printArea .hub-worksheet-card{box-shadow:none}.hub-pdf-modal{display:none!important}}',
      '.hub-pdf-no-preview .hub-pdf-box{width:min(520px,94vw)}',
      '.hub-pdf-no-preview .hub-pdf-layout{display:block}',
      '.hub-pdf-no-preview .hub-pdf-preview{display:none}',
      '@media(max-width:860px){.hub-pdf-layout{grid-template-columns:1fr}.hub-pdf-preview-frame{height:300px}.hub-pdf-box{width:min(620px,96vw)}}'
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
          '<div class="hub-pdf-row hub-pdf-orientation" data-pdf-orientation-row>'+
            '<div class="hub-pdf-label"><span>Orientation</span><span class="hub-pdf-value" data-pdf-orientation-value>Landscape</span></div>'+
            '<div class="hub-pdf-presets">'+
              '<button type="button" class="hub-pdf-btn" data-pdf-orientation="landscape">Landscape</button>'+
              '<button type="button" class="hub-pdf-btn" data-pdf-orientation="portrait">Portrait</button>'+
            '</div>'+
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
            '<iframe class="hub-pdf-preview-iframe" data-pdf-preview-iframe title="PDF export preview"></iframe>'+
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
  function setDynamicPageStyle(orientation,margin){
    var style=document.getElementById(pageStyleId);
    if(!style){
      style=document.createElement('style');
      style.id=pageStyleId;
      document.head.appendChild(style);
    }
    style.textContent='@media print{@page{size:letter '+(orientation==='portrait'?'portrait':'landscape')+';margin:'+(margin||'.22in')+'}}';
    return function(){
      var live=document.getElementById(pageStyleId);
      if(live)live.remove();
    };
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
    var allowOrientation=!!options.allowOrientationToggle;
    var orientationPrefix=options.orientationClassPrefix||'';
    var orientationPersistKey=options.orientationPersistKey||(persistKey+'-orientation');
    var currentOrientation=options.orientation==='portrait'?'portrait':'landscape';
    if(allowOrientation){
      try{
        var savedOrientation=localStorage.getItem(orientationPersistKey);
        if(savedOrientation==='portrait'||savedOrientation==='landscape')currentOrientation=savedOrientation;
      }catch(e){}
    }
    var slider=modal.querySelector('[data-pdf-scale]');
    var value=modal.querySelector('[data-pdf-value]');
    var title=modal.querySelector('#hubPdfTitle');
    var subtitle=modal.querySelector('#hubPdfSubtitle');
    var hint=modal.querySelector('[data-pdf-hint]');
    var orientationRow=modal.querySelector('[data-pdf-orientation-row]');
    var orientationValue=modal.querySelector('[data-pdf-orientation-value]');
    var preview=modal.querySelector('[data-pdf-preview]');
    var previewFrame=modal.querySelector('[data-pdf-preview-frame]');
    var previewIframe=modal.querySelector('[data-pdf-preview-iframe]');
    var previewPage=modal.querySelector('[data-pdf-preview-page]');
    var previewContent=modal.querySelector('[data-pdf-preview-content]');
    title.textContent=options.modalTitle||'Export PDF Settings';
    hint.textContent=options.hint||'Chrome may not show a scale box, so this slider scales the page before the print dialog opens.';
    function orientationLabel(){
      return currentOrientation==='portrait'?'Portrait':'Landscape';
    }
    function updateOrientationUi(){
      subtitle.textContent=(options.title?options.title+' · ':'')+orientationLabel()+' export';
      if(orientationRow)orientationRow.classList.toggle('visible',allowOrientation);
      if(orientationValue)orientationValue.textContent=orientationLabel();
      modal.querySelectorAll('[data-pdf-orientation]').forEach(function(btn){
        btn.classList.toggle('active',btn.dataset.pdfOrientation===currentOrientation);
      });
    }
    updateOrientationUi();
    slider.min=String(Math.round(min*100));
    slider.max=String(Math.round(max*100));
    slider.step=String(Math.max(1,Math.round(step*100)));
    function hasPreview(){
      return !!previewContent&&(Object.prototype.hasOwnProperty.call(options,'contentHtml')||typeof options.buildContent==='function'||Object.prototype.hasOwnProperty.call(options,'previewHtml')||typeof options.buildPreviewHtml==='function');
    }
    function hasIframePreview(){
      return !!previewIframe&&(Object.prototype.hasOwnProperty.call(options,'previewHtml')||typeof options.buildPreviewHtml==='function');
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
        if(previewIframe)previewIframe.removeAttribute('srcdoc');
        return;
      }
      modal.classList.remove('hub-pdf-no-preview');
      if(hasIframePreview()){
        if(previewPage)previewPage.style.display='none';
        previewIframe.style.display='block';
        previewIframe.srcdoc=typeof options.buildPreviewHtml==='function' ? (options.buildPreviewHtml(scale,currentOrientation)||'') : (options.previewHtml||'');
        if(typeof options.previewReady==='function')options.previewReady(scale,previewIframe,currentOrientation);
        return;
      }
      if(previewIframe){
        previewIframe.style.display='none';
        previewIframe.removeAttribute('srcdoc');
      }
      if(previewPage)previewPage.style.display='block';
      if(previewContent){
        previewContent.className='hub-pdf-preview-content'+(options.previewClass?' '+String(options.previewClass):'')+(orientationPrefix?' '+orientationPrefix+'-'+currentOrientation:'');
      }
      previewPage.classList.toggle('portrait',currentOrientation==='portrait');
      previewPage.classList.toggle('landscape',currentOrientation!=='portrait');
      previewPage.style.setProperty('--hub-preview-scale',String(scale));
      previewPage.style.setProperty(options.scaleVar||'--hub-print-scale',String(scale));
      if(typeof options.buildContent==='function')previewContent.innerHTML=options.buildContent(scale,currentOrientation)||'';
      else previewContent.innerHTML=options.contentHtml||'';
      if(typeof options.previewReady==='function')options.previewReady(scale,previewContent,currentOrientation);
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
      var orientationButton=event.target.closest('[data-pdf-orientation]');
      if(orientationButton){
        currentOrientation=orientationButton.dataset.pdfOrientation==='portrait'?'portrait':'landscape';
        try{if(allowOrientation)localStorage.setItem(orientationPersistKey,currentOrientation)}catch(e){}
        updateOrientationUi();
        renderPreview(Number(slider.value)/100);
        return;
      }
      var preset=event.target.closest('[data-pdf-preset]');
      if(preset){setScale(Number(preset.dataset.pdfPreset));return}
      if(event.target.closest('[data-pdf-cancel]')){close();return}
      if(!event.target.closest('[data-pdf-print]'))return;
      var scale=setScale(Number(slider.value)/100);
      try{localStorage.setItem(persistKey,String(scale))}catch(e){}
      close();
      if(typeof options.customPrint==='function'){
        options.customPrint(scale,currentOrientation);
        return;
      }
      var area=options.printArea||document.getElementById(options.printAreaId||'printArea');
      if(!area)return;
      if(typeof options.buildContent==='function')area.innerHTML=options.buildContent(scale,currentOrientation)||'';
      else if(Object.prototype.hasOwnProperty.call(options,'contentHtml'))area.innerHTML=options.contentHtml||'';
      var classList=classes(options.bodyClass||'printing');
      if(orientationPrefix)classList.push(orientationPrefix+'-'+currentOrientation);
      classList.forEach(function(cls){document.body.classList.add(cls)});
      area.style.setProperty(options.scaleVar||'--hub-print-scale',String(scale));
      document.documentElement.style.setProperty(options.scaleVar||'--hub-print-scale',String(scale));
      var removePageStyle=options.dynamicPageStyle===false?null:setDynamicPageStyle(currentOrientation,options.pageMargin||'.22in');
      if(typeof options.beforePrint==='function')options.beforePrint(scale,area,currentOrientation);
      activeCleanup=function(){
        classList.forEach(function(cls){document.body.classList.remove(cls)});
        area.style.removeProperty(options.scaleVar||'--hub-print-scale');
        document.documentElement.style.removeProperty(options.scaleVar||'--hub-print-scale');
        if(removePageStyle)removePageStyle();
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
  function worksheetCell(value,type){
    if(type==='image'){
      return value?'<img src="'+escapeHtml(value)+'" alt="worksheet image">':'<span class="hub-worksheet-empty">Image</span>';
    }
    return String(value==null?'':value)
      .split(/\n/)
      .map(function(part){return escapeHtml(part)})
      .join('<br>');
  }
  function plainText(value){
    return String(value==null?'':value).replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').trim();
  }
  function initials(value){
    var text=plainText(value);
    if(!text)return 'Item';
    var words=text.replace(/[^A-Za-z0-9\s/.-]/g,' ').split(/\s+/).filter(Boolean);
    if(!words.length)return text.slice(0,6);
    if(words.length===1)return words[0].slice(0,8);
    return words.slice(0,3).map(function(word){return word.charAt(0)}).join('').toUpperCase();
  }
  function normalizeWorksheetTable(table){
    table=table||{};
    var columns=Array.isArray(table.columns)?table.columns:[];
    var rows=Array.isArray(table.rows)?table.rows:[];
    return {
      title:table.title||'Worksheet Table',
      note:table.note||'',
      columns:columns,
      rows:rows
    };
  }
  function worksheetItemsFromTable(table){
    var columns=table.columns.map(function(col,index){
      col=col||{};
      return {id:col.id||String(index),label:col.label||'',type:col.type||'text',index:index};
    });
    var imageColumn=columns.find(function(col){return col.type==='image'});
    var rows=table.rows.length?table.rows:[{cells:{}}];
    return rows.map(function(row,index){
      var cells=(row&&row.cells)||{};
      var titleColumn=columns.find(function(col){
        if(col.type==='image')return false;
        return plainText(Object.prototype.hasOwnProperty.call(cells,col.id)?cells[col.id]:'');
      }) || columns.find(function(col){return col.type!=='image'});
      var title=titleColumn ? plainText(cells[titleColumn.id]) : '';
      if(!title)title=table.title+(rows.length>1?' '+(index+1):'');
      var imageValue=imageColumn&&Object.prototype.hasOwnProperty.call(cells,imageColumn.id)?cells[imageColumn.id]:'';
      var facts=columns.filter(function(col){
        if(imageColumn&&col.id===imageColumn.id)return false;
        if(titleColumn&&col.id===titleColumn.id)return false;
        return true;
      }).map(function(col){
        var value=Object.prototype.hasOwnProperty.call(cells,col.id)?cells[col.id]:'';
        return {label:col.label||'Notes',value:value};
      }).filter(function(fact){return plainText(fact.value);});
      if(table.note)facts.unshift({label:'Section',value:table.note});
      if(!facts.length)facts.push({label:'Notes',value:''});
      return {
        title:title,
        source:table.title,
        image:imageValue,
        imageLabel:imageColumn&&imageColumn.label?imageColumn.label:'',
        facts:facts
      };
    });
  }
  function worksheetItemHtml(item){
    var visual=item.image
      ? '<img src="'+escapeHtml(item.image)+'" alt="'+escapeHtml(item.imageLabel||item.title)+'">'
      : '<div class="hub-worksheet-acronym"><strong>'+escapeHtml(initials(item.title))+'</strong><span>'+escapeHtml(item.source||'Worksheet')+'</span></div>';
    var facts=item.facts.map(function(fact){
      return '<p class="hub-worksheet-fact"><strong>'+escapeHtml(fact.label||'Notes')+':</strong> '+(plainText(fact.value)?worksheetCell(fact.value,'text'):'<span class="hub-worksheet-empty">Write notes here</span>')+'</p>';
    }).join('');
    return '<article class="hub-worksheet-card">'+
      '<h2>'+escapeHtml(item.title||'Worksheet Item')+'</h2>'+
      '<div class="hub-worksheet-row">'+
        '<div class="hub-worksheet-visual">'+visual+'</div>'+
        '<div class="hub-worksheet-info">'+facts+'</div>'+
      '</div>'+
    '</article>';
  }
  function tableWorksheetHtml(tables,options){
    options=options||{};
    tables=Array.isArray(tables)?tables:[tables];
    tables=tables.map(normalizeWorksheetTable).filter(function(table){return table.columns.length});
    var perPage=Math.max(1,Math.min(4,Number(options.itemsPerPage)||4));
    var modeClass=perPage===1?' hub-worksheet-one':(perPage===2?' hub-worksheet-two':' hub-worksheet-four');
    var items=[];
    tables.forEach(function(table){
      items=items.concat(worksheetItemsFromTable(table));
    });
    var pages='';
    for(var i=0;i<items.length;i+=perPage){
      var group=items.slice(i,i+perPage);
      pages+='<section class="hub-worksheet-page">'+group.map(worksheetItemHtml).join('')+'</section>';
    }
    return '<div class="hub-worksheet'+modeClass+'">'+pages+'</div>';
  }
  window.addEventListener('afterprint',cleanup);
  window.HubPdfExport={open:open,escapeHtml:escapeHtml,tableWorksheetHtml:tableWorksheetHtml};
})();
