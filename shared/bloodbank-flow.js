/* Lay out a directed graph in aligned rows, placing joins below every incoming branch. */
function layoutBloodBankFlow(container,options){
  options=options||{};
  var compact=options.compact===true;
  var print=options.print===true;
  var horizontalGap=print?32:(compact?48:68);
  var verticalGap=print?48:(compact?72:92);
  var topInset=print?8:(compact?18:35);
  var sideInset=print?8:(compact?20:50);
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
  var center={},anchor={},sizes={},width=0,orderedBranchChild={};
  // Use the rendered width for centers; a minimum logical width made narrower
  // boxes look off-center even when their computed center coordinates matched.
  ids.forEach(function(id){var el=elements[id];el.style.left='0';el.style.top='0';var r=el.getBoundingClientRect();sizes[id]={width:Math.max(r.width,el.offsetWidth,1),height:Math.max(r.height,el.offsetHeight,1)};});
  var pitch=Math.max.apply(null,ids.map(function(id){return sizes[id].width;}))+horizontalGap;
  rows.forEach(function(row,rowIndex){
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
    // Branch order is an explicit left-to-right choice, including groups of
    // three or more and children shared with another parent.
    if(rowIndex>0)rows[rowIndex-1].forEach(function(parent){
      var branches=out[parent].filter(function(to){return rank[to]===rowIndex;});
      if(branches.length<2)return;
      var midpoint=branches.reduce(function(sum,to){return sum+center[to];},0)/branches.length;
      branches.forEach(function(to,index){center[to]=anchor[to]=midpoint+(index-(branches.length-1)/2)*pitch;orderedBranchChild[to]=true;});
    });
    // Match each row's order to its incoming connections before spacing boxes.
    // Otherwise independent links can be forced to cross between two rows.
    row.sort(function(a,b){return anchor[a]-anchor[b]||center[a]-center[b]||ids.indexOf(a)-ids.indexOf(b);});
    var wanted=row.reduce(function(sum,id){return sum+center[id];},0)/row.length;
    var rightEdge=-Infinity,rowGap=print?14:(compact?24:34);
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
    var upper=rows[rowIndex],upperGap=print?14:(compact?24:34);
    upper.forEach(function(id){
      var children=out[id].filter(function(to){return rank[to]===rowIndex+1;});
      if(children.length)center[id]=children.reduce(function(sum,to){return sum+center[to];},0)/children.length;
    });
    upper.sort(function(a,b){return center[a]-center[b]||ids.indexOf(a)-ids.indexOf(b);});
    var edge=-Infinity;
    upper.forEach(function(id){var left=center[id]-sizes[id].width/2;if(left<edge+upperGap)center[id]+=edge+upperGap-left;edge=center[id]+sizes[id].width/2;});
  }
  // A shared child can be pulled under one parent by bottom-up centering. Move
  // it between widely separated incoming branches, then carry that movement
  // down its chain and push neighboring boxes aside rather than overlapping.
  var previousCenter={};ids.forEach(function(id){previousCenter[id]=center[id];});
  for(var layer=1;layer<rows.length;layer++){
    var layerRow=rows[layer],layerGap=print?14:(compact?24:34);
    layerRow.forEach(function(id){
      var parents=incoming[id].filter(function(parent){return rank[parent]<layer;});
      if(!parents.length)return;
      var parentShift=parents.reduce(function(sum,parent){return sum+center[parent]-previousCenter[parent];},0)/parents.length;
      center[id]+=parentShift;
      if(parents.length>1&&!orderedBranchChild[id]){
        var positions=parents.map(function(parent){return center[parent];});
        var spread=Math.max.apply(null,positions)-Math.min.apply(null,positions);
        var middle=positions.reduce(function(sum,x){return sum+x;},0)/positions.length;
        if(spread>pitch*.65&&Math.abs(middle-center[id])>pitch*.2)center[id]=middle;
      }
    });
    layerRow.sort(function(a,b){return center[a]-center[b]||ids.indexOf(a)-ids.indexOf(b);});
    var layerEdge=-Infinity;
    layerRow.forEach(function(id){var left=center[id]-sizes[id].width/2;if(left<layerEdge+layerGap)center[id]+=layerEdge+layerGap-left;layerEdge=center[id]+sizes[id].width/2;});
  }
  // Keep a one-to-one continuation directly under its parent. Where three or
  // more branches join, align the join with the middle parent. Follow each
  // chain downward after row spacing, but never make boxes overlap.
  for(var straightLayer=1;straightLayer<rows.length;straightLayer++){
    var straightRow=rows[straightLayer],straightGap=print?14:(compact?24:34);
    straightRow.forEach(function(id){
      var parents=incoming[id].filter(function(parent){return rank[parent]===straightLayer-1;});
      var desired;
      if(parents.length===1&&incoming[id].length===1){
        var parent=parents[0],siblings=out[parent].filter(function(to){return rank[to]===straightLayer;});
        if(siblings.length!==1)return;
        desired=center[parent];
      }else if(parents.length>=3&&parents.length%2===1&&parents.length===incoming[id].length){
        var parentCenters=parents.map(function(parent){return center[parent];}).sort(function(a,b){return a-b;});
        desired=parentCenters[(parentCenters.length-1)/2];
      }else return;
      var half=sizes[id].width/2;
      var clear=straightRow.every(function(other){return other===id||desired+half+straightGap<=center[other]-sizes[other].width/2||desired-half-straightGap>=center[other]+sizes[other].width/2;});
      if(clear)center[id]=desired;
    });
  }
  var minX=Math.min.apply(null,ids.map(function(id){return center[id]-sizes[id].width/2;}));
  var y=topInset;
  rows.forEach(function(row,index){var h=0;row.forEach(function(id){var el=elements[id],x=center[id]-sizes[id].width/2-minX+sideInset;el.style.left=x+'px';el.style.top=y+'px';width=Math.max(width,x+sizes[id].width+sideInset);h=Math.max(h,sizes[id].height);});
    var next=rows[index+1]||[],mergeSpace=next.some(function(id){return incoming[id].length>1;})?(print?22:(compact?32:42)):0;
    y+=h+verticalGap+mergeSpace;
  });
  var autoHeight=print?y-verticalGap+sideInset:y-topInset;
  var saved=options.positions||{};
  var completeSaved=ids.length&&ids.every(function(id){return saved[id]&&isFinite(saved[id].x)&&isFinite(saved[id].y);});
  var visualSaved={};
  ids.forEach(function(id){if(saved[id])visualSaved[id]={x:Number(saved[id].x),y:Number(saved[id].y)};});
  if(completeSaved&&!options.manual&&!options.locked){
    // Position each child beneath its own parent(s), not beneath the deepest
    // unrelated branch in the same global rank. Keep a minimum corridor for
    // connectors, and use branch order to arrange siblings left to right.
    var positioned=[];
    rows.forEach(function(row,rowIndex){
      if(!rowIndex){row.forEach(function(id){visualSaved[id].y=topInset;positioned.push(id);});return;}
      var desired={};
      row.forEach(function(id){
        var parents=incoming[id];if(!parents.length){desired[id]=visualSaved[id].x;return;}
        var parentX=parents.length>1?Math.min.apply(null,parents.map(function(p){return visualSaved[p].x+sizes[p].width/2;})):visualSaved[parents[0]].x+sizes[parents[0]].width/2;
        var offset=0;
        if(parents.length===1){var siblings=out[parents[0]].filter(function(to){return rank[to]===rowIndex&&incoming[to].length===1;});offset=(siblings.indexOf(id)-(siblings.length-1)/2)*(sizes[id].width+horizontalGap);}
        desired[id]=parentX+offset-sizes[id].width/2;
        visualSaved[id].y=Math.max.apply(null,parents.map(function(p){return visualSaved[p].y+sizes[p].height;}))+(parents.length>1?128:100);
      });
      var ordered=row.slice().sort(function(a,b){return desired[a]-desired[b]||visualSaved[a].x-visualSaved[b].x;});
      var edge=-Infinity;
      ordered.forEach(function(id){visualSaved[id].x=Math.max(desired[id],edge+20);edge=visualSaved[id].x+sizes[id].width;});
      ordered.forEach(function(id){
        positioned.forEach(function(other){
          var x=visualSaved[id],p=visualSaved[other];
          if(x.x<p.x+sizes[other].width+12&&x.x+sizes[id].width+12>p.x&&x.y<p.y+sizes[other].height+70&&x.y+sizes[id].height+70>p.y)
            x.y=Math.max(x.y,p.y+sizes[other].height+70);
        });
        positioned.push(id);
      });
    });
    var visualMinX=Math.min.apply(null,ids.map(function(id){return visualSaved[id].x;}));
    ids.forEach(function(id){visualSaved[id].x=Math.max(0,visualSaved[id].x-visualMinX+sideInset);});
  }
  var savedShift={};
  if(completeSaved&&options.manual&&!options.locked){
    // Older saved charts can leave too little room above a join. Move that
    // row and everything below it together; never move its ancestors.
    var carried=0,previousBottom=-Infinity;
    rows.forEach(function(row){
      if(!row.length)return;
      var top=Math.min.apply(null,row.map(function(id){return Math.max(0,visualSaved[id].y)+carried;}));
      var joins=row.some(function(id){return incoming[id].length>1;});
      var clearance=joins?(print?46:(compact?70:90)):(print?30:(compact?48:62));
      if(previousBottom>-Infinity)carried+=Math.max(0,previousBottom+clearance-top);
      row.forEach(function(id){savedShift[id]=carried;});
      previousBottom=Math.max(previousBottom,Math.max.apply(null,row.map(function(id){return Math.max(0,visualSaved[id].y)+carried+sizes[id].height;})));
    });
  }
  if(completeSaved){
    width=0;autoHeight=0;
  }
  ids.forEach(function(id){
    var position=visualSaved[id];
    if(!position||!isFinite(position.x)||!isFinite(position.y))return;
    var x=Math.max(0,position.x),top=Math.max(0,position.y)+(savedShift[id]||0);
    elements[id].style.left=x+'px';elements[id].style.top=top+'px';
    width=Math.max(width,x+sizes[id].width+sideInset);
    autoHeight=Math.max(autoHeight,top+sizes[id].height+sideInset);
  });
  if(!options.manual&&!options.locked){
    // Independent root branches stay in separate lanes even when only some
    // nodes have saved positions. Do not alter a chart's manual placement.
    ids.filter(function(id){return !incoming[id].length;}).forEach(function(root){
      var children=out[root].filter(function(id){return elements[id];});
      if(children.length<2)return;
      function left(id){return parseFloat(elements[id].style.left)||0;}
      children.sort(function(a,b){return left(a)-left(b);});
      var groups=children.map(function(child){
        var seen={},stack=[child];
        while(stack.length){var id=stack.pop();if(seen[id])continue;seen[id]=true;(out[id]||[]).forEach(function(next){if(elements[next])stack.push(next);});}
        return Object.keys(seen);
      });
      var claimed={};
      if(groups.some(function(group){return group.some(function(id){if(claimed[id])return true;claimed[id]=true;return false;});}))return;
      var previousRight=-Infinity,laneGap=print?24:(compact?48:64);
      groups.forEach(function(group){
        var groupLeft=Math.min.apply(null,group.map(left));
        var groupRight=Math.max.apply(null,group.map(function(id){return left(id)+sizes[id].width;}));
        var shift=Math.max(0,previousRight+laneGap-groupLeft);
        group.forEach(function(id){elements[id].style.left=(left(id)+shift)+'px';});
        previousRight=groupRight+shift;
      });
      elements[root].style.left=(children.reduce(function(sum,id){return sum+left(id)+sizes[id].width/2;},0)/children.length-sizes[root].width/2)+'px';
    });
    width=Math.max.apply(null,ids.map(function(id){return (parseFloat(elements[id].style.left)||0)+sizes[id].width+sideInset;}));
  }
  stage.style.width=width+'px';stage.style.height=autoHeight+'px';stage.style.zoom=oldZoom;
}

/* Orthogonal connectors shared by the editor and standalone PDF export. */
function routeBloodBankFlow(container) {
  var layer=container.querySelector('.flow-link-layer');
  if(!layer)return [];
  var origin=container.getBoundingClientRect(),nodes={},targets=[];
  var pageScale=origin.width/Math.max(container.offsetWidth,1);
  if(!isFinite(pageScale)||pageScale<=0)pageScale=1;
  var zoom=parseFloat(getComputedStyle(container.querySelector('.flow-tree')).zoom)||1;
  var printExport=container.classList.contains('flow-export-wrap');
  var gap=printExport?Math.max(8,12*zoom):Math.max(9,24*zoom);
  function rect(el){var r=el.getBoundingClientRect();return {left:(r.left-origin.left)/pageScale,right:(r.right-origin.left)/pageScale,top:(r.top-origin.top)/pageScale,bottom:(r.bottom-origin.top)/pageScale};}
  container.querySelectorAll('[data-flow-node-id]').forEach(function(el){nodes[el.dataset.flowNodeId]=rect(el);nodes[el.dataset.flowNodeId].decision=el.classList.contains('question');});
  var obstacles=Array.from(container.querySelectorAll('.flow-node,.flow-note-card')).map(function(el){var r=rect(el);return {left:r.left-gap/2,right:r.right+gap/2,top:r.top-gap/2,bottom:r.bottom+gap/2};});
  function clear(a,b){return !obstacles.some(function(r){return a.x===b.x ? a.x>r.left&&a.x<r.right&&Math.max(a.y,b.y)>r.top&&Math.min(a.y,b.y)<r.bottom : a.y>r.top&&a.y<r.bottom&&Math.max(a.x,b.x)>r.left&&Math.min(a.x,b.x)<r.right;});}
  var occupied=[];
  function separate(points,from,shareSource,to){
    for(var i=1;i<points.length;i++){
      var a=points[i-1],b=points[i];
      for(var j=0;j<occupied.length;j++){
        var c=occupied[j][0],d=occupied[j][1];
        if(shareSource&&occupied[j][2]===from&&occupied[j][4]===shareSource)continue;
        if(to&&occupied[j][5]===to&&((a.x===b.x&&c.x===d.x)||(a.y===b.y&&c.y===d.y)))continue;
        if(a.x===b.x&&c.x===d.x&&Math.abs(a.x-c.x)<gap&&Math.min(b.y,a.y)<Math.max(c.y,d.y)-gap&&Math.max(b.y,a.y)>Math.min(c.y,d.y)+gap)return false;
        if(a.y===b.y&&c.y===d.y&&Math.abs(a.y-c.y)<gap&&Math.min(b.x,a.x)<Math.max(c.x,d.x)-gap&&Math.max(b.x,a.x)>Math.min(c.x,d.x)+gap)return false;
        var crossingPad=Math.max(2,gap*.12);
        if(a.x===b.x&&c.y===d.y&&a.x>Math.min(c.x,d.x)+crossingPad&&a.x<Math.max(c.x,d.x)-crossingPad&&c.y>Math.min(a.y,b.y)+crossingPad&&c.y<Math.max(a.y,b.y)-crossingPad)return false;
        if(a.y===b.y&&c.x===d.x&&c.x>Math.min(a.x,b.x)+crossingPad&&c.x<Math.max(a.x,b.x)-crossingPad&&a.y>Math.min(c.y,d.y)+crossingPad&&a.y<Math.max(c.y,d.y)-crossingPad)return false;
      }
    }
    return true;
  }
  function route(start,end,join,from,shareSource,allowCross,to){
    var bus={x:start.x,y:end.y};if(join&&end.y>start.y&&clear(start,bus)&&clear(bus,end)&&(allowCross||separate([start,bus,end],from,shareSource,to)))return [start,bus,end];
    // Prefer a single elbow when the direct corridor is open. Searching for
    // intermediate lanes first creates a needless short outward/backward jog.
    var direct={x:end.x,y:start.y};
    if(end.y>start.y&&clear(start,direct)&&clear(direct,end)&&(allowCross||separate([start,direct,end],from,shareSource,to)))return [start,direct,end];
    var middle=(start.y+end.y)/2,p1={x:start.x,y:middle},p2={x:end.x,y:middle};
    if(end.y>start.y){
      var lanes=[middle],step=Math.max(gap*1.5,12),count=Math.floor((end.y-start.y)/2/step);
      for(var lane=1;lane<=count;lane++){lanes.push(middle-lane*step,middle+lane*step);}
      for(var laneIndex=0;laneIndex<lanes.length;laneIndex++){
        p1={x:start.x,y:lanes[laneIndex]};p2={x:end.x,y:lanes[laneIndex]};
        var candidate=[start,p1,p2,end];
        if(clear(start,p1)&&clear(p1,p2)&&clear(p2,end)&&(allowCross||separate(candidate,from,shareSource,to)))return candidate;
      }
    }
    if(clear(start,{x:start.x,y:end.y})&&clear({x:start.x,y:end.y},end)&&(allowCross||separate([start,{x:start.x,y:end.y},end],from,shareSource,to)))return [start,{x:start.x,y:end.y},end];
    if(clear(start,{x:end.x,y:start.y})&&clear({x:end.x,y:start.y},end)&&(allowCross||separate([start,{x:end.x,y:start.y},end],from,shareSource,to)))return [start,{x:end.x,y:start.y},end];
    var xs=[start.x,end.x,gap],ys=[start.y,end.y,gap];
    obstacles.forEach(function(r){xs.push(r.left-gap,r.right+gap);ys.push(r.top-gap,r.bottom+gap);});
    occupied.forEach(function(segment){[segment[0],segment[1]].forEach(function(point){xs.push(Math.max(gap,point.x-gap),point.x+gap);ys.push(Math.max(gap,point.y-gap),point.y+gap);});});
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
      neighbors.forEach(function(next){var b=point(next[0]);if(!clear(a,b)||(!allowCross&&!separate([a,b],from,shareSource,to)))return;var nk=next[0]*3+next[1],cost=current.cost+Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+(dir&&dir!==next[1]?gap*2:0)+(end.y>start.y&&b.y<a.y?gap*20:0);if(cost>=(costs.has(nk)?costs.get(nk):Infinity))return;costs.set(nk,cost);previous.set(nk,key);push({key:nk,cost:cost,score:cost+Math.abs(end.x-b.x)+Math.abs(end.y-b.y)});});
    }
    return null;
  }
  var stage=container.querySelector('.flow-tree'),bounds=stage.getBoundingClientRect();
  var width=Math.max(container.clientWidth,(bounds.right-origin.left)/pageScale,1),height=Math.max(container.clientHeight,(bounds.bottom-origin.top)/pageScale,1);
  layer.setAttribute('viewBox','0 0 '+width+' '+height);layer.setAttribute('width',width);layer.setAttribute('height',height);layer.style.width=width+'px';layer.style.height=height+'px';
  // Use a separate marker per canvas so multi-page exports remain self-contained.
  var marker='flow-arrow-'+(container.dataset.routeId||(container.dataset.routeId=Math.random().toString(36).slice(2)));
  var markerSize=printExport?7:10.5;
  var html='<defs><marker id="'+marker+'" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="'+markerSize+'" markerHeight="'+markerSize+'" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c0173d"/></marker></defs>';
  var links=Array.from(container.querySelectorAll('.flow-link-marker')),incomingByTarget={},outgoingBySource={},placedLabels=[],labelBackgrounds=[],labelTexts=[],pendingLabels=[];
  links.forEach(function(m){var to=m.dataset.flowLinkTo,from=m.dataset.flowLinkFrom,parents=incomingByTarget[to]||(incomingByTarget[to]=[]),children=outgoingBySource[from]||(outgoingBySource[from]=[]);parents.push(m);children.push(m);});
  function mergeOwnerFor(to){
    var parents=(incomingByTarget[to]||[]).filter(function(link){return nodes[link.dataset.flowLinkFrom];}),target=nodes[to];
    if(!target||!parents.length)return null;
    var center=(target.left+target.right)/2;
    return parents.reduce(function(best,link){
      var now=nodes[link.dataset.flowLinkFrom],old=nodes[best.dataset.flowLinkFrom];
      return Math.abs((now.left+now.right)/2-center)<Math.abs((old.left+old.right)/2-center)?link:best;
    },parents[0]);
  }
  // Paint the link that enters a shared box first. Every other incoming link
  // can then terminate on its exact spine instead of drawing a nearby spur.
  var orderedLinks=links.slice().sort(function(left,right){
    var leftSecondary=(incomingByTarget[left.dataset.flowLinkTo]||[]).length>1&&mergeOwnerFor(left.dataset.flowLinkTo)!==left;
    var rightSecondary=(incomingByTarget[right.dataset.flowLinkTo]||[]).length>1&&mergeOwnerFor(right.dataset.flowLinkTo)!==right;
    return Number(leftSecondary)-Number(rightSecondary);
  });
  // Branches with the same printed answer leave the decision on one stem.
  // Empty and default Next labels remain individual connectors.
  var sharedLabelGroups=new Map();
  Object.keys(outgoingBySource).forEach(function(from){
    var parent=nodes[from],byLabel={};if(!parent)return;
    outgoingBySource[from].forEach(function(link){
      var label=(link.dataset.label||'').trim(),key=label.toLowerCase();
      if(!key||key==='next'||link.dataset.fromSide||link.dataset.toSide||!nodes[link.dataset.flowLinkTo])return;
      (byLabel[key]||(byLabel[key]=[])).push(link);
    });
    var repeated=Object.keys(byLabel).map(function(key){return byLabel[key];}).filter(function(group){return group.length>1;});
    repeated.sort(function(left,right){
      function average(group){return group.reduce(function(sum,link){var target=nodes[link.dataset.flowLinkTo];return sum+(target.left+target.right)/2;},0)/group.length;}
      return average(left)-average(right);
    });
    repeated.forEach(function(group,index){
      var nearestTop=Math.min.apply(null,group.map(function(link){return nodes[link.dataset.flowLinkTo].top;}));
      var corridor=nearestTop-parent.bottom;
      if(corridor<=gap*2.5)return;
      var busY=parent.bottom+Math.max(gap*1.25,Math.min(corridor*.45,corridor-gap*1.25));
      if(busY<=parent.bottom+gap||busY>=nearestTop-gap)return;
      var side=repeated.length>1?(index<(repeated.length-1)/2?-1:1):0;
      var source=side?{x:side<0?parent.left:parent.right,y:(parent.top+parent.bottom)/2}:{x:(parent.left+parent.right)/2,y:parent.bottom};
      var start=side?{x:source.x+side*gap,y:source.y}:{x:source.x,y:source.y+gap};
      var stemX=start.x,stem=[start,{x:stemX,y:busY}];
      if(!clear(stem[0],stem[1]))return;
      var info={group:group,leader:group[0],source:source,start:start,stem:stem,busY:busY,stemX:stemX};
      group.forEach(function(link){sharedLabelGroups.set(link,info);});
    });
  });
  orderedLinks.forEach(function(m){
    var from=m.dataset.flowLinkFrom,to=m.dataset.flowLinkTo,a=nodes[from],b=nodes[to];if(!a||!b)return;
    var fromSide=m.dataset.fromSide||'',toSide=m.dataset.toSide||'',manualPort=Boolean(fromSide||toSide);
    var parents=incomingByTarget[to].filter(function(parent){return nodes[parent.dataset.flowLinkFrom];}).sort(function(left,right){var x=nodes[left.dataset.flowLinkFrom],y=nodes[right.dataset.flowLinkFrom];return ((x.left+x.right)/2)-((y.left+y.right)/2);});
    // Every automatic entry uses the center of a real box side. In
    // particular, a merge must not slide its arrow along the top edge.
    var targetX=(b.left+b.right)/2,targetY=b.top;
    var mergeOwner=parents.length>1?mergeOwnerFor(to):m;
    // Leave a visible straight approach so the arrowhead is not attached to
    // the horizontal turn immediately above a destination box.
    var corridor=b.top-a.bottom;
    var approach=Math.min(printExport?Math.max(gap*3,12*zoom):Math.max(gap*4,24*zoom),Math.max(gap*.8,corridor/5));
    var source={x:(a.left+a.right)/2,y:a.bottom},start={x:(a.left+a.right)/2,y:a.bottom+gap},end={x:targetX,y:b.top-approach},sideDirection=0;
    if(parents.length>1){
      var lowestParent=Math.max.apply(null,parents.map(function(link){return nodes[link.dataset.flowLinkFrom].bottom;}));
      end.y=Math.min(b.top-gap,Math.max(lowestParent+gap,(lowestParent+b.top)/2));
    }
    var children=outgoingBySource[from]||[],sharedGroup=sharedLabelGroups.get(m);
    var bottomBranch=false;
    if(a.decision&&children.length===2){
      var otherLink=children.find(function(link){return link!==m&&nodes[link.dataset.flowLinkTo];});
      var otherNode=otherLink&&nodes[otherLink.dataset.flowLinkTo];
      var myOffset=end.x-start.x,otherOffset=otherNode?(otherNode.left+otherNode.right)/2-start.x:0;
      var straightLimit=(a.right-a.left)*.35;
      // A child directly below the diamond uses its lower point; its sibling
      // leaves from the diamond's side. Opposite branches each use a side.
      bottomBranch=Math.abs(myOffset)<straightLimit&&Math.abs(otherOffset)>=straightLimit;
      if(Math.abs(myOffset)<straightLimit&&Math.abs(otherOffset)<straightLimit)bottomBranch=true;
      if(myOffset*otherOffset>0&&Math.abs(myOffset)<Math.abs(otherOffset))bottomBranch=true;
    }else if(a.decision&&children.length===1){
      bottomBranch=Math.abs(end.x-start.x)<(a.right-a.left)*.35;
    }else if(a.decision&&children.length>2){
      // In a three-way split, the middle destination leaves the lower point.
      // Two links leaving the same side would otherwise cross on their way
      // to the nearer and farther boxes.
      var orderedTargets=children.filter(function(link){return nodes[link.dataset.flowLinkTo];}).sort(function(left,right){
        var l=nodes[left.dataset.flowLinkTo],r=nodes[right.dataset.flowLinkTo];
        return (l.left+l.right)-(r.left+r.right);
      });
      bottomBranch=orderedTargets[Math.floor((orderedTargets.length-1)/2)]===m;
    }
    if(parents.length>1&&m===mergeOwner&&Math.abs(end.x-start.x)<(a.right-a.left)*.65)bottomBranch=true;
    if(parents.length>1&&m!==mergeOwner&&b.top>a.bottom+gap*3)bottomBranch=true;
    if(!sharedGroup&&a.decision&&!bottomBranch&&(children.length>1||Math.abs(end.x-start.x)>(a.right-a.left)*.35)){
      sideDirection=end.x<start.x?-1:1;
      source={x:sideDirection<0?a.left:a.right,y:(a.top+a.bottom)/2};
      if(sideDirection*(end.x-source.x)<gap*2&&children.length<=2){
        // An inward target would force a side connector to double back.
        // The lower point of the diamond is clearer in this tight case.
        sideDirection=0;bottomBranch=true;source={x:(a.left+a.right)/2,y:a.bottom};
        start={x:source.x,y:source.y+gap};
      }else start={x:source.x+sideDirection*gap*.5,y:source.y};
    }
    // A box beside a diamond can block the first horizontal segment. Keep
    // the side exit and let the router turn below that box before crossing.
    // A tiny last-second elbow looks like a stray arrow. When one connector is
    // already above the destination, bring it straight into the box instead.
    if(parents.length===1&&!b.decision&&Math.abs(start.x-end.x)<Math.max(28,gap*3)&&start.x>b.left+gap*2&&start.x<b.right-gap*2){targetX=end.x=start.x;}
    // A link between adjacent boxes on the same row needs only one short
    // side-to-side connector. Routing it down and back up makes a large loop.
    var overlapTop=Math.max(a.top,b.top),overlapBottom=Math.min(a.bottom,b.bottom);
    var lateralSide=b.right<a.left?-1:(b.left>a.right?1:0);
    var lateralGap=lateralSide<0?a.left-b.right:(lateralSide>0?b.left-a.right:0);
    var lateralY=(a.top+a.bottom)/2,targetLateralY=(b.top+b.bottom)/2;
    var lateral=!manualPort&&parents.length===1&&lateralSide&&Math.abs(lateralY-targetLateralY)<2&&overlapBottom-overlapTop>Math.min(a.bottom-a.top,b.bottom-b.top)*.45&&lateralGap>Math.max(10,gap*.4)&&lateralGap<Math.max(320,460*zoom)&&!Object.keys(nodes).some(function(id){
      if(id===from||id===to)return false;
      var box=nodes[id],left=Math.min(lateralSide<0?a.left:a.right,lateralSide<0?b.right:b.left),right=Math.max(lateralSide<0?a.left:a.right,lateralSide<0?b.right:b.left);
      return lateralY>box.top-4&&lateralY<box.bottom+4&&left<box.right+4&&right>box.left-4;
    });
    if(lateral){
      source={x:lateralSide<0?a.left:a.right,y:lateralY};
      start=source;
      end={x:lateralSide<0?b.right:b.left,y:lateralY};
    }
    // Decision answers use independent ports. Only ordinary steps share a
    // stem and split bus.
    var shareSource=manualPort?false:(sharedGroup?(sharedGroup.leader.dataset.label||'').trim().toLowerCase():(children.filter(function(link){return nodes[link.dataset.flowLinkTo];}).length>1&&!a.decision?'__step__':false));
    function port(box,side){
      if(side==='top')return {x:(box.left+box.right)/2,y:box.top,dx:0,dy:-1};
      if(side==='left')return {x:box.left,y:(box.top+box.bottom)/2,dx:-1,dy:0};
      if(side==='right')return {x:box.right,y:(box.top+box.bottom)/2,dx:1,dy:0};
      return {x:(box.left+box.right)/2,y:box.bottom,dx:0,dy:1};
    }
    var entry=null;
    if(manualPort){
      if(fromSide){
        var exit=port(a,fromSide);
        source={x:exit.x,y:exit.y};
        start={x:exit.x+exit.dx*gap,y:exit.y+exit.dy*gap};
      }
      entry=toSide?port(b,toSide):{x:targetX,y:b.top,dx:0,dy:-1};
      end={x:entry.x+entry.dx*approach,y:entry.y+entry.dy*approach};
      sideDirection=0;
    }
    var points=lateral?[start,end]:null;
    if(sharedGroup){
      source=sharedGroup.source;start=sharedGroup.start;
      var junction={x:end.x,y:sharedGroup.busY};
      var tail=clear(junction,end)?[junction,end]:route(junction,end,false,from,shareSource,false,to);
      if(clear(sharedGroup.stem[sharedGroup.stem.length-1],junction)&&tail){
        var sharedPoints=sharedGroup.stem.concat(junction,tail.slice(1));
        if(separate(sharedPoints,from,shareSource,to))points=sharedPoints;
      }
    }
    if(!points&&!manualPort&&parents.length>1&&m===mergeOwner&&Math.abs(start.x-end.x)<gap&&clear(start,end)&&separate([start,end],from,shareSource,to)){
      // The parent directly above a merge owns its vertical spine. Other
      // parents join that spine; they must not force it into a rectangular
      // detour just because their route happened to be drawn first.
      points=[start,end];
    }
    if(!points&&shareSource){
      // Sibling steps share a single stem and horizontal split. Each branch
      // descends separately into its destination, as in a standard flowchart.
      var nearestTop=Math.min.apply(null,children.filter(function(link){return nodes[link.dataset.flowLinkTo];}).map(function(link){return nodes[link.dataset.flowLinkTo].top;}));
      var busY=a.bottom+(nearestTop-a.bottom-approach)/2;
      if(busY>start.y+gap&&busY<end.y-gap){
        var busStart={x:start.x,y:busY},busEnd={x:end.x,y:busY};
        if(clear(start,busStart)&&clear(busStart,busEnd)&&clear(busEnd,end)&&separate([start,busStart,busEnd,end],from,shareSource,to))points=[start,busStart,busEnd,end];
      }
    }
    if(!points)points=route(start,end,parents.length>1&&m!==mergeOwner&&!manualPort,from,shareSource,false,to);
    if(!points&&a.decision&&sideDirection){
      // A crowded side port can be boxed in by adjacent branches. The bottom
      // port keeps this connection visible without cutting through the node.
      sideDirection=0;source={x:(a.left+a.right)/2,y:a.bottom};start={x:source.x,y:source.y+gap};
      points=route(start,end,parents.length>1&&m!==mergeOwner,from,shareSource,false,to);
    }
    if(!points)points=route(start,end,false,from,shareSource,true,to);
    if(!points){m.dataset.routeMissing='true';return;}delete m.dataset.routeMissing;
    points.unshift(source);
    if(manualPort)points.push({x:entry.x,y:entry.y});
    else if(!lateral)points.push({x:targetX,y:targetY});
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
    // Move a short near-target square elbow to the top of its long vertical
    // run whenever the earlier corridor is free.
    if(!manualPort&&points.length>=4){
      var topTurn=points[points.length-4],lateTurn=points[points.length-3],lateSide=points[points.length-2],arrival=points[points.length-1];
      var shortJog=Math.abs(lateSide.x-lateTurn.x)<Math.max(42,70*zoom)&&Math.abs(arrival.y-lateSide.y)<Math.max(44,70*zoom);
      if(topTurn.x===lateTurn.x&&lateTurn.y===lateSide.y&&lateSide.x===arrival.x&&shortJog&&Math.abs(lateTurn.y-topTurn.y)>Math.max(80,120*zoom)){
        var earlySide={x:arrival.x,y:topTurn.y},safeEnd={x:arrival.x,y:arrival.y-(m===mergeOwner?approach:0)};
        var earlyPoints=points.slice(0,-3).concat(earlySide,arrival);
        if(clear(topTurn,earlySide)&&clear(earlySide,safeEnd)&&separate(earlyPoints,from,shareSource,to))points=earlyPoints;
      }
    }
    for(var segment=1;segment<points.length;segment++)occupied.push([points[segment-1],points[segment],from,m.dataset.branchId,shareSource,to]);
    var d=points.map(function(p,i){return (i?'L ':'M ')+p.x.toFixed(2)+' '+p.y.toFixed(2);}).join(' ');
    if(m.dataset.selected==='true')html+='<path d="'+d+'" fill="none" stroke="#ffcf00" stroke-width="'+Math.max(8,2.4*zoom+7)+'" stroke-linecap="round" stroke-linejoin="round"/>';
    html+='<path class="flow-link-path'+(m.dataset.selected==='true'?' selected':'')+'" style="stroke-width:'+Math.max(.6,2.4*zoom)+'" d="'+d+'"'+(m===mergeOwner||manualPort?' marker-end="url(#'+marker+')"':'')+'/>';
    targets.push({from:from,to:to,branchId:m.dataset.branchId,points:points});
    if(m.dataset.label && m.dataset.label.toLowerCase()!=='next'&&(!sharedGroup||sharedGroup.leader===m))pendingLabels.push({marker:m,points:points,source:source,from:from,to:to,fixedLabel:sharedGroup?{x:sharedGroup.stemX,y:(sharedGroup.source.y+sharedGroup.busY)/2}:null});
  });
  // Place labels after every route is known, so each answer can avoid nearby
  // connectors and all words are painted above the complete line network.
  pendingLabels.forEach(function(item){
    var m=item.marker,points=item.points,source=item.source,from=item.from,to=item.to;
      // Printed branch words should be about the same size as the text in the
      // boxes after the whole diagram is fitted to a single sheet.
      var labelSize=printExport?Math.max(7,18*zoom):18*zoom;
      var labelWidth=Math.max(labelSize*2,m.dataset.label.length*labelSize*.64+8*zoom);
      var labelX=source.x,labelY=source.y,candidates=[];
      for(var i=1;i<points.length;i++){
        var before=points[i-1],after=points[i],horizontal=Math.abs(after.x-before.x),vertical=Math.abs(after.y-before.y);
        if(horizontal){[.5,.3,.7].forEach(function(t){candidates.push({x:before.x+(after.x-before.x)*t,y:before.y+labelSize*.35,length:horizontal,horizontal:true,order:i});});}
        if(vertical){[.3,.5,.7].forEach(function(t){candidates.push({x:before.x,y:before.y+(after.y-before.y)*t+labelSize*.35,length:vertical,horizontal:false,order:i});});}
      }
      candidates.sort(function(left,right){return (right.horizontal?1:0)-(left.horizontal?1:0)||right.length-left.length;});
      function labelBox(candidate){return {left:candidate.x-labelWidth/2,right:candidate.x+labelWidth/2,top:candidate.y-labelSize*.85-2*zoom,bottom:candidate.y+labelSize*.15+2*zoom};}
      function boxOverlap(left,right){return Math.max(0,Math.min(left.right,right.right)-Math.max(left.left,right.left))*Math.max(0,Math.min(left.bottom,right.bottom)-Math.max(left.top,right.top));}
      var chosen=null,bestScore=Infinity;
      candidates.forEach(function(candidate){
        var box=labelBox(candidate),score=0;
        var needed=candidate.horizontal?labelWidth+8*zoom:labelSize+8*zoom;
        score+=Math.max(0,needed-candidate.length)*100;
        score+=candidate.order*labelSize*2;
        if(box.left<2||box.right>width-2||box.top<2||box.bottom>height-2)score+=100000;
        obstacles.forEach(function(node){score+=boxOverlap(box,node)*10;});
        occupied.forEach(function(segment){
          if(segment[2]===from&&segment[3]===m.dataset.branchId)return;
          var a=segment[0],b=segment[1],padding=Math.max(2,2*zoom);
          score+=boxOverlap(box,{left:Math.min(a.x,b.x)-padding,right:Math.max(a.x,b.x)+padding,top:Math.min(a.y,b.y)-padding,bottom:Math.max(a.y,b.y)+padding})*30;
        });
        placedLabels.forEach(function(other){score+=boxOverlap(box,other)*20;});
        if(score<bestScore){bestScore=score;chosen=candidate;}
      });
      if(item.fixedLabel){labelX=item.fixedLabel.x;labelY=item.fixedLabel.y;placedLabels.push(labelBox({x:labelX,y:labelY}));}
      else if(chosen){
        labelX=chosen.x;labelY=chosen.y;
        placedLabels.push(labelBox(chosen));
      }
      var background=document.createElementNS('http://www.w3.org/2000/svg','rect');
      background.setAttribute('x',labelX-labelWidth/2);background.setAttribute('y',labelY-labelSize*.85-2*zoom);
      background.setAttribute('width',labelWidth);background.setAttribute('height',labelSize+4*zoom);
      background.setAttribute('rx',2*zoom);background.setAttribute('class','flow-route-label-bg');
      background.setAttribute('data-flow-link-from',from);background.setAttribute('data-flow-link-to',to);
      background.setAttribute('fill','#fff');
      labelBackgrounds.push(background.outerHTML);
      var text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',labelX);text.setAttribute('y',labelY);text.setAttribute('text-anchor','middle');text.setAttribute('class','flow-route-label'+(m.dataset.selected==='true'?' selected':''));text.setAttribute('data-flow-link-from',from);text.setAttribute('data-flow-link-to',to);text.setAttribute('data-branch-id',m.dataset.branchId);text.setAttribute('style','font-size:'+labelSize+'px;stroke-width:'+(printExport?0:(m.dataset.selected==='true'?6*zoom:Math.max(3,4*zoom)))+'px');text.textContent=m.dataset.label||'Next';labelTexts.push(text.outerHTML);
  });
  layer.innerHTML=html+labelBackgrounds.join('')+labelTexts.join('');
  layer.querySelectorAll('.flow-link-path').forEach(function(path,index){
    path.dataset.flowLinkFrom=targets[index].from;
    path.dataset.flowLinkTo=targets[index].to;
  });
  return targets;
}
