/* Lay out a directed graph in aligned rows, placing joins below every incoming branch. */
function layoutBloodBankFlow(container){
  var stage=container.querySelector('.flow-tree');if(!stage)return;
  var oldZoom=stage.style.zoom;stage.style.zoom='1';
  var ids=[],elements={},out={},incoming={},rank={},gray={},done={};
  stage.querySelectorAll('[data-flow-node-id]').forEach(function(el){var id=el.dataset.flowNodeId;ids.push(id);elements[id]=el.closest('.flow-node-wrap');out[id]=[];incoming[id]=[];rank[id]=0;});
  container.querySelectorAll('.flow-link-marker').forEach(function(m){var a=m.dataset.flowLinkFrom,b=m.dataset.flowLinkTo;if(out[a]&&out[b])out[a].push(b);});
  // Back edges still draw, but must not increase rank forever.
  function visit(id){gray[id]=true;out[id].forEach(function(to){if(gray[to])return;incoming[to].push(id);if(!done[to])visit(to);});gray[id]=false;done[id]=true;}
  ids.forEach(function(id){if(!done[id])visit(id);});
  var remaining={};ids.forEach(function(id){remaining[id]=incoming[id].length;});
  var queue=ids.filter(function(id){return !remaining[id];});
  for(var q=0;q<queue.length;q++){var id=queue[q];ids.forEach(function(to){if(incoming[to].indexOf(id)<0)return;rank[to]=Math.max(rank[to],rank[id]+1);remaining[to]--;if(!remaining[to])queue.push(to);});}
  var rows=[];ids.forEach(function(id){(rows[rank[id]]||(rows[rank[id]]=[])).push(id);});
  var center={},sizes={},span={},width=0;
  ids.forEach(function(id){var el=elements[id];el.style.left='0';el.style.top='0';var r=el.getBoundingClientRect();sizes[id]={width:Math.max(r.width,240),height:Math.max(r.height,62)};});
  var pitch=Math.max.apply(null,ids.map(function(id){return sizes[id].width;}))+65;
  // Reserve full branch widths until a real join; singleton rows keep their lane.
  function branchSpan(id){if(span[id])return span[id];span[id]=1;var children=out[id].filter(function(to){return rank[to]>rank[id]&&incoming[to].length===1;});return span[id]=Math.max(1,children.reduce(function(sum,to){return sum+branchSpan(to);},0));}
  ids.forEach(branchSpan);
  rows.forEach(function(row){row.forEach(function(id){
    if(center[id]===undefined){var parents=incoming[id];center[id]=parents.length?parents.reduce(function(sum,p){return sum+center[p];},0)/parents.length:0;}
    var children=out[id].filter(function(to){return rank[to]>rank[id]&&incoming[to].length===1;});
    var total=children.reduce(function(sum,to){return sum+span[to];},0),left=center[id]-total*pitch/2;
    children.forEach(function(to){center[to]=left+span[to]*pitch/2;left+=span[to]*pitch;});
  });});
  var minX=Math.min.apply(null,ids.map(function(id){return center[id]-sizes[id].width/2;}));
  var y=35;
  rows.forEach(function(row){var h=0;row.forEach(function(id){var el=elements[id],x=center[id]-sizes[id].width/2-minX+50;el.style.left=x+'px';el.style.top=y+'px';width=Math.max(width,x+sizes[id].width+50);h=Math.max(h,sizes[id].height);});y+=h+85;});
  stage.style.width=width+'px';stage.style.height=(y-35)+'px';stage.style.zoom=oldZoom;
}

