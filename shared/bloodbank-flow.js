/* Lay out a directed graph in aligned rows, placing joins below every incoming branch. */
function layoutBloodBankFlow(container,options){
  options=options||{};
  var compact=options.compact===true;
  var horizontalGap=compact?54:78;
  var verticalGap=compact?76:102;
  var topInset=compact?18:35;
  var sideInset=compact?20:50;
  var stage=container.querySelector('.flow-tree');if(!stage)return;
  var oldZoom=stage.style.zoom;stage.style.zoom='1';
  var ids=[],elements={},out={},incoming={},rank={},gray={},done={};
  stage.querySelectorAll('[data-flow-node-id]').forEach(function(el){var id=el.dataset.flowNodeId;ids.push(id);elements[id]=el.closest('.flow-node-wrap');out[id]=[];incoming[id]=[];rank[id]=0;});
  container.querySelectorAll('.flow-link-marker').forEach(function(m){var a=m.dataset.flowLinkFrom,b=m.dataset.flowLinkTo;if(out[a]&&out[b]&&out[a].indexOf(b)<0)out[a].push(b);});
  // Back edges still draw, but must not increase rank forever.
  function visit(id){gray[id]=true;out[id].forEach(function(to){if(gray[to])return;incoming[to].push(id);if(!done[to])visit(to);});gray[id]=false;done[id]=true;}
  ids.forEach(function(id){if(!done[id])visit(id);});
  var remaining={};ids.forEach(function(id){remaining[id]=incoming[id].length;});
  var queue=ids.filter(function(id){return !remaining[id];});
  for(var q=0;q<queue.length;q++){var id=queue[q];ids.forEach(function(to){if(incoming[to].indexOf(id)<0)return;rank[to]=Math.max(rank[to],rank[id]+1);remaining[to]--;if(!remaining[to])queue.push(to);});}
  var rows=[];ids.forEach(function(id){(rows[rank[id]]||(rows[rank[id]]=[])).push(id);});
  var center={},anchor={},sizes={},width=0;
  ids.forEach(function(id){var el=elements[id];el.style.left='0';el.style.top='0';var r=el.getBoundingClientRect();sizes[id]={width:Math.max(r.width,240),height:Math.max(r.height,62)};});
  var pitch=Math.max.apply(null,ids.map(function(id){return sizes[id].width;}))+horizontalGap;
  rows.forEach(function(row){
    row.forEach(function(id){
      var parents=incoming[id];
      if(!parents.length){anchor[id]=center[id]=row.indexOf(id)*pitch;return;}
      anchor[id]=parents.reduce(function(sum,p){return sum+center[p];},0)/parents.length;
      center[id]=anchor[id];
      if(parents.length===1){
        var siblings=out[parents[0]].filter(function(to){return rank[to]===rank[id]&&incoming[to].length===1;});
        center[id]+=(siblings.indexOf(id)-(siblings.length-1)/2)*pitch;
      }
    });
    // Match each row's order to its incoming connections before spacing boxes.
    // Otherwise independent links can be forced to cross between two rows.
    row.sort(function(a,b){return anchor[a]-anchor[b]||center[a]-center[b]||ids.indexOf(a)-ids.indexOf(b);});
    var wanted=row.reduce(function(sum,id){return sum+center[id];},0)/row.length;
    var rightEdge=-Infinity,rowGap=compact?18:24;
    row.forEach(function(id){
      var left=center[id]-sizes[id].width/2;
      if(left<rightEdge+rowGap)center[id]+=rightEdge+rowGap-left;
      rightEdge=center[id]+sizes[id].width/2;
    });
    var actual=row.reduce(function(sum,id){return sum+center[id];},0)/row.length;
    row.forEach(function(id){center[id]+=wanted-actual;});
  });
  // Center a parent over its immediate children. A one-child chain becomes a
  // straight vertical line; siblings form a balanced split under one stem.
  for(var rowIndex=rows.length-2;rowIndex>=0;rowIndex--){
    var upper=rows[rowIndex],upperGap=compact?18:24;
    upper.forEach(function(id){
      var children=out[id].filter(function(to){return rank[to]===rowIndex+1;});
      if(children.length)center[id]=children.reduce(function(sum,to){return sum+center[to];},0)/children.length;
    });
    upper.sort(function(a,b){return center[a]-center[b]||ids.indexOf(a)-ids.indexOf(b);});
    var edge=-Infinity;
    upper.forEach(function(id){var left=center[id]-sizes[id].width/2;if(left<edge+upperGap)center[id]+=edge+upperGap-left;edge=center[id]+sizes[id].width/2;});
  }
  var minX=Math.min.apply(null,ids.map(function(id){return center[id]-sizes[id].width/2;}));
  var y=topInset;
  rows.forEach(function(row){var h=0;row.forEach(function(id){var el=elements[id],x=center[id]-sizes[id].width/2-minX+sideInset;el.style.left=x+'px';el.style.top=y+'px';width=Math.max(width,x+sizes[id].width+sideInset);h=Math.max(h,sizes[id].height);});y+=h+verticalGap;});
  stage.style.width=width+'px';stage.style.height=(y-topInset)+'px';stage.style.zoom=oldZoom;
}

