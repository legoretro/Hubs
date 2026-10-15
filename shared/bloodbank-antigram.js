/* Personal entries remain on this device; shared practice data is never changed. */
var personalAntigramMode='own',personalAntigramReveal=false;
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
function personalAntigramCurrent(){return personalAntigramMode==='own'?personalAntigramRows:personalAntigramPractice;}
function personalAntigramAnalyze(rows){
 var evidence={},ruled=[];
 ANTIGRAM_ANTIGENS.forEach(function(a){var partner=personalAntigramPairs[a];evidence[a]=rows.map(function(c,i){return {cell:c,index:i};}).filter(function(r){var c=r.cell;return c.id!=='Auto'&&c.rxn&&c.rxn.ahg==='0'&&partner&&c.antigens[a]==='+'&&c.antigens[partner]==='0';}).map(function(r){return {id:r.cell.id,index:r.index,selected:r.index>=12};});if(evidence[a].length>=2)ruled.push(a);});
 var left=ANTIGRAM_ANTIGENS.filter(function(a){return !ruled.includes(a);});
 return {evidence:evidence,ruled:ruled,left:left,candidates:left.filter(function(a){return personalAntigramPairs[a]&&!personalAntigramExceptions.includes(a);}),exceptions:left.filter(function(a){return personalAntigramExceptions.includes(a);}),review:left.filter(function(a){return !personalAntigramPairs[a]&&!personalAntigramExceptions.includes(a);})};
}
function setPersonalAntigramMode(mode){personalAntigramMode=mode;personalAntigramReveal=false;renderPersonalAntigram();}
function persistPersonalAntigram(){if(personalAntigramMode!=='own')return;try{localStorage.setItem('bb-antigram-personal-v1',JSON.stringify(personalAntigramRows));}catch(e){showToast('Device storage unavailable. Keep this page open.',true);}}
function personalAntigramChange(row,kind,key,value){personalAntigramCurrent()[row][kind][key]=value;persistPersonalAntigram();updatePersonalAntigramResults();}
function addPersonalSelectedCell(){var rows=personalAntigramCurrent();rows.push(personalAntigramBlank('Selected '+(rows.length-11)));persistPersonalAntigram();renderPersonalAntigram();}
function personalAntigramSelect(row,kind,key,value,choices){return '<select aria-label="Cell '+escAttr(personalAntigramCurrent()[row].id)+' '+escAttr(key)+'" onchange="personalAntigramChange('+row+',\''+kind+'\',\''+key+'\',this.value)">'+choices.map(function(v){return '<option value="'+v+'"'+(v===value?' selected':'')+'>'+v+'</option>';}).join('')+'</select>';}
function personalAntigramTable(ags,selected){
 var rows=personalAntigramCurrent(),own=personalAntigramMode==='own';
 return '<table class="personal-antigram-table"><colgroup><col style="width:48px">'+ags.map(function(){return '<col>';}).join('')+'<col style="width:46px"></colgroup><thead><tr><th>'+ (selected?'Cell':'Panel A')+'</th>'+ags.map(function(a){return '<th><span data-ag-title="'+a+'">'+a+'</span><span class="ag-ledger" data-ag-ledger="'+a+'"></span></th>';}).join('')+'<th>AHG</th></tr></thead><tbody>'+rows.map(function(c,i){if(selected?i<12:i>=12)return '';return '<tr class="'+(c.id==='Auto'?'auto-row':'')+'"><td>'+escText(c.id.replace('Selected ','S'))+'</td>'+ags.map(function(a){return '<td class="ag-mark-cell" data-ag="'+a+'" data-row="'+i+'">'+(c.id==='Auto'?'—':own?personalAntigramSelect(i,'antigens',a,c.antigens[a]||'?',['?','0','+']):'<span>'+escText(c.antigens[a]||'?')+'</span>')+'</td>';}).join('')+'<td>'+ (own?personalAntigramSelect(i,'rxn','ahg',c.rxn.ahg||'NT',ANTIGRAM_RXN_OPTIONS):escText(c.rxn.ahg||'NT'))+'</td></tr>';}).join('')+'</tbody></table>';
}
var personalAntigramNarrow=window.matchMedia('(max-width:760px)').matches;
function renderPersonalAntigram(){
 var area=document.getElementById('personalAntigram');if(!area)return;var own=personalAntigramMode==='own',rows=personalAntigramCurrent(),groups=[];
 var size=personalAntigramNarrow?7:ANTIGRAM_ANTIGENS.length;for(var i=0;i<ANTIGRAM_ANTIGENS.length;i+=size)groups.push(ANTIGRAM_ANTIGENS.slice(i,i+size));
 area.innerHTML='<div class="sys-card ag-intro"><div class="personal-antigram-toolbar"><button class="btn '+(own?'btn-primary':'btn-ghost')+'" onclick="setPersonalAntigramMode(\'own\')">Do your own</button><button class="btn ag-practice-button '+(!own?'btn-primary':'btn-ghost')+'" onclick="setPersonalAntigramMode(\'practice\')">Practice here</button><details class="ag-rules"><summary aria-label="See rules here" title="See rules here">?</summary><div><b>Follow along</b><p>Only AHG results from the gel method are reported here. Enter your panel profile and AHG results; ? and NT mean unknown or untested.</p><p>For paired antigens, + with paired antigen 0 supplies homozygous evidence only on an AHG 0 cell. One / records one cell; two / marks rule it out in this exercise. Heterozygous cells and Auto never count.</p><p>Black / = Panel A. Red / = selected cells. Red marks also appear in the Panel A column ledger, with cell names on hover.</p><p>Cw, Lua, Kpa, V and Jsa may remain as low-incidence exceptions. D, f, Xga, Lea, Leb and P1 cannot have homozygosity established by these paired profiles and need separate review. Remaining possibilities are not a confirmed antibody identification.</p><p>Practice Panel A uses the supplied photograph. Printed unreported entries are shown as ?; handwritten rule-out marks are omitted. Patient cells are Auto, with AHG 0. Your own entries are stored only on this device.</p></div></details></div>'+
 (!own?'<div class="ag-practice-banner"><strong>Practice here — follow along</strong><span>Panel A is prefilled from the supplied photograph. Patient cells (Auto): 0. Selected cells below are supplemental teaching examples.</span></div>':'')+
 '<div class="personal-antigram-toolbar"><button class="btn btn-primary" onclick="personalAntigramReveal=!personalAntigramReveal;updatePersonalAntigramResults()">Homozygous Rule Outs</button>'+(own?'<button class="btn btn-ghost" onclick="addPersonalSelectedCell()">+ Selected cell</button>':'')+'</div></div><div class="ag-fit-panels">'+groups.map(function(g){return personalAntigramTable(g,false);}).join('')+'</div>'+ (rows.length>12?'<h3 class="ag-selected-heading">Selected cells to rule out: <span id="ag-selected-purpose"></span><small>Red / carries back to Panel A</small></h3><div class="ag-fit-panels">'+groups.map(function(g){return personalAntigramTable(g,true);}).join('')+'</div>':'')+'<div id="personalAntigramResults"></div>';
 updatePersonalAntigramResults();
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
 area.innerHTML=personalAntigramReveal?'<div class="antigram-result"><h3>Still left — paired-antigen review</h3>'+pills(a.candidates)+'<p><b>Low-incidence exceptions:</b> '+pills(a.exceptions)+'</p><p class="antigram-personal-note"><b>Separate review:</b> '+a.review.join(', ')+'</p>'+(personalAntigramMode==='practice'?'<details><summary>Practice walkthrough</summary><p>Cells 2, 6 and 9 react at AHG (1+, 2+, 1+). All other Panel A cells and Auto are 0. Follow the nonreactive cells and their paired antigen profiles to record exclusions; the remaining possibilities are not a confirmed identification. The supplemental selected cells provide teaching evidence for E, K, Jsb, Fya and M, leaving anti-S in the paired-antigen review. These selected cells are examples, not values from the photograph.</p></details>':'')+'</div>':'';
}
window.addEventListener('resize',function(){var narrow=window.matchMedia('(max-width:760px)').matches;if(narrow!==personalAntigramNarrow){personalAntigramNarrow=narrow;if(document.getElementById('sec-antigram').classList.contains('active'))renderPersonalAntigram();}});