/* Orthogonal connectors shared by the editor and standalone PDF export. */
function routeBloodBankFlow(container) {
  var layer=container.querySelector('.flow-link-layer');
  if(!layer)return [];
  var origin=container.getBoundingClientRect(),nodes={},targets=[];
  var zoom=parseFloat(getComputedStyle(container.querySelector('.flow-tree')).zoom)||1;
  var gap=Math.max(3,10*zoom);
  function rect(el){var r=el.getBoundingClientRect();return {left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top};}
  container.querySelectorAll('[data-flow-node-id]').forEach(function(el){nodes[el.dataset.flowNodeId]=rect(el);nodes[el.dataset.flowNodeId].decision=el.classList.contains('question');});
  var obstacles=Array.from(container.querySelectorAll('.flow-node,.flow-note-card')).map(function(el){var r=rect(el);return {left:r.left-gap/2,right:r.right+gap/2,top:r.top-gap/2,bottom:r.bottom+gap/2};});
  function clear(a,b){return !obstacles.some(function(r){return a.x===b.x ? a.x>r.left&&a.x<r.right&&Math.max(a.y,b.y)>r.top&&Math.min(a.y,b.y)<r.bottom : a.y>r.top&&a.y<r.bottom&&Math.max(a.x,b.x)>r.left&&Math.min(a.x,b.x)<r.right;});}
  function route(start,end,join){
    var bus={x:start.x,y:end.y};if(join&&end.y>start.y&&clear(start,bus)&&clear(bus,end))return [start,bus,end];
    var middle=(start.y+end.y)/2,p1={x:start.x,y:middle},p2={x:end.x,y:middle};
    if(end.y>start.y&&clear(start,p1)&&clear(p1,p2)&&clear(p2,end))return [start,p1,p2,end];
    if(clear(start,{x:start.x,y:end.y})&&clear({x:start.x,y:end.y},end))return [start,{x:start.x,y:end.y},end];
    if(clear(start,{x:end.x,y:start.y})&&clear({x:end.x,y:start.y},end))return [start,{x:end.x,y:start.y},end];
    var xs=[start.x,end.x,gap],ys=[start.y,end.y,gap];
    obstacles.forEach(function(r){xs.push(r.left-gap,r.right+gap);ys.push(r.top-gap,r.bottom+gap);});
    xs=Array.from(new Set(xs)).sort(function(a,b){return a-b;});ys=Array.from(new Set(ys)).sort(function(a,b){return a-b;});
    var nx=xs.length,ny=ys.length,startId=ys.indexOf(start.y)*nx+xs.indexOf(start.x),endId=ys.indexOf(end.y)*nx+xs.indexOf(end.x);
    var costs=new Map(),previous=new Map(),heap=[];
    function push(item){heap.push(item);var i=heap.length-1;while(i){var p=(i-1)>>1;if(heap[p].score<=item.score)break;heap[i]=heap[p];i=p;}heap[i]=item;}
    function pop(){var first=heap[0],last=heap.pop();if(heap.length){var i=0;while(i*2+1<heap.length){var child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
    function point(id){return {x:xs[id%nx],y:ys[Math.floor(id/nx)]};}
    var initial=startId*3;costs.set(initial,0);push({key:initial,cost:0,score:0});
    while(heap.length){
      var current=pop(),key=current.key,id=Math.floor(key/3),dir=key%3;
      if(current.cost!==costs.get(key))continue;
      if(id===endId){var path=[];for(var k=key;k!==undefined;k=previous.get(k))path.push(point(Math.floor(k/3)));return path.reverse();}
      var x=id%nx,y=Math.floor(id/nx),a=point(id),neighbors=[];
      if(x>0)neighbors.push([id-1,1]);if(x+1<nx)neighbors.push([id+1,1]);if(y>0)neighbors.push([id-nx,2]);if(y+1<ny)neighbors.push([id+nx,2]);
      neighbors.forEach(function(next){var b=point(next[0]);if(!clear(a,b))return;var nk=next[0]*3+next[1],cost=current.cost+Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+(dir&&dir!==next[1]?gap*2:0);if(cost>=(costs.has(nk)?costs.get(nk):Infinity))return;costs.set(nk,cost);previous.set(nk,key);push({key:nk,cost:cost,score:cost+Math.abs(end.x-b.x)+Math.abs(end.y-b.y)});});
    }
    return null;
  }
  var width=Math.max(container.scrollWidth,origin.width,1),height=Math.max(container.scrollHeight,origin.height,1);
  layer.setAttribute('viewBox','0 0 '+width+' '+height);layer.setAttribute('width',width);layer.setAttribute('height',height);layer.style.width=width+'px';layer.style.height=height+'px';
  // Use a separate marker per canvas so multi-page exports remain self-contained.
  var marker='flow-arrow-'+(container.dataset.routeId||(container.dataset.routeId=Math.random().toString(36).slice(2)));
  var html='<defs><marker id="'+marker+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c0173d"/></marker></defs>';
  container.querySelectorAll('.flow-link-marker').forEach(function(m){
    var from=m.dataset.flowLinkFrom,to=m.dataset.flowLinkTo,a=nodes[from],b=nodes[to];if(!a||!b)return;
    var source={x:(a.left+a.right)/2,y:a.bottom},start={x:(a.left+a.right)/2,y:a.bottom+gap},end={x:(b.left+b.right)/2,y:b.top-gap};
    if(a.decision&&Math.abs(end.x-start.x)>a.right-a.left){var direction=end.x<start.x?-1:1;source={x:direction<0?a.left:a.right,y:(a.top+a.bottom)/2};start={x:source.x+direction*gap,y:source.y};}
    var join=Array.from(container.querySelectorAll('.flow-link-marker')).filter(function(link){return link.dataset.flowLinkTo===to;}).length>1;
    if(join){var parents=Array.from(container.querySelectorAll('.flow-link-marker')).filter(function(link){return link.dataset.flowLinkTo===to;}).map(function(link){return nodes[link.dataset.flowLinkFrom];}).filter(Boolean);var lowest=Math.max.apply(null,parents.map(function(p){return p.bottom;}));if(lowest<b.top-gap*2)end.y=(lowest+b.top)/2;}
    var points=route(start,end,join);if(!points)return;
    points.unshift(source);points.push({x:end.x,y:b.top});
    // Remove collinear points while preserving turns for hit testing.
    points=points.filter(function(p,i,all){if(i===0||i===all.length-1)return true;var a=all[i-1],b=all[i+1];return !((a.x===p.x&&p.x===b.x)||(a.y===p.y&&p.y===b.y));});
    var d=points.map(function(p,i){return (i?'L ':'M ')+p.x.toFixed(2)+' '+p.y.toFixed(2);}).join(' ');
    html+='<path class="flow-link-path'+(m.dataset.selected==='true'?' selected':'')+'" style="stroke-width:'+Math.max(.6,2.4*zoom)+'" d="'+d+'" marker-end="url(#'+marker+')"/>';
    targets.push({from:from,branchId:m.dataset.branchId,points:points});
    if(m.dataset.label && m.dataset.label.toLowerCase()!=='next'){
      var best=0;for(var i=1;i<points.length;i++){if(Math.abs(points[i].x-points[i-1].x)>best){best=Math.abs(points[i].x-points[i-1].x);var labelX=(points[i].x+points[i-1].x)/2,labelY=points[i].y-5;}}
      if(!best && points.length>1){labelX=points[0].x+14*zoom;labelY=(points[0].y+points[1].y)/2;}
      {var text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',labelX);text.setAttribute('y',labelY);text.setAttribute('text-anchor','middle');text.setAttribute('class','flow-route-label');text.setAttribute('style','font-size:'+(11*zoom)+'px;stroke-width:'+(4*zoom)+'px');text.textContent=m.dataset.label||'Next';html+=text.outerHTML;}
    }
  });
  layer.innerHTML=html;return targets;
}
