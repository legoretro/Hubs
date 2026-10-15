/* Personal entries remain on this device; shared practice data is never changed. */
var personalAntigramMode='practice',personalAntigramReveal=false,personalAntigramShowAnswers=false,personalAntigramPracticeLoaded=false;
var personalAntigramPairs={C:'c',c:'C',E:'e',e:'E',K:'k',k:'K',Kpa:'Kpb',Kpb:'Kpa',Jsa:'Jsb',Jsb:'Jsa',Fya:'Fyb',Fyb:'Fya',Jka:'Jkb',Jkb:'Jka',M:'N',N:'M',S:'s',s:'S',Lua:'Lub',Lub:'Lua'};
var personalAntigramExceptions=['Cw','Lua','Kpa','V','Jsa'];
function personalAntigramBlank(id){return {id:id,antigens:{},rxn:{ahg:'NT'}};}
function personalAntigramNew(){return Array.from({length:11},function(_,i){return personalAntigramBlank(String(i+1));}).concat([personalAntigramBlank('Auto')]);}
var personalAntigramRows=personalAntigramNew();
try{var savedPersonal=JSON.parse(localStorage.getItem('bb-antigram-personal-v1'));if(Array.isArray(savedPersonal)&&savedPersonal.length>=12)personalAntigramRows=savedPersonal;}catch(e){}
// Panel A transcribed from the supplied photograph, excluding handwritten rule-out marks.
// Printed / entries mean unreported here (?); +s is retained as printed.
var personalAntigramPhotoRows=[
 '+ + 0 0 + 0 + 0 0 + 0 + ? + 0 + + + + 0 0 0 + 0 + + 0 +',
 '+ + 0 0 + 0 0 ? 0 + 0 + ? + + 0 0 + + 0 + + + + 0 +s 0 +',
 '+ 0 + + 0 0 0 ? 0 + 0 + ? + + + 0 + + + 0 0 + + + 0 0 +',
 '+ 0 0 + + + 0 ? 0 + 0 + ? + 0 0 + + + 0 0 0 + + + + 0 +',
 '0 + 0 + + + 0 0 0 + 0 + ? + 0 + + + + 0 + 0 + + + + 0 +',
 '0 0 + + + + 0 0 0 + 0 + ? + 0 + + + + 0 + + 0 + 0 + 0 +',
 '0 0 0 + + + 0 0 + + 0 + 0 + 0 + + 0 + 0 + + + + + 0 0 +',
 '0 0 0 + + + 0 0 0 + 0 + ? + + 0 + 0 + + 0 0 + 0 + + 0 +',
 '0 0 0 + + + 0 0 0 + 0 + ? + 0 + + + + 0 + + 0 + 0 + 0 +',
 '0 0 0 + + + 0 ? 0 + 0 + ? + 0 + 0 + + 0 + 0 + 0 + 0 + +',
 '+ + 0 0 + 0 0 0 + + 0 + ? + 0 + + + + 0 + 0 + 0 + 0 0 +'
];
var personalAntigramPhotoResults=['0','1+','0','0','0','2+','0','0','1+','0','0'];
var personalAntigramPractice=personalAntigramNew();
personalAntigramPhotoRows.forEach(function(row,i){
 var values=row.split(' ');if(values.length!==ANTIGRAM_ANTIGENS.length)throw Error('Practice Panel A column mismatch');
 ANTIGRAM_ANTIGENS.forEach(function(a,j){personalAntigramPractice[i].antigens[a]=values[j];});
 personalAntigramPractice[i].rxn.ahg=personalAntigramPhotoResults[i];
});
personalAntigramPractice[11].rxn.ahg='0';
// Supplemental teaching cells, not transcribed from the photograph.
['Selected 1','Selected 2'].forEach(function(id){
 var cell=personalAntigramBlank(id);
 ANTIGRAM_ANTIGENS.forEach(function(a){cell.antigens[a]='?';});
 ['E','K','Jsb','Fya','M'].forEach(function(a){cell.antigens[a]='+';cell.antigens[personalAntigramPairs[a]]='0';});
 cell.antigens.S='0';cell.antigens.s='+';cell.rxn.ahg='0';personalAntigramPractice.push(cell);
});
function loadAntigramPractice(){if(personalAntigramPracticeLoaded)return;personalAntigramPracticeLoaded=true;try{var saved=notesData&&notesData.__antigramPractice;if(saved&&Array.isArray(saved)&&saved.length>=12){personalAntigramPractice=saved;}}catch(e){}}
function personalAntigramCurrent(){if(personalAntigramMode==='practice'){loadAntigramPractice();return personalAntigramPractice;}return personalAntigramRows;}
function personalAntigramAnalyze(rows){
 var evidence={},ruled=[];
 ANTIGRAM_ANTIGENS.forEach(function(a){var partner=personalAntigramPairs[a];evidence[a]=rows.map(function(c,i){return {cell:c,index:i};}).filter(function(r){var c=r.cell;return c.id!=='Auto'&&c.rxn&&c.rxn.ahg==='0'&&partner&&c.antigens[a]==='+'&&c.antigens[partner]==='0';}).map(function(r){return {id:r.cell.id,index:r.index,selected:r.index>=12};});if(evidence[a].length>=2)ruled.push(a);});
 var left=ANTIGRAM_ANTIGENS.filter(function(a){return !ruled.includes(a);});
 return {evidence:evidence,ruled:ruled,left:left,candidates:left.filter(function(a){return personalAntigramPairs[a]&&!personalAntigramExceptions.includes(a);}),exceptions:left.filter(function(a){return personalAntigramExceptions.includes(a);}),review:left.filter(function(a){return !personalAntigramPairs[a]&&!personalAntigramExceptions.includes(a);})};
}
function setPersonalAntigramMode(mode){personalAntigramMode=mode==='own'?'own':'practice';personalAntigramReveal=false;personalAntigramShowAnswers=false;renderPersonalAntigram();}
function persistPersonalAntigram(){if(personalAntigramMode==='practice'){if(!isAdmin)return;notesData.__antigramPractice=personalAntigramPractice;scheduleSave();return;}try{localStorage.setItem('bb-antigram-personal-v1',JSON.stringify(personalAntigramRows));}catch(e){showToast('Device storage unavailable. Keep this page open.',true);}}
function personalAntigramChange(row,kind,key,value){if(personalAntigramMode==='practice'&&!isAdmin)return;personalAntigramCurrent()[row][kind][key]=value;persistPersonalAntigram();updatePersonalAntigramResults();}
function addPersonalSelectedCell(){if(personalAntigramMode==='practice'&&!isAdmin)return;var rows=personalAntigramCurrent();rows.push(personalAntigramBlank('Selected '+(rows.length-11)));persistPersonalAntigram();renderPersonalAntigram();}
function personalAntigramSelect(row,kind,key,value,choices){return '<select aria-label="Cell '+escAttr(personalAntigramCurrent()[row].id)+' '+escAttr(key)+'" onchange="personalAntigramChange('+row+',\''+kind+'\',\''+key+'\',this.value)">'+choices.map(function(v){return '<option value="'+v+'"'+(v===value?' selected':'')+'>'+v+'</option>';}).join('')+'</select>';}
function personalAntigramTable(ags,selected){
 var rows=personalAntigramCurrent(),editable=isAdmin||personalAntigramMode==='own';
 return '<table class="personal-antigram-table"><colgroup><col style="width:48px">'+ags.map(function(){return '<col>';}).join('')+'<col style="width:46px"></colgroup><thead><tr><th>'+ (selected?'Cell':'Panel A')+'</th>'+ags.map(function(a){return '<th><span data-ag-title="'+a+'">'+a+'</span><span class="ag-ledger" data-ag-ledger="'+a+'"></span></th>';}).join('')+'<th>AHG</th></tr></thead><tbody>'+rows.map(function(c,i){if(selected?i<12:i>=12)return '';return '<tr class="'+(c.id==='Auto'?'auto-row':'')+'"><td>'+escText(c.id.replace('Selected ','S'))+'</td>'+ags.map(function(a){return '<td class="ag-mark-cell" data-ag="'+a+'" data-row="'+i+'">'+(c.id==='Auto'?'—':editable?personalAntigramSelect(i,'antigens',a,c.antigens[a]||'?',['?','0','+']):'<span>'+escText(c.antigens[a]||'?')+'</span>')+'</td>';}).join('')+'<td>'+ (editable?personalAntigramSelect(i,'rxn','ahg',c.rxn.ahg||'NT',ANTIGRAM_RXN_OPTIONS):escText(c.rxn.ahg||'NT'))+'</td></tr>';}).join('')+'</tbody></table>';
}
var personalAntigramNarrow=window.matchMedia('(max-width:760px)').matches;
function renderPersonalAntigram(){
 var area=document.getElementById('personalAntigram');if(!area)return;var own=personalAntigramMode==='own',rows=personalAntigramCurrent(),groups=[];
 var size=personalAntigramNarrow?7:ANTIGRAM_ANTIGENS.length;for(var i=0;i<ANTIGRAM_ANTIGENS.length;i+=size)groups.push(ANTIGRAM_ANTIGENS.slice(i,i+size));
 area.innerHTML='<div class="sys-card ag-intro"><div class="personal-antigram-toolbar">'+'<button class="btn '+(!own?'btn-primary':'btn-ghost')+'" onclick="setPersonalAntigramMode(\'practice\')">Practice Panel A</button>'+(own?'<button class="btn btn-primary">Do your own</button>':'<button class="btn btn-ghost" onclick="setPersonalAntigramMode(\'own\')">Do your own</button>')+'<details class="ag-rules"><summary aria-label="Follow along" title="Follow along">?</summary><div><b>Follow along</b><p>Enter antigen results and AHG reactions. For gel practice, enter AHG results only.</p><p>'+(isAdmin?'Admins can edit Practice Panel A and add selected cells.':'Do your own is for your personal panel.')+'</p></div></details></div>'+(!own?'<div class="ag-practice-banner"><strong>Practice Panel A</strong></div>':'')+'<div class="personal-antigram-toolbar">'+(isAdmin&&!own?'<button class="btn btn-ghost" onclick="personalAntigramShowAnswers=!personalAntigramShowAnswers;updatePersonalAntigramResults()">'+(personalAntigramShowAnswers?'Hide answers':'With answers')+'</button>':'')+'<button class="btn btn-primary" onclick="personalAntigramReveal=!personalAntigramReveal;updatePersonalAntigramResults()">Homozygous Rule Outs</button>'+(isAdmin&&!own?'<button class="btn btn-ghost" onclick="addPersonalSelectedCell()">+ Selected cell</button>':own?'<button class="btn btn-ghost" onclick="addPersonalSelectedCell()">+ Selected cell</button>':'')+'<button class="btn btn-ghost" onclick="exportPersonalAntigram()">Export Antigram</button></div></div><div class="ag-fit-panels">'+groups.map(function(g){return personalAntigramTable(g,false);}).join('')+'</div>'+ (rows.length>12?'<h3 class="ag-selected-heading">Selected cells to rule out: <span id="ag-selected-purpose"></span><small>Red / carries back to Panel A</small></h3><div class="ag-fit-panels">'+groups.map(function(g){return personalAntigramTable(g,true);}).join('')+'</div>':'')+'<div id="personalAntigramResults"></div>';
 updatePersonalAntigramResults();
}
function exportPersonalAntigram(){
 var area=document.getElementById('personalAntigram');if(!area)return;
 var clone=area.cloneNode(true);clone.querySelectorAll('.personal-antigram-toolbar,.ag-rules,.ag-practice-banner').forEach(function(el){el.remove();});
 clone.querySelectorAll('select').forEach(function(el){var span=document.createElement('span');span.textContent=el.value;el.replaceWith(span);});
 clone.querySelectorAll('button').forEach(function(el){el.remove();});
 var css='.ag-fit-panels{margin:12px 0}.personal-antigram-table{width:100%;table-layout:fixed;border-collapse:collapse;font:10px Arial}.personal-antigram-table th{background:#5a0e20;color:white}.personal-antigram-table td,.personal-antigram-table th{border:1px solid #d9b5bf;text-align:center;padding:4px}.personal-antigram-table select{border:0;background:none}.ag-selected-heading{font:bold 13px Arial;margin:12px 0}.ag-unresolved{background:#fff1b8}.ag-ruled{outline:2px solid #c0173d}.antigram-result{margin-top:12px;padding:10px;border:1px solid #efd0d8}.ag-ledger{display:flex;justify-content:center;gap:3px}.ag-red{color:#c0173d}.ag-black{color:#111}';
 printExportHtml('<section style="font:12px Arial;color:#32141e"><h1>Antigram</h1>'+clone.innerHTML+'</section>','Antigram','landscape',{directPrint:false,defaultScale:.85,minScale:.5,maxScale:1,step:.05,allowOrientationToggle:true});
}
function updatePersonalAntigramResults(){
 var area=document.getElementById('personalAntigramResults');if(!area)return;var a=personalAntigramAnalyze(personalAntigramCurrent());
 document.querySelectorAll('[data-ag-ledger]').forEach(function(el){var ev=a.evidence[el.dataset.agLedger].slice(0,2);el.innerHTML=personalAntigramReveal?ev.map(function(e){return '<span class="'+(e.selected?'ag-red':'ag-black')+'" title="'+escAttr((e.selected?'Selected cell ':'Panel A cell ')+e.id)+'">/</span>';}).join(''):'';el.setAttribute('aria-label',personalAntigramReveal?ev.map(function(e){return (e.selected?'Selected cell ':'Panel A cell ')+e.id;}).join(', '):'');});
 function styleColumn(el,ag){el.classList.toggle('ag-ruled',personalAntigramReveal&&a.ruled.includes(ag));el.classList.toggle('ag-unresolved',personalAntigramReveal&&!a.ruled.includes(ag));}
 document.querySelectorAll('[data-ag-title]').forEach(function(el){styleColumn(el.closest('th'),el.dataset.agTitle);});
 document.querySelectorAll('.ag-mark-cell').forEach(function(td){styleColumn(td,td.dataset.ag);});
 var purpose=document.getElementById('ag-selected-purpose'),base=personalAntigramAnalyze(personalAntigramCurrent().slice(0,12));
 if(purpose){var targets=base.candidates.filter(function(ag){return a.evidence[ag].some(function(e){return e.selected;});});purpose.textContent=(targets.length?targets:base.candidates).map(function(ag){return 'anti-'+ag;}).join(', ')||'No additional paired exclusions needed';}
 function pills(values){return values.map(function(ag){return '<span class="antigram-pill left">anti-'+ag+'</span>';}).join(' ')||'None';}
 var showResults=personalAntigramMode==='own'?personalAntigramReveal:(isAdmin&&(personalAntigramReveal||personalAntigramShowAnswers));
 area.innerHTML=showResults?'<div class="antigram-result"><h3>Still left — paired-antigen review</h3>'+pills(a.candidates)+'<p><b>Low-incidence exceptions:</b> '+pills(a.exceptions)+'</p><p class="antigram-personal-note"><b>Separate review:</b> '+a.review.join(', ')+'</p>'+(personalAntigramShowAnswers&&isAdmin&&personalAntigramMode==='practice'?'<p><b>With answers:</b> Current unresolved paired specificities are '+pills(a.candidates)+'.</p>':'')+'</div>':'';
}
window.addEventListener('resize',function(){var narrow=window.matchMedia('(max-width:760px)').matches;if(narrow!==personalAntigramNarrow){personalAntigramNarrow=narrow;if(document.getElementById('sec-antigram').classList.contains('active'))renderPersonalAntigram();}});
