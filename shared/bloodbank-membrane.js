/* Educational membrane schematics. Carrier classes and representative antigens
   are sourced in the UI; relative dimensions and spacing are not to scale. */
const RBC_MEMBRANE_REFERENCES = [
  {label:'NCBI · Blood Groups and Red Cell Antigens',url:'https://www.ncbi.nlm.nih.gov/books/NBK2261/'},
  {label:'NCBI · ABO and H molecular structures',url:'https://www.ncbi.nlm.nih.gov/books/NBK2267/'},
  {label:'ISBT · Blood group systems',url:'https://www.isbtweb.org/resource/tableofbloodgroupsystems.html'},
  {label:'Carrier proteins · peer-reviewed review',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'}
];
const RBC_MEMBRANE_SYSTEMS = [
  {id:'abo',name:'ABO / H',carrier:'Surface glycan on lipid or protein',kind:'glycan',variants:[['o','O (H)','H precursor remains unmodified by ABO transferase. Fucose is present.'],['a','A','A transferase adds terminal N-acetylgalactosamine (GalNAc) to H.'],['b','B','B transferase adds terminal galactose (Gal) to H.'],['ab','AB','Separate A- and B-terminated chains coexist on the cell.'],['bombay','Bombay (Oh)','FUT1 deficiency: no H on RBCs, so no A or B can be expressed.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2267/'},
  {id:'lewis',name:'Lewis',carrier:'Adsorbed glycolipid',kind:'adsorbed',variants:[['lea','Leᵃ','Type 1 glycan with FUT3-dependent fucosylation.'],['leb','Leᵇ','Lewis glycan formed when FUT2 and FUT3 are active.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5061611/'},
  {id:'p1pk',name:'P1PK / GLOB',carrier:'Glycosphingolipid carbohydrate',kind:'glycan',variants:[['p1','P1','P1PK system: carbohydrate epitope on a glycosphingolipid.'],['pk','Pᵏ','P1PK system: Gb3 glycosphingolipid epitope.'],['glob','P (GLOB)','P antigen is carried on globoside in the separate GLOB system, shown here with P1PK because the study page groups them.']],source:'https://www.isbtweb.org/resource/tableofbloodgroupsystems.html'},
  {id:'gpa',name:'M / N · GPA',carrier:'Glycophorin A (GYPA)',kind:'glycophorin',variants:[['m','M','M determinant on the extracellular N-terminus of GPA.'],['n','N','N determinant on the extracellular N-terminus of GPA.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2274/'},
  {id:'gpb',name:'S / s / U · GPB',carrier:'Glycophorin B (GYPB)',kind:'glycophorin',variants:[['s','S','S determinant on GPB.'],['small-s','s','s determinant on GPB.'],['u','U','High-prevalence GPB-associated determinant.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2274/'},
  {id:'mns',name:'MNS',carrier:'Glycophorin A and B',kind:'glycophorin',variants:[['m','M · GPA','M determinant on glycophorin A.'],['n','N · GPA','N determinant on glycophorin A.'],['s','S · GPB','S determinant on glycophorin B.'],['small-s','s · GPB','s determinant on glycophorin B.'],['u','U · GPB','High-prevalence GPB-associated determinant.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2274/'},
  {id:'gerbich',name:'Gerbich',carrier:'Glycophorin C / D (GYPC)',kind:'single',variants:[['ge2','Ge2','Representative Gerbich antigen on glycophorin C/D.'],['ge3','Ge3','Representative Gerbich antigen on glycophorin C/D.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'lw',name:'LW',carrier:'ICAM4 · single-pass',kind:'single',variants:[['lwa','LWᵃ','Representative LW antigen on ICAM4.'],['lwb','LWᵇ','Antithetical LW antigen on ICAM4.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'lutheran',name:'Lutheran',carrier:'BCAM / Lu · single-pass',kind:'single',variants:[['lua','Luᵃ','Lutheran antigen on BCAM.'],['lub','Luᵇ','Antithetical Lutheran antigen on BCAM.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'kell',name:'Kell',carrier:'KEL · type II single-pass',kind:'type2',variants:[['k','K','Kell K antigen on the KEL glycoprotein.'],['small-k','k','Antithetical k antigen on KEL.'],['kpa','Kpᵃ','Kpᵃ antigen on KEL.'],['kpb','Kpᵇ','Kpᵇ antigen on KEL.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2270/'},
  {id:'kx',name:'Kx',carrier:'XK · multipass; linked to Kell',kind:'multi',variants:[['kx','Kx','Kx is carried by XK, which is covalently linked to Kell.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2270/'},
  {id:'rh',name:'Rh',carrier:'RhD / RhCE · multipass',kind:'multi',variants:[['d','D','D antigen is carried by RhD.'],['c','C','C antigen is carried by RhCE.'],['small-c','c','c antigen is carried by RhCE.'],['e','E','E antigen is carried by RhCE.'],['small-e','e','e antigen is carried by RhCE.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2269/'},
  {id:'rhag',name:'RhAG',carrier:'Rh-associated glycoprotein · multipass',kind:'multi',variants:[['rhag','RhAG','RhAG supports expression of the Rh membrane complex; it is a separate blood group system.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'duffy',name:'Duffy',carrier:'ACKR1 · multipass chemokine receptor',kind:'multi',variants:[['fya','Fyᵃ','Duffy antigen on ACKR1.'],['fyb','Fyᵇ','Antithetical Duffy antigen on ACKR1.'],['fy3','Fy3','High-prevalence Duffy determinant.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2271/'},
  {id:'kidd',name:'Kidd',carrier:'SLC14A1 · multipass urea transporter',kind:'multi',variants:[['jka','Jkᵃ','Kidd antigen on the urea transporter.'],['jkb','Jkᵇ','Antithetical Kidd antigen.'],['jk3','Jk3','High-prevalence Kidd determinant.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2272/'},
  {id:'diego',name:'Diego',carrier:'Band 3 / SLC4A1 · multipass',kind:'multi',variants:[['dia','Diᵃ','Diego antigen on band 3.'],['dib','Diᵇ','Antithetical Diego antigen on band 3.']],source:'https://www.ncbi.nlm.nih.gov/books/NBK2273/'},
  {id:'colton',name:'Colton',carrier:'AQP1 · multipass water channel',kind:'multi',variants:[['coa','Coᵃ','Colton antigen on aquaporin-1.'],['cob','Coᵇ','Antithetical Colton antigen.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'indian',name:'Indian',carrier:'CD44 · single-pass',kind:'single',variants:[['ina','Inᵃ','Indian antigen on CD44.'],['inb','Inᵇ','Antithetical Indian antigen.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'scianna',name:'Scianna',carrier:'ERMAP · single-pass',kind:'single',variants:[['sc1','Sc1','Representative Scianna antigen on ERMAP.'],['sc2','Sc2','Antithetical Scianna antigen.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'dombrock',name:'Dombrock',carrier:'ART4 · GPI-anchored',kind:'gpi',variants:[['doa','Doᵃ','Dombrock antigen on ART4.'],['dob','Doᵇ','Antithetical Dombrock antigen.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'cartwright',name:'Cartwright / Yt',carrier:'AChE · GPI-anchored',kind:'gpi',variants:[['yta','Ytᵃ','Cartwright antigen on acetylcholinesterase.'],['ytb','Ytᵇ','Antithetical Cartwright antigen.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'cromer',name:'Cromer',carrier:'CD55 · GPI-anchored',kind:'gpi',variants:[['cra','Crᵃ','High-prevalence Cromer antigen on CD55.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'},
  {id:'jmh',name:'JMH',carrier:'SEMA7A · GPI-anchored',kind:'gpi',variants:[['jmh','JMH','High-prevalence JMH antigen on SEMA7A.']],source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7226767/'}
];

function rbcMembraneEsc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
function rbcHasVisualVariants(id){return id==='abo'||id==='lewis'||id==='p1pk';}
function rbcMembraneBilayer(width,top,bottom){
  let heads='';for(let x=12;x<width-8;x+=16){heads+='<circle cx="'+x+'" cy="'+top+'" r="7" fill="#819096" stroke="#5c6c74"/><circle cx="'+x+'" cy="'+bottom+'" r="7" fill="#819096" stroke="#5c6c74"/><path d="M'+(x-3)+' '+(top+7)+' V'+(bottom-7)+' M'+(x+3)+' '+(top+7)+' V'+(bottom-7)+'" stroke="#9eaaad" stroke-width="2" opacity=".7"/>';}
  return '<rect x="0" y="'+top+'" width="'+width+'" height="'+(bottom-top)+'" fill="#eef2f1"/>'+heads+'<path d="M0 '+(bottom+44)+' Q110 '+(bottom+9)+' 220 '+(bottom+44)+' T440 '+(bottom+44)+' T660 '+(bottom+44)+' T880 '+(bottom+44)+' T1100 '+(bottom+44)+' T1320 '+(bottom+44)+' T1540 '+(bottom+44)+' T1760 '+(bottom+44)+' T1980 '+(bottom+44)+' T2200 '+(bottom+44)+' T2640 '+(bottom+44)+' T3200 '+(bottom+44)+'" fill="none" stroke="#d08a48" stroke-width="5" opacity=".8"/>';
}
function rbcGlycanGlyph(x,y,variant){
  const base='<path d="M'+x+' '+(y+85)+' V'+(y+27)+'" stroke="#365f88" stroke-width="5" fill="none"/><g class="rbc-sugar"><title>N-acetylglucosamine (GlcNAc): type 2 chain precursor</title><rect x="'+(x-8)+'" y="'+(y+18)+'" width="16" height="16" rx="3" fill="#548cbe" stroke="#35678f"/></g><g class="rbc-sugar"><title>Galactose (Gal): type 2 chain precursor</title><circle cx="'+x+'" cy="'+(y+5)+'" r="8" fill="#f5d65b" stroke="#ad903c"/></g>';
  if(variant==='bombay')return base+'<text x="'+(x+18)+'" y="'+(y+12)+'" fill="#56646b" font-size="11">No H · FUT1 inactive</text>';
  const h='<path d="M'+x+' '+(y+5)+' l-21 -20" stroke="#b66539" stroke-width="3"/><g class="rbc-sugar"><title>Fucose (Fuc): FUT1 adds this sugar to make H on RBCs</title><circle cx="'+(x-22)+'" cy="'+(y-17)+'" r="8" fill="#e79354" stroke="#ae6635"/></g>';
  const a='<path d="M'+x+' '+(y+5)+' l21 -20" stroke="#ba2354" stroke-width="3"/><g class="rbc-sugar"><title>N-acetylgalactosamine (GalNAc): A transferase adds this terminal sugar</title><rect x="'+(x+14)+'" y="'+(y-25)+'" width="16" height="16" rx="3" fill="#ca3a68"/></g>';
  const b='<path d="M'+x+' '+(y+5)+' l21 -20" stroke="#3a8a55" stroke-width="3"/><g class="rbc-sugar"><title>Galactose (Gal): B transferase adds this terminal sugar</title><circle cx="'+(x+22)+'" cy="'+(y-17)+'" r="8" fill="#49aa68" stroke="#2c7844"/></g>';
  return base+h+(variant==='a'?a:variant==='b'?b:'');
}
function rbcLewisGlyph(x,top,variant){
  const y=top-52,leB=variant==='leb';
  return '<path d="M'+x+' '+(top+7)+' V'+(y+17)+'" stroke="#cf933c" stroke-width="5" stroke-dasharray="5 4"/>'+
    '<g class="rbc-sugar"><title>GlcNAc · N-acetylglucosamine, type 1 chain</title><rect x="'+(x-7)+'" y="'+(y+8)+'" width="14" height="14" fill="#548cbe"/></g><path d="M'+x+' '+(y+8)+' V'+(y-6)+'" stroke="#c89952" stroke-width="3"/>'+
    '<g class="rbc-sugar"><title>Gal · galactose, type 1 chain</title><circle cx="'+x+'" cy="'+(y-10)+'" r="7" fill="#f5d65b"/></g><path d="M'+x+' '+(y+16)+' l-21 -11" stroke="#b66539" stroke-width="3"/>'+
    '<g class="rbc-sugar"><title>Fuc · fucose added by FUT3 to form Lewis antigen</title><circle cx="'+(x-22)+'" cy="'+(y+4)+'" r="7" fill="#e79354"/></g>'+
    (leB?'<path d="M'+x+' '+(y-10)+' l20 -14" stroke="#b66539" stroke-width="3"/><g class="rbc-sugar"><title>Fuc · additional fucose added by FUT2 to form Leᵇ</title><circle cx="'+(x+21)+'" cy="'+(y-25)+'" r="7" fill="#e79354"/></g>':'');
}
function rbcP1Glyph(x,top,variant){
  const extra=variant==='glob'?'<g class="rbc-sugar"><title>GalNAc · added to Pᵏ to form P (GLOB)</title><rect x="'+(x-7)+'" y="'+(top-89)+'" width="14" height="14" rx="3" fill="#ca3a68"/></g>':variant==='p1'?'<g class="rbc-sugar"><title>Gal · terminal galactose on P1 chain</title><circle cx="'+x+'" cy="'+(top-83)+'" r="7" fill="#49aa68"/></g>':'';
  return '<path d="M'+x+' '+(top+8)+' V'+(top-49)+'" stroke="#626a70" stroke-width="5"/>'+
    '<g class="rbc-sugar"><title>Glc · glucose in glycosphingolipid chain</title><circle cx="'+x+'" cy="'+(top-53)+'" r="7" fill="#548cbe"/></g><path d="M'+x+' '+(top-60)+' V'+(top-69)+'" stroke="#626a70" stroke-width="3"/>'+
    '<g class="rbc-sugar"><title>Gal · galactose of Pᵏ (Gb3) chain</title><circle cx="'+x+'" cy="'+(top-73)+'" r="7" fill="#f5d65b"/></g>'+extra;
}
function rbcCarrierGlyph(item,x,top,bottom,variant){
  const c=item.id==='abo'?'#c0173d':item.kind==='gpi'?'#8754a5':item.kind==='glycophorin'?'#bb693b':item.kind==='multi'?'#357aa2':'#497b78';
  if(item.id==='abo')return rbcGlycanGlyph(x,top-83,variant||'o');
  if(item.id==='lewis')return rbcLewisGlyph(x,top,variant||'lea');
  if(item.id==='p1pk')return rbcP1Glyph(x,top,variant||'p1');
  if(item.kind==='glycan'||item.kind==='adsorbed')return '<path d="M'+x+' '+(top-52)+' V'+(top+7)+'" stroke="'+c+'" stroke-width="5" stroke-dasharray="'+(item.kind==='adsorbed'?'5 4':'')+'"/><circle cx="'+x+'" cy="'+(top-60)+'" r="8" fill="#e4a650"/><path d="M'+x+' '+(top-39)+' l-20 -20 M'+x+' '+(top-31)+' l19 -22" stroke="'+c+'" stroke-width="3"/><circle cx="'+(x-20)+'" cy="'+(top-59)+'" r="5" fill="#e4a650"/><circle cx="'+(x+19)+'" cy="'+(top-53)+'" r="5" fill="#a44887"/>';
  if(item.kind==='multi')return '<path d="M'+(x-25)+' '+(bottom+12)+' V'+(top-11)+' Q'+(x-18)+' '+(top-38)+' '+(x-10)+' '+(top-11)+' V'+(bottom+8)+' Q'+x+' '+(bottom+30)+' '+(x+1)+' '+(bottom+7)+' V'+(top-13)+' Q'+(x+10)+' '+(top-36)+' '+(x+17)+' '+(top-11)+' V'+(bottom+12)+'" fill="none" stroke="'+c+'" stroke-width="8" stroke-linecap="round"/><path d="M'+(x-18)+' '+(top-35)+' Q'+x+' '+(top-57)+' '+(x+17)+' '+(top-35)+'" fill="none" stroke="'+c+'" stroke-width="3"/>'+(item.id==='rh'||item.id==='kx'?'':'<path d="M'+x+' '+(top-45)+' l0 -18 l-11 -10 m11 10 l12 -10" stroke="#9e5791" stroke-width="3" fill="none"/><circle cx="'+(x-11)+'" cy="'+(top-73)+'" r="5" fill="#b774ae"/><circle cx="'+(x+12)+'" cy="'+(top-73)+'" r="5" fill="#b774ae"/>');
  if(item.kind==='gpi')return '<path d="M'+x+' '+(top-9)+' V'+(top-66)+'" stroke="'+c+'" stroke-width="7" stroke-linecap="round"/><ellipse cx="'+x+'" cy="'+(top-76)+'" rx="18" ry="9" fill="'+c+'" opacity=".5"/><path d="M'+x+' '+(top-7)+' l18 9" stroke="#c9924c" stroke-width="4"/><circle cx="'+(x+18)+'" cy="'+(top+2)+'" r="5" fill="#c9924c"/>';
  const domains=item.kind==='type2'?'<ellipse cx="'+x+'" cy="'+(top-79)+'" rx="24" ry="13" fill="'+c+'" opacity=".55"/>':'<ellipse cx="'+x+'" cy="'+(top-75)+'" rx="19" ry="11" fill="'+c+'" opacity=".55"/><ellipse cx="'+x+'" cy="'+(top-54)+'" rx="17" ry="9" fill="'+c+'" opacity=".35"/>';
  const branches=item.kind==='glycophorin'?'<path d="M'+x+' '+(top-60)+' l-21 -21 M'+x+' '+(top-48)+' l22 -21" stroke="#ca7849" stroke-width="3"/><circle cx="'+(x-21)+'" cy="'+(top-81)+'" r="6" fill="#e79d58"/><circle cx="'+(x+22)+'" cy="'+(top-69)+'" r="6" fill="#e79d58"/>':'';
  return '<path d="M'+x+' '+(bottom+20)+' V'+(top-42)+'" stroke="'+c+'" stroke-width="10" stroke-linecap="round"/>'+domains+branches;
}
function buildRbcMembraneAtlas(options){
  options=options||{};const fullItems=RBC_MEMBRANE_SYSTEMS.filter(function(item){return item.id!=='mns';}),atlasItems=options.range?fullItems.slice(options.range[0],options.range[1]):fullItems,pitch=138,width=atlasItems.length*pitch+140,top=183,bottom=245;
  let loci='';atlasItems.forEach(function(item,i){
    const x=140+i*pitch,labelY=i%2?62:42,variant=item.variants[0][0],interactive=!options.exportMode&&rbcHasVisualVariants(item.id);
    const controls=interactive?' tabindex="0" role="button" aria-label="Compare '+rbcMembraneEsc(item.name)+' structures" onclick="openRbcMembraneDetail(\''+item.id+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openRbcMembraneDetail(\''+item.id+'\')}"':'';
    loci+='<g'+controls+' class="rbc-atlas-locus"><path d="M'+x+' '+(labelY+7)+' V'+(top-103)+'" stroke="#bdc8c7" stroke-dasharray="4 4"/><text x="'+x+'" y="'+labelY+'" text-anchor="middle" fill="#4d1830" font-family="Arial" font-size="17" font-weight="700">'+rbcMembraneEsc(item.name)+'</text>'+rbcCarrierGlyph(item,x,top,bottom,variant)+
      (rbcHasVisualVariants(item.id)?'<circle cx="'+x+'" cy="'+(top-105)+'" r="10" fill="#fff" stroke="#c0173d" stroke-width="2"/><text x="'+x+'" y="'+(top-101)+'" text-anchor="middle" fill="#c0173d" font-family="Arial" font-size="13" font-weight="700">+</text>':'')+
      '<text x="'+x+'" y="323" text-anchor="middle" fill="#596a6b" font-family="Arial" font-size="11">'+rbcMembraneEsc(item.carrier.split(' · ')[0])+'</text></g>';
  });
  function association(a,b,label){const left=atlasItems.findIndex(function(item){return item.id===a;}),right=atlasItems.findIndex(function(item){return item.id===b;});if(left<0||right<0)return '';const x1=140+left*pitch+33,x2=140+right*pitch-33;return '<path d="M'+x1+' 160 H'+x2+'" stroke="#996b8a" stroke-width="2" stroke-dasharray="3 3"/><text x="'+((x1+x2)/2)+'" y="151" text-anchor="middle" fill="#83516f" font-family="Arial" font-size="10" font-weight="700">'+label+'</text>';}
  return '<svg class="rbc-membrane-atlas" viewBox="0 0 '+width+' 370" width="'+width+'" height="370" role="img" aria-label="One continuous red blood cell membrane showing representative blood group antigen carriers; click a system for alternatives" xmlns="http://www.w3.org/2000/svg"><rect width="'+width+'" height="370" fill="#fffdfa"/><text x="12" y="151" fill="#806670" font-family="Arial" font-size="11" font-weight="700">EXTRACELLULAR</text>'+rbcMembraneBilayer(width,top,bottom)+association('kell','kx','S–S')+association('rh','rhag','complex')+loci+'<text x="24" y="355" fill="#806670" font-family="Arial" font-size="14" font-weight="700">CYTOPLASM · SPECTRIN NETWORK</text></svg>';
}
function buildRbcMembraneFocus(id,variant){
  const item=RBC_MEMBRANE_SYSTEMS.find(function(entry){return entry.id===id;});if(!item)return '';
  const t=164,b=222;let glyph='';
  if(id==='abo'&&variant==='ab')glyph=rbcCarrierGlyph(item,148,t,b,'a')+rbcCarrierGlyph(item,302,t,b,'b');
  else if(id==='mns')glyph=rbcCarrierGlyph(RBC_MEMBRANE_SYSTEMS.find(function(entry){return entry.id==='gpa';}),150,t,b,variant)+rbcCarrierGlyph(RBC_MEMBRANE_SYSTEMS.find(function(entry){return entry.id==='gpb';}),300,t,b,variant)+'<text x="150" y="83" text-anchor="middle" fill="#844426" font-size="13" font-family="Arial" font-weight="700">GPA · M/N</text><text x="300" y="83" text-anchor="middle" fill="#844426" font-size="13" font-family="Arial" font-weight="700">GPB · S/s/U</text>';
  else glyph=rbcCarrierGlyph(item,225,t,b,variant);
  const enzymeLabel=id==='abo'?'FUT1 → RBC H  ·  FUT2 → secretions':id==='lewis'?'FUT3 → Leᵃ  ·  FUT2 + FUT3 → Leᵇ':'';
  return '<svg class="rbc-membrane-focus" viewBox="0 0 450 300" role="img" aria-label="'+rbcMembraneEsc(item.name)+' carrier in the red cell membrane" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="300" fill="#fffdfa"/><text x="20" y="34" fill="#765f67" font-family="Arial" font-size="12" font-weight="700">EXTRACELLULAR</text>'+(enzymeLabel?'<text x="20" y="53" fill="#865568" font-family="Arial" font-size="12" font-weight="700">'+enzymeLabel+'</text>':'')+rbcMembraneBilayer(450,t,b)+glyph+'<text x="20" y="285" fill="#765f67" font-family="Arial" font-size="12" font-weight="700">CYTOPLASM</text></svg>';
}
function buildRbcSystemDetailSummary(id){
  const item=RBC_MEMBRANE_SYSTEMS.find(function(entry){return entry.id===id;});if(!item)return '';
  const art=buildRbcMembraneFocus(id,item.variants[0][0])+'<strong>'+rbcMembraneEsc(item.carrier)+'</strong>';
  if(rbcHasVisualVariants(id))return '<button type="button" class="rbc-system-open" onclick="openRbcMembraneDetail(\''+id+'\')" aria-label="Compare '+rbcMembraneEsc(item.name)+' structures">'+art+'<span>Compare structures ↗</span></button>';
  return '<div class="rbc-system-open">'+art+'<span class="rbc-static-variants">'+item.variants.map(function(option){return rbcMembraneEsc(option[1]);}).join(' · ')+'</span></div>';
}
function openRbcMembraneDetail(id,variant){
  const item=RBC_MEMBRANE_SYSTEMS.find(function(entry){return entry.id===id;});if(!item)return;
  if(!rbcHasVisualVariants(id))return;
  variant=variant||item.variants[0][0];const chosen=item.variants.find(function(entry){return entry[0]===variant;})||item.variants[0];
  let dialog=document.getElementById('rbcMembraneDetail');if(!dialog){dialog=document.createElement('dialog');dialog.id='rbcMembraneDetail';dialog.className='rbc-membrane-dialog';document.body.appendChild(dialog);}
  dialog.innerHTML='<form method="dialog"><button class="rbc-dialog-close" aria-label="Close antigen detail">×</button></form><div class="rbc-dialog-eyebrow">RBC MEMBRANE · '+rbcMembraneEsc(item.carrier)+'</div><h3>'+rbcMembraneEsc(item.name)+'</h3><div class="rbc-variant-tabs" role="group" aria-label="'+rbcMembraneEsc(item.name)+' antigen variants">'+item.variants.map(function(option){return '<button type="button" aria-pressed="'+(option[0]===chosen[0])+'" onclick="openRbcMembraneDetail(\''+id+'\',\''+option[0]+'\')">'+rbcMembraneEsc(option[1])+'</button>';}).join('')+'</div>'+buildRbcMembraneFocus(id,chosen[0])+'<div class="rbc-variant-copy"><strong>'+rbcMembraneEsc(chosen[1])+'</strong><p>'+rbcMembraneEsc(chosen[2])+'</p></div>'+(id==='abo'?'<p class="rbc-glycan-note">Hover over each colored sugar for its name. Type 2 H is shown.</p>':'')+'<p class="rbc-diagram-caveat">Schematic · not to scale.</p>';
  if(!dialog.open)dialog.showModal();
}