/* Orthogonal connectors shared by the editor and standalone PDF export. */
function routeBloodBankFlow(container) {
  var layer=container.querySelector('.flow-link-layer');
  if(!layer)return [];
  var origin=container.getBoundingClientRect(),nodes={},targets=[];
  var pageScale=origin.width/Math.max(container.offsetWidth,1);
  if(!isFinite(pageScale)||pageScale<=0)pageScale=1;
  var zoom=parseFloat(getComputedStyle(container.querySelector('.flow-tree')).zoom)||1;
  var gap=Math.max(3,10*zoom);
  function rect(el){var r=el.getBoundingClientRect();return {left:(r.left-origin.left)/pageScale,right:(r.right-origin.left)/pageScale,top:(r.top-origin.top)/pageScale,bottom:(r.bottom-origin.top)/pageScale};}
  container.querySelectorAll('[data-flow-node-id]').forEach(function(el){nodes[el.dataset.flowNodeId]=rect(el);nodes[el.dataset.flowNodeId].decision=el.classList.contains('question');});
  var obstacles=Array.from(container.querySelectorAll('.flow-node,.flow-note-card')).map(function(el){var r=rect(el);return {left:r.left-gap/2,right:r.right+gap/2,top:r.top-gap/2,bottom:r.bottom+gap/2};});
  function clear(a,b){return !obstacles.some(function(r){return a.x===b.x ? a.x>r.left&&a.x<r.right&&Math.max(a.y,b.y)>r.top&&Math.min(a.y,b.y)<r.bottom : a.y>r.top&&a.y<r.bottom&&Math.max(a.x,b.x)>r.left&&Math.min(a.x,b.x)<r.right;});}
  var occupied=[];
  function separate(points,from,shareSource){
    for(var i=1;i<points.length;i++){
      var a=points[i-1],b=points[i];
      for(var j=0;j<occupied.length;j++){
        if(shareSource&&occupied[j][2]===from)continue;
        var c=occupied[j][0],d=occupied[j][1];
        if(a.x===b.x&&c.x===d.x&&Math.abs(a.x-c.x)<gap&&Math.min(b.y,a.y)<Math.max(c.y,d.y)-gap&&Math.max(b.y,a.y)>Math.min(c.y,d.y)+gap)return false;
        if(a.y===b.y&&c.y===d.y&&Math.abs(a.y-c.y)<gap&&Math.min(b.x,a.x)<Math.max(c.x,d.x)-gap&&Math.max(b.x,a.x)>Math.min(c.x,d.x)+gap)return false;
        if(a.x===b.x&&c.y===d.y&&a.x>Math.min(c.x,d.x)+gap&&a.x<Math.max(c.x,d.x)-gap&&c.y>Math.min(a.y,b.y)+gap&&c.y<Math.max(a.y,b.y)-gap)return false;
        if(a.y===b.y&&c.x===d.x&&c.x>Math.min(a.x,b.x)+gap&&c.x<Math.max(a.x,b.x)-gap&&a.y>Math.min(c.y,d.y)+gap&&a.y<Math.max(c.y,d.y)-gap)return false;
      }
    }
    return true;
  }
  function route(start,end,join,from,shareSource){
    var bus={x:start.x,y:end.y};if(join&&end.y>start.y&&clear(start,bus)&&clear(bus,end))return [start,bus,end];
    // Prefer a single elbow when the direct corridor is open. Searching for
    // intermediate lanes first creates a needless short outward/backward jog.
    var direct={x:end.x,y:start.y};
    if(end.y>start.y&&clear(start,direct)&&clear(direct,end))return [start,direct,end];
    var middle=(start.y+end.y)/2,p1={x:start.x,y:middle},p2={x:end.x,y:middle};
    if(end.y>start.y){
      var lanes=[middle],step=Math.max(gap*1.5,12),count=Math.floor((end.y-start.y)/2/step);
      for(var lane=1;lane<=count;lane++){lanes.push(middle-lane*step,middle+lane*step);}
      for(var laneIndex=0;laneIndex<lanes.length;laneIndex++){
        p1={x:start.x,y:lanes[laneIndex]};p2={x:end.x,y:lanes[laneIndex]};
        var candidate=[start,p1,p2,end];
        if(clear(start,p1)&&clear(p1,p2)&&clear(p2,end)&&separate(candidate,from,shareSource))return candidate;
      }
    }
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
  var stage=container.querySelector('.flow-tree'),bounds=stage.getBoundingClientRect();
  var width=Math.max(container.clientWidth,(bounds.right-origin.left)/pageScale,1),height=Math.max(container.clientHeight,(bounds.bottom-origin.top)/pageScale,1);
  layer.setAttribute('viewBox','0 0 '+width+' '+height);layer.setAttribute('width',width);layer.setAttribute('height',height);layer.style.width=width+'px';layer.style.height=height+'px';
  // Use a separate marker per canvas so multi-page exports remain self-contained.
  var marker='flow-arrow-'+(container.dataset.routeId||(container.dataset.routeId=Math.random().toString(36).slice(2)));
  var html='<defs><marker id="'+marker+'" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c0173d"/></marker></defs>';
  var links=Array.from(container.querySelectorAll('.flow-link-marker')),incomingByTarget={},outgoingBySource={};
  links.forEach(function(m){var to=m.dataset.flowLinkTo,from=m.dataset.flowLinkFrom,parents=incomingByTarget[to]||(incomingByTarget[to]=[]),children=outgoingBySource[from]||(outgoingBySource[from]=[]);parents.push(m);children.push(m);});
  links.forEach(function(m){
    var from=m.dataset.flowLinkFrom,to=m.dataset.flowLinkTo,a=nodes[from],b=nodes[to];if(!a||!b)return;
    var parents=incomingByTarget[to].filter(function(parent){return nodes[parent.dataset.flowLinkFrom];}).sort(function(left,right){var x=nodes[left.dataset.flowLinkFrom],y=nodes[right.dataset.flowLinkFrom];return ((x.left+x.right)/2)-((y.left+y.right)/2);});
    var port=parents.indexOf(m),targetX=(b.left+b.right)/2,targetY=b.top;
    if(parents.length>1){
      targetX=b.left+(b.right-b.left)*(b.decision ? .22+.56*port/(parents.length-1) : .18+.64*port/(parents.length-1));
      if(b.decision)targetY=b.top+Math.abs(targetX-(b.left+b.right)/2)*(b.bottom-b.top)/(b.right-b.left);
    }
    // Leave a visible straight approach so the arrowhead is not attached to
    // the horizontal turn immediately above a destination box.
    var approach=Math.max(gap*4,24*zoom);
    var source={x:(a.left+a.right)/2,y:a.bottom},start={x:(a.left+a.right)/2,y:a.bottom+gap},end={x:targetX,y:b.top-approach},sideDirection=0;
    var children=outgoingBySource[from]||[];
    var bottomBranch=a.decision&&children.length===1&&Math.abs(end.x-start.x)<(a.right-a.left)*.35;
    if(a.decision&&!bottomBranch&&(children.length>1||Math.abs(end.x-start.x)>(a.right-a.left)*.35)){
      sideDirection=end.x<start.x?-1:1;
      source={x:sideDirection<0?a.left:a.right,y:(a.top+a.bottom)/2};
      if(sideDirection*(end.x-source.x)<gap*2){
        // An inward target would force a side connector to double back.
        // The lower point of the diamond is clearer in this tight case.
        sideDirection=0;bottomBranch=true;source={x:(a.left+a.right)/2,y:a.bottom};
        start={x:source.x,y:source.y+gap};
      }else start={x:source.x+sideDirection*gap,y:source.y};
    }
    if(sideDirection&&!clear(start,{x:end.x,y:start.y})){
      // A neighboring box blocks the simple side-to-down L. Leave from the
      // lower diamond point instead of drawing a short stair-step around it.
      sideDirection=0;bottomBranch=true;source={x:(a.left+a.right)/2,y:a.bottom};
      start={x:source.x,y:source.y+gap};
    }
    // A tiny last-second elbow looks like a stray arrow. When one connector is
    // already above the destination, bring it straight into the box instead.
    if(parents.length===1&&!b.decision&&Math.abs(start.x-end.x)<Math.max(28,gap*3)&&start.x>b.left+gap*2&&start.x<b.right-gap*2){targetX=end.x=start.x;}
    var sameRowSiblings=links.filter(function(link){var other=nodes[link.dataset.flowLinkTo];return link.dataset.flowLinkFrom===from&&other&&Math.abs(other.top-b.top)<gap*2;});
    var shareSource=!a.decision&&sameRowSiblings.length>1&&links.filter(function(link){return link.dataset.flowLinkFrom===from;}).length===sameRowSiblings.length;
    var points=route(start,end,false,from,shareSource);
    if(!points&&a.decision&&sideDirection){
      // A crowded side port can be boxed in by adjacent branches. The bottom
      // port keeps this connection visible without cutting through the node.
      sideDirection=0;source={x:(a.left+a.right)/2,y:a.bottom};start={x:source.x,y:source.y+gap};
      points=route(start,end,false,from,shareSource);
    }
    if(!points){m.dataset.routeMissing='true';return;}delete m.dataset.routeMissing;
    points.unshift(source);points.push({x:end.x,y:targetY});
    points=points.filter(function(p,i,all){return i===0||p.x!==all[i-1].x||p.y!==all[i-1].y;});
    var orthogonal=[];
    points.forEach(function(p){
      var previous=orthogonal[orthogonal.length-1];
      if(previous&&previous.x!==p.x&&previous.y!==p.y){
        var horizontal={x:p.x,y:previous.y},vertical={x:previous.x,y:p.y};
        orthogonal.push(clear(previous,horizontal)&&clear(horizontal,p)?horizontal:vertical);
      }
      orthogonal.push(p);
    });
    points=orthogonal;
    // Remove collinear points while preserving turns for hit testing.
    points=points.filter(function(p,i,all){if(i===0||i===all.length-1)return true;var a=all[i-1],b=all[i+1];return !((a.x===p.x&&p.x===b.x)||(a.y===p.y&&p.y===b.y));});
    for(var segment=1;segment<points.length;segment++)occupied.push([points[segment-1],points[segment],from]);
    var d=points.map(function(p,i){return (i?'L ':'M ')+p.x.toFixed(2)+' '+p.y.toFixed(2);}).join(' ');
    if(m.dataset.selected==='true')html+='<path d="'+d+'" fill="none" stroke="#ffcf00" stroke-width="'+Math.max(8,2.4*zoom+7)+'" stroke-linecap="round" stroke-linejoin="round"/>';
    html+='<path class="flow-link-path'+(m.dataset.selected==='true'?' selected':'')+'" style="stroke-width:'+Math.max(.6,2.4*zoom)+'" d="'+d+'" marker-end="url(#'+marker+')"/>';
    targets.push({from:from,branchId:m.dataset.branchId,points:points});
    if(m.dataset.label && m.dataset.label.toLowerCase()!=='next'){
      var best=0;for(var i=1;i<points.length;i++){if(Math.abs(points[i].x-points[i-1].x)>best){best=Math.abs(points[i].x-points[i-1].x);var labelX=(points[i].x+points[i-1].x)/2,labelY=points[i].y-5;}}
      if(a.decision&&sideDirection){labelX=source.x+sideDirection*Math.max(gap*4,32*zoom);labelY=source.y-7*zoom;}
      else if(a.decision&&bottomBranch){labelX=source.x+22*zoom;labelY=source.y+16*zoom;}
      else if(!best && points.length>1){labelX=points[0].x+14*zoom;labelY=(points[0].y+points[1].y)/2;}
      {var text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',labelX);text.setAttribute('y',labelY);text.setAttribute('text-anchor','middle');text.setAttribute('class','flow-route-label');text.setAttribute('style','font-size:'+(11*zoom)+'px;stroke-width:'+(4*zoom)+'px');text.textContent=m.dataset.label||'Next';html+=text.outerHTML;}
    }
  });
  layer.innerHTML=html;return targets;
}
