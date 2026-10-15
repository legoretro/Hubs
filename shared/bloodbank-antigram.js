/* Personal work never mutates the shared practice lots or cloud notes. */
var personalAntigramMode='own', personalAntigramReveal=false;
var personalAntigramPairs={C:'c',c:'C',E:'e',e:'E',K:'k',k:'K',Kpa:'Kpb',Kpb:'Kpa',Jsa:'Jsb',Jsb:'Jsa',Fya:'Fyb',Fyb:'Fya',Jka:'Jkb',Jkb:'Jka',M:'N',N:'M',S:'s',s:'S',Lua:'Lub',Lub:'Lua'};
function personalAntigramBlank(id){return {id:id,antigens:{},rxn:{is:'NT',t37:'NT',ahg:'NT'}};}
function personalAntigramNew(){return Array.from({length:11},function(_,i){return personalAntigramBlank(String(i+1));}).concat([personalAntigramBlank('Auto')]);}
var personalAntigramRows=personalAntigramNew();
try{var savedPersonal=JSON.parse(localStorage.getItem('bb-antigram-personal-v1'));if(Array.isArray(savedPersonal)&&savedPersonal.length>=12)personalAntigramRows=savedPersonal;}catch(e){}
var personalAntigramPractice=personalAntigramNew();
// Fixed teaching example: anti-E reactivity; paired phenotypes are coherent.
personalAntigramPractice.forEach(function(cell,i){
 if(cell.id==='Auto'){cell.rxn={is:'0',t37:'0',ahg:'0'};return;}
 var pairs=[['C','c'],['E','e'],['K','k'],['Kpa','Kpb'],['Jsa','Jsb'],['Fya','Fyb'],['Jka','Jkb'],['M','N'],['S','s'],['Lua','Lub']];
 ANTIGRAM_ANTIGENS.forEach(function(a){cell.antigens[a]='0';});
 pairs.forEach(function(pair,j){var state=(i+j)%3;cell.antigens[pair[0]]=state===1?'0':'+';cell.antigens[pair[1]]=state===0?'0':'+';});
 cell.antigens.D='+';cell.antigens.f=cell.antigens.c==='+'&&cell.antigens.e==='+'?'+':'0';cell.antigens.Xga=i%2?'+':'0';cell.antigens.Lea=i%3===0?'+':'0';cell.antigens.Leb=i%3===1?'+':'0';cell.antigens.P1=i%2?'+':'0';
 cell.rxn={is:'0',t37:'0',ahg:cell.antigens.E==='+'?'2+':'0'};
});
function personalAntigramCurrent(){return personalAntigramMode==='own'?personalAntigramRows:personalAntigramPractice;}
function personalAntigramAnalyze(rows){
 var evidence={},ruled=[];
 ANTIGRAM_ANTIGENS.forEach(function(a){var partner=personalAntigramPairs[a];evidence[a]=rows.filter(function(c){return c.id!=='Auto'&&c.rxn.is==='0'&&c.rxn.t37==='0'&&c.rxn.ahg==='0'&&partner&&c.antigens[a]==='+'&&c.antigens[partner]==='0';}).map(function(c){return c.id;});if(evidence[a].length>=2)ruled.push(a);});
 return {evidence:evidence,ruled:ruled,left:ANTIGRAM_ANTIGENS.filter(function(a){return !ruled.includes(a);})};
}
function setPersonalAntigramMode(mode){personalAntigramMode=mode;personalAntigramReveal=false;renderPersonalAntigram();}
function personalAntigramChange(row,kind,key,value){var rows=personalAntigramCurrent();rows[row][kind][key]=value;if(personalAntigramMode==='own'){try{localStorage.setItem('bb-antigram-personal-v1',JSON.stringify(rows));}catch(e){showToast('Device storage is unavailable; keep this page open.',true);}}updatePersonalAntigramResults();}
function addPersonalSelectedCell(){var rows=personalAntigramCurrent();rows.push(personalAntigramBlank('Selected '+(rows.length-11)));if(personalAntigramMode==='own')localStorage.setItem('bb-antigram-personal-v1',JSON.stringify(rows));renderPersonalAntigram();}
function personalAntigramSelect(row,kind,key,value,choices){return '<select aria-label="'+escAttr(personalAntigramCurrent()[row].id+' '+key)+'" onchange="personalAntigramChange('+row+',\''+kind+'\',\''+key+'\',this.value)">'+choices.map(function(v){return '<option value="'+v+'"'+(v===value?' selected':'')+'>'+v+'</option>';}).join('')+'</select>';}
function renderPersonalAntigram(){
 var area=document.getElementById('personalAntigram');if(!area)return;
 var rows=personalAntigramCurrent(),own=personalAntigramMode==='own';
 area.innerHTML='<div class="sys-card"><div class="personal-antigram-toolbar"><button class="btn '+(own?'btn-primary':'btn-ghost')+'" onclick="setPersonalAntigramMode(\'own\')">My results</button><button class="btn '+(!own?'btn-primary':'btn-ghost')+'" onclick="setPersonalAntigramMode(\'practice\')">Practice</button></div><h3>Panel A</h3><p class="antigram-personal-note">'+(own?'Enter the antigen profile from your Panel A sheet and your reaction results. ? means not entered. Your entries save on this device.':'One teaching panel. Review the reactions, then compare your rule-outs.')+'</p><div class="personal-antigram-toolbar"><button class="btn btn-primary" onclick="personalAntigramReveal=!personalAntigramReveal;updatePersonalAntigramResults()">Homozygous Rule Outs</button><button class="btn btn-ghost" onclick="addPersonalSelectedCell()">+ Selected cell</button></div><p class="antigram-personal-note">Study rule: two nonreactive cells with antigen + and paired antigen 0. Heterozygous, unknown, untested and Auto cells never rule out. Unpaired antigens stay listed. Confirm exclusion criteria against your SOP.</p></div>'+
 '<div class="antigram-panel-wrap"><table class="personal-antigram-table"><thead><tr><th>Panel A</th>'+ANTIGRAM_ANTIGENS.map(function(a){return '<th>'+a+'</th>';}).join('')+'<th>IS</th><th>37°C</th><th>AHG</th></tr></thead><tbody>'+rows.map(function(c,i){return '<tr class="'+(c.id==='Auto'?'auto-row':'')+'"><td>'+escText(c.id)+'</td>'+ANTIGRAM_ANTIGENS.map(function(a){return '<td data-personal-antigen="'+a+'">'+(c.id==='Auto'?'—':(own||i>=12)?personalAntigramSelect(i,'antigens',a,c.antigens[a]||'?',['?','0','+']):escText(c.antigens[a]||'?'))+'</td>';}).join('')+['is','t37','ahg'].map(function(phase){return '<td>'+personalAntigramSelect(i,'rxn',phase,c.rxn[phase]||'NT',ANTIGRAM_RXN_OPTIONS)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div><div id="personalAntigramResults"></div>';
 updatePersonalAntigramResults();
}
function updatePersonalAntigramResults(){
 var area=document.getElementById('personalAntigramResults');if(!area)return;var a=personalAntigramAnalyze(personalAntigramCurrent());
 document.querySelectorAll('[data-personal-antigen]').forEach(function(td){td.classList.toggle('ruled',personalAntigramReveal&&a.ruled.includes(td.dataset.personalAntigen));});
 area.innerHTML=personalAntigramReveal?'<div class="antigram-result"><h3>Homozygous Rule Outs</h3>'+ (a.ruled.length?a.ruled.map(function(ag){return '<span class="antigram-pill ruled">anti-'+ag+' · cells '+a.evidence[ag].join(', ')+'</span>';}).join(' '):'No specificity meets the two-cell study rule yet.')+'<h3 style="margin-top:16px">Still left</h3>'+a.left.map(function(ag){return '<span class="antigram-pill left">anti-'+ag+'</span>';}).join(' ')+'<p class="antigram-personal-note">Remaining possibilities are not an antibody identification.</p>'+(personalAntigramMode==='practice'?'<details><summary>Practice answer</summary><p>This example was constructed with anti-E reactivity. Other listed possibilities still need appropriate exclusion evidence.</p></details>':'')+'</div>':'';
}
