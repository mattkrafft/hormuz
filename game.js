"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const ui={gas:document.getElementById("gas-price"),change:document.getElementById("gas-change"),ammo:document.getElementById("ammo"),status:document.getElementById("status"),intro:document.getElementById("intro"),result:document.getElementById("result"),resultTitle:document.getElementById("result-title"),resultCopy:document.getElementById("result-copy"),ticker:document.getElementById("ticker-text"),transits:document.getElementById("transits"),losses:document.getElementById("losses")};
let W=0,H=0,dpr=1,state="intro",last=0,elapsed=0,spawnClock=0,spawned=0,ammo=18,gas=3.47,startGas=3.47,paused=false;
const MISSILE_ARC=.22;
let missiles=[],drones=[],interceptors=[],blasts=[],ships=[],sparks=[];
const TOTAL_MISSILES=16,TOTAL_DRONES=10;

const MAP={
 north:[[.276,0],[.283,.008],[.273,.028],[.286,.034],[.285,.042],[.275,.048],[.285,.054],[.28,.076],[.284,.099],[.28,.116],[.292,.136],[.323,.138],[.333,.158],[.357,.184],[.348,.189],[.359,.201],[.362,.212],[.404,.246],[.401,.26],[.417,.271],[.436,.268],[.451,.282],[.465,.285],[.474,.291],[.505,.322],[.557,.299],[.572,.311],[.583,.311],[.59,.302],[.598,.288],[.628,.282],[.63,.285],[.645,.282],[.661,.274],[.682,.277],[.721,.294],[.738,.328],[.738,.367],[.733,.381],[.74,.412],[.745,.424],[.738,.441],[.743,.455],[.745,.477],[.786,.503],[.779,.52],[.793,.528],[.801,.514],[.811,.517],[.818,.537],[.827,.545],[.855,.545],[.878,.556],[.906,.573],[.932,.607],[.951,.599],[.961,.607],[.978,.602],[.99,.621],[1,.621]],
 south:[[.109,0],[.086,.011],[.104,.017],[.095,.048],[.098,.09],[.092,.079],[.089,.085],[.09,.096],[.081,.105],[.089,.116],[.086,.133],[.074,.138],[.072,.15],[.085,.155],[.099,.167],[.083,.175],[.085,.201],[.099,.203],[.113,.234],[.117,.257],[.103,.254],[.1,.271],[.104,.285],[.073,.314],[.073,.297],[.059,.314],[.056,.353],[.055,.393],[.036,.424],[.029,.469],[.056,.427],[.105,.367],[.152,.331],[.182,.328],[.178,.347],[.191,.356],[.176,.384],[.154,.398],[.142,.424],[.15,.427],[.121,.469],[.082,.503],[.039,.545],[.057,.548],[.076,.542],[.073,.562],[.085,.556],[.065,.602],[.079,.607],[.098,.621],[.152,.599],[.169,.624],[.194,.627],[.23,.672],[.279,.669],[.283,.647],[.293,.669],[.337,.638],[.366,.602],[.493,.52],[.569,.486],[.615,.429],[.637,.435],[.655,.435],[.618,.508],[.605,.511],[.6,.534],[.611,.542],[.583,.633],[.577,.749],[.576,.862],[.594,.949],[.626,1]],
 qeshm:[[.557,.328],[.589,.333],[.605,.328],[.622,.325],[.626,.333],[.652,.319],[.659,.308],[.671,.305],[.66,.294],[.629,.299],[.615,.291],[.617,.311],[.587,.316]],
 hormuz:[[.688,.297],[.691,.302],[.697,.297],[.694,.291]],
 larak:[[.671,.328],[.684,.325],[.677,.314]],
 eastbound:[[.164,0],[.193,.186],[.353,.393],[.551,.418],[.645,.395],[.677,.449],[.66,.531],[.69,.72],[.767,.805],[1,.955]],
 westbound:[[1,.712],[.771,.61],[.723,.5],[.707,.37],[.659,.345],[.478,.347],[.346,.266],[.27,.172],[.25,0]]
};
function routeSample(points,t){
 const lengths=[];let total=0;
 for(let i=1;i<points.length;i++){const dx=points[i][0]-points[i-1][0],dy=points[i][1]-points[i-1][1];total+=Math.hypot(dx,dy);lengths.push(total)}
 const target=t*total;
 if(target<=0){const a=points[0],b=points[1],d=lengths[0]||1;return{x:a[0]+(b[0]-a[0])*target/d,y:a[1]+(b[1]-a[1])*target/d,angle:Math.atan2((b[1]-a[1])*H,(b[0]-a[0])*W)}}
 if(target>=total){const a=points.at(-2),b=points.at(-1),d=total-(lengths.at(-2)||0)||1,over=target-total;return{x:b[0]+(b[0]-a[0])*over/d,y:b[1]+(b[1]-a[1])*over/d,angle:Math.atan2((b[1]-a[1])*H,(b[0]-a[0])*W)}}
 let i=0;while(lengths[i]<target)i++;const prev=i?lengths[i-1]:0,a=points[i],b=points[i+1],u=(target-prev)/(lengths[i]-prev);
 return{x:a[0]+(b[0]-a[0])*u,y:a[1]+(b[1]-a[1])*u,angle:Math.atan2((b[1]-a[1])*H,(b[0]-a[0])*W)}
}
function placeShip(s){const p=routeSample(s.route,s.progress);s.x=p.x;s.y=p.y;s.angle=p.angle}

const battery={x:.63,y:.70},refinery={x:.62,y:.72,hp:2},terminal={x:.26,y:.78,hp:2};
const missileSites=[
 {x:.43,y:.115,hp:2,type:"missile"},{x:.61,y:.18,hp:2,type:"missile"},{x:.84,y:.30,hp:2,type:"missile"}
];
const droneSites=[
 {x:.36,y:.205,hp:1,type:"drone"},{x:.70,y:.255,hp:1,type:"drone"},{x:.91,y:.49,hp:1,type:"drone"}
];
const enemySites=[...missileSites,...droneSites];
function choose(list){return list[Math.floor(Math.random()*list.length)]}
function attackTarget(kind){
 const liveShips=ships.filter(s=>s.hp>0&&!s.done);
 const candidates=kind==="missile"?[...liveShips,...[refinery,terminal].filter(o=>o.hp>0)]:liveShips;
 if(!candidates.length)return null;
 const object=choose(candidates);
 return{object,x:object.x,y:object.y,kind:object===refinery||object===terminal?"base":"ship"};
}

function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener("resize",resize);resize();
function sx(v){return v*W} function sy(v){return v*H}
function reset(){
 state="playing";elapsed=spawnClock=0;spawned=0;ammo=18;gas=startGas;missiles=[];drones=[];interceptors=[];blasts=[];sparks=[];refinery.hp=2;terminal.hp=2;enemySites.forEach(s=>s.hp=s.type==="missile"?2:1);
 ships=[
  {progress:-.04,speed:.040,hp:1,name:"TANKER 01",done:false,route:MAP.eastbound},
  {progress:-.20,speed:.038,hp:1,name:"CARRIER 02",done:false,route:MAP.eastbound},
  {progress:-.36,speed:.036,hp:1,name:"TANKER 03",done:false,route:MAP.eastbound},
  {progress:-.52,speed:.034,hp:1,name:"FREIGHTER 04",done:false,route:MAP.eastbound},
  {progress:-.06,speed:.039,hp:1,name:"TANKER 05",done:false,route:MAP.westbound},
  {progress:-.30,speed:.035,hp:1,name:"FREIGHTER 06",done:false,route:MAP.westbound}
 ];ships.forEach(placeShip);
 ui.intro.classList.add("hidden");ui.result.classList.add("hidden");ui.status.textContent="READY";ui.ticker.textContent="DAY 1 ACTIVE — SIX VESSELS TRANSITING BOTH DIRECTIONS — DESTROY HOSTILE LAUNCH SITES —";updateHud();
}
function outcomes(){return{saved:ships.filter(s=>s.done).length,lost:ships.filter(s=>s.hp<=0).length}}
function updateHud(){const o=outcomes();ui.gas.textContent="$"+gas.toFixed(2);const d=gas-startGas;ui.change.textContent=(d>=0?"▲ +":"▼ -")+Math.abs(d).toFixed(2);ui.change.style.color=d>0?"#ff7138":"#9ee75b";ui.ammo.textContent=String(ammo).padStart(2,"0");ui.transits.textContent=String(o.saved).padStart(2,"0");ui.losses.textContent=String(o.lost).padStart(2,"0")}
function launch(x,y){if(state!=="playing"||paused||ammo<=0||y>H*.90)return;ammo--;interceptors.push({x:sx(battery.x),y:sy(battery.y),tx:x,ty:y,speed:620,trail:[]});updateHud()}
function spawnThreat(){
 const missileCount=spawned<TOTAL_MISSILES,droneCount=spawned>=TOTAL_MISSILES&&spawned<TOTAL_MISSILES+TOTAL_DRONES;
 const kind=missileCount?"missile":droneCount?"drone":null;
 if(!kind)return;
 const sites=(kind==="missile"?missileSites:droneSites).filter(s=>s.hp>0),target=attackTarget(kind);
 spawned++;
 if(!sites.length||!target)return;
 const site=choose(sites),x=sx(site.x),y=sy(site.y),tx=sx(target.x),ty=sy(target.y),distance=Math.hypot(tx-x,ty-y);
 const threat={x,y,startX:x,startY:y,tx,ty,target,age:0,duration:distance/(kind==="missile"?92+Math.random()*28:58+Math.random()*18),trail:[]};
 (kind==="missile"?missiles:drones).push(threat);
}
function blast(x,y,max=70,friendly=true){blasts.push({x,y,r:2,max,age:0,life:1.15,friendly,hitSites:new Set()});for(let i=0;i<14;i++)sparks.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,age:0,life:.35+Math.random()*.4})}
function hitTarget(m){
 blast(m.tx,m.ty,50,false);
 const radius=Math.min(W,H)*.055;
 const candidates=[...ships.filter(s=>s.hp>0&&!s.done),refinery,terminal];
 const hit=candidates.filter(t=>t.hp>0&&Math.hypot(sx(t.x)-m.tx,sy(t.y)-m.ty)<=radius).sort((a,b)=>Math.hypot(sx(a.x)-m.tx,sy(a.y)-m.ty)-Math.hypot(sx(b.x)-m.tx,sy(b.y)-m.ty))[0];
 if(hit){hit.hp--;gas=Math.min(7.99,gas+((hit===refinery||hit===terminal)?.28:.18));updateHud()}
}
function update(dt){
 if(state!=="playing"||paused)return;elapsed+=dt;spawnClock+=dt;
 if(spawned<TOTAL_MISSILES+TOTAL_DRONES&&spawnClock>Math.max(.58,1.28-elapsed*.011)){spawnClock=0;spawnThreat()}
 ships.forEach(s=>{if(s.hp>0&&!s.done){s.progress+=s.speed*dt;placeShip(s);if(s.progress>1.04){s.done=true;gas=Math.max(1.5,gas-.14);updateHud()}}});
 interceptors.forEach(i=>{const dx=i.tx-i.x,dy=i.ty-i.y,d=Math.hypot(dx,dy);i.trail.push([i.x,i.y]);if(i.trail.length>14)i.trail.shift();if(d<i.speed*dt){i.dead=true;blast(i.tx,i.ty,74,true)}else{i.x+=dx/d*i.speed*dt;i.y+=dy/d*i.speed*dt}});
 missiles.forEach(m=>{m.tx=sx(m.target.object.x);m.ty=sy(m.target.object.y);m.age+=dt;const t=Math.min(1,m.age/m.duration),u=1-t,controlX=(m.startX+m.tx)/2,controlY=Math.min(m.startY,m.ty)-H*MISSILE_ARC;m.trail.push([m.x,m.y]);if(m.trail.length>24)m.trail.shift();m.x=u*u*m.startX+2*u*t*controlX+t*t*m.tx;m.y=u*u*m.startY+2*u*t*controlY+t*t*m.ty;if(t>=1){m.dead=true;hitTarget(m)}});
 drones.forEach(d=>{d.tx=sx(d.target.object.x);d.ty=sy(d.target.object.y);d.age+=dt;const t=Math.min(1,d.age/d.duration);d.trail.push([d.x,d.y]);if(d.trail.length>18)d.trail.shift();d.x=d.startX+(d.tx-d.startX)*t;d.y=d.startY+(d.ty-d.startY)*t;if(t>=1){d.dead=true;hitTarget(d)}});
 blasts.forEach(b=>{b.age+=dt;const p=b.age/b.life;b.r=Math.sin(Math.min(1,p)*Math.PI)*b.max;if(b.age>b.life)b.dead=true;if(b.friendly){[...missiles,...drones].forEach(m=>{if(!m.dead&&Math.hypot(m.x-b.x,m.y-b.y)<b.r){m.dead=true;blast(m.x,m.y,44,true)}});enemySites.forEach(site=>{if(site.hp>0&&!b.hitSites.has(site)&&Math.hypot(sx(site.x)-b.x,sy(site.y)-b.y)<b.r){b.hitSites.add(site);site.hp--;blast(sx(site.x),sy(site.y),38,true)}})}});
 sparks.forEach(s=>{s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=90*dt;if(s.age>s.life)s.dead=true});
 missiles=missiles.filter(x=>!x.dead);drones=drones.filter(x=>!x.dead);interceptors=interceptors.filter(x=>!x.dead);blasts=blasts.filter(x=>!x.dead);sparks=sparks.filter(x=>!x.dead);
 if(ships.length&&ships.every(s=>s.done||s.hp<=0))finish();
}
function finish(){
 state="result";missiles=[];drones=[];interceptors=[];const {saved,lost}=outcomes();
 ui.resultTitle.textContent=lost===0?"STRAIT HELD":saved?"CONVOY DAMAGED":"CONVOY LOST";
 ui.resultCopy.textContent=saved+" of 6 vessels cleared · "+lost+" lost · Closing gas price $"+gas.toFixed(2);
 ui.result.classList.remove("hidden");ui.status.textContent="COMPLETE";ui.ticker.textContent="DAY 1 COMPLETE — "+saved+" TRANSITS — "+lost+" LOSSES — CLOSING GAS PRICE $"+gas.toFixed(2)+" —";
}
function polygonPath(points){ctx.beginPath();points.forEach((p,i)=>(i?ctx.lineTo(...p):ctx.moveTo(...p)));ctx.closePath()}
function poly(points,fill,stroke){polygonPath(points);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function hatchPolygon(points,spacing=24,slant=.12){
 ctx.save();polygonPath(points);ctx.clip();ctx.strokeStyle="#68a73922";ctx.lineWidth=.7;
 const shift=W*slant,margin=Math.abs(shift)+spacing;
 for(let x=-margin;x<W+margin;x+=spacing){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+shift,H);ctx.stroke()}
 ctx.restore();
}
function drawSea(){
 const g=ctx.createRadialGradient(W*.62,H*.44,10,W*.55,H*.45,W*.75);g.addColorStop(0,"#123c25");g.addColorStop(.55,"#092719");g.addColorStop(1,"#03140d");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.strokeStyle="#91d84b18";ctx.lineWidth=1;for(let y=H*.13;y<H;y+=20){ctx.beginPath();for(let x=-40;x<=W+40;x+=30)ctx.lineTo(x,y+Math.sin(x*.021+y*.012)*2);ctx.stroke()}ctx.restore();
}
function coast(points){ctx.strokeStyle="#a8d93c";ctx.lineWidth=1.5;ctx.shadowColor="#72c83c";ctx.shadowBlur=5;ctx.beginPath();points.forEach((p,i)=>(i?ctx.lineTo(p[0]*W,p[1]*H):ctx.moveTo(p[0]*W,p[1]*H)));ctx.stroke();ctx.shadowBlur=0}
function pixels(points){return points.map(([x,y])=>[sx(x),sy(y)])}
function drawLand(){
 const northLand=pixels([[0,0],...MAP.north,[1,0]]),southLand=pixels([...MAP.south,[1,1],[0,1],[0,0]]);
 poly(northLand,"#172d15");hatchPolygon(northLand);
 poly(southLand,"#183016");hatchPolygon(southLand);
 [MAP.qeshm,MAP.hormuz,MAP.larak].forEach(island=>{const shape=pixels(island);poly(shape,"#1c3518");hatchPolygon(shape,7);poly(shape,"transparent","#95cc3d")});
 coast(MAP.north);coast(MAP.south);
}
function traceRoute(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(sx(x),sy(y)):ctx.moveTo(sx(x),sy(y)));ctx.stroke()}
function drawLane(){ctx.save();ctx.lineWidth=1.25;ctx.setLineDash([6,8]);ctx.strokeStyle="#8fe548aa";traceRoute(MAP.eastbound);ctx.strokeStyle="#74bd4290";traceRoute(MAP.westbound);ctx.restore()}
function drawInfrastructure(o){const x=sx(o.x),y=sy(o.y);ctx.save();ctx.translate(x,y);ctx.strokeStyle=o.hp?"#d8c849":"#863b24";ctx.lineWidth=1.5;ctx.strokeRect(-20,-10,40,13);ctx.beginPath();ctx.arc(-10,-11,6,Math.PI,0);ctx.arc(9,-11,6,Math.PI,0);ctx.stroke();ctx.restore()}
function drawShip(s){if(s.hp<=0){ctx.fillStyle="#6f351f";ctx.fillRect(sx(s.x)-14,sy(s.y),29,2);return}if(s.done)return;const x=sx(s.x),y=sy(s.y);ctx.save();ctx.translate(x,y);ctx.rotate(s.angle||0);ctx.scale(.78,.78);poly([[-28,-4],[26,-4],[19,6],[-22,6]],"#18331b","#b7e34b");ctx.fillStyle="#9fd947";ctx.fillRect(-8,-13,20,8);ctx.fillRect(-20,-9,9,4);ctx.fillRect(14,-9,7,4);ctx.fillRect(1,-20,3,7);ctx.restore()}
function drawBattery(){const x=sx(battery.x),y=sy(battery.y);ctx.strokeStyle="#d8c849";ctx.lineWidth=2;ctx.strokeRect(x-18,y-6,36,12);ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+14,y-25);ctx.stroke()}
function drawTargetZones(){
 ctx.save();ctx.strokeStyle="#ff9b4daa";ctx.lineWidth=1;ctx.setLineDash([3,3]);
 new Set([...missiles,...drones].map(t=>t.target.object)).forEach(object=>{const x=sx(object.x),y=sy(object.y);ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.moveTo(x,y-10);ctx.lineTo(x,y+10);ctx.stroke()});
 ctx.restore();
}
function drawEnemySite(site){
 const x=sx(site.x),y=sy(site.y);ctx.save();ctx.translate(x,y);ctx.strokeStyle=site.hp?"#f06d3d":"#69331f";ctx.fillStyle=site.hp?"#351812":"#1b110e";ctx.lineWidth=1.4;
 if(site.type==="missile"){ctx.fillRect(-10,-7,20,14);ctx.strokeRect(-10,-7,20,14);ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(5,-22);ctx.moveTo(2,-8);ctx.lineTo(11,-22);ctx.stroke()}
 else{ctx.beginPath();ctx.arc(0,0,8,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.moveTo(0,-12);ctx.lineTo(0,12);ctx.stroke()}
 ctx.restore();
}
function drawThreatShape(t,type){
 const prev=t.trail.at(-2)||[t.startX,t.startY],angle=Math.atan2(t.y-prev[1],t.x-prev[0]);ctx.save();ctx.translate(t.x,t.y);ctx.rotate(angle);ctx.fillStyle=type==="missile"?"#ffb04d":"#ff8a55";ctx.strokeStyle="#ffd79a";ctx.lineWidth=1;
 ctx.beginPath();if(type==="missile"){ctx.moveTo(8,0);ctx.lineTo(-4,-3);ctx.lineTo(-8,-6);ctx.lineTo(-7,0);ctx.lineTo(-8,6);ctx.lineTo(-4,3)}
 else{ctx.moveTo(8,0);ctx.lineTo(-4,-3);ctx.lineTo(-10,-1);ctx.lineTo(-3,2);ctx.lineTo(-7,6);ctx.lineTo(1,3)}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function drawObjects(){
 drawTargetZones();drawInfrastructure(refinery);drawInfrastructure(terminal);ships.forEach(drawShip);enemySites.forEach(drawEnemySite);drawBattery();
 missiles.forEach(m=>{ctx.strokeStyle="#ff7138bb";ctx.lineWidth=2;ctx.beginPath();m.trail.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();drawThreatShape(m,"missile")});
 drones.forEach(d=>{ctx.strokeStyle="#ff8a55aa";ctx.lineWidth=1.5;ctx.beginPath();d.trail.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();drawThreatShape(d,"drone")});
 interceptors.forEach(i=>{ctx.strokeStyle="#b8fff0cc";ctx.lineWidth=2;ctx.beginPath();i.trail.forEach((p,n)=>n?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.fillStyle="#fff";ctx.fillRect(i.x-2,i.y-2,4,4)});
 blasts.forEach(b=>{const a=1-b.age/b.life;ctx.strokeStyle=(b.friendly?"rgba(185,255,224,":"rgba(255,113,56,")+a+")";ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.stroke()});sparks.forEach(s=>{ctx.fillStyle="#ffe164";ctx.fillRect(s.x,s.y,2,2)});
}
function render(){drawSea();drawLand();drawLane();drawObjects();if(paused){ctx.fillStyle="#020b07dd";ctx.fillRect(0,0,W,H);ctx.fillStyle="#a9ea55";ctx.font="700 48px Barlow Condensed";ctx.textAlign="center";ctx.fillText("PAUSED",W/2,H/2);ctx.textAlign="left"}}
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);
canvas.addEventListener("pointerdown",e=>{const r=canvas.getBoundingClientRect();launch(e.clientX-r.left,e.clientY-r.top)});
document.getElementById("start").onclick=reset;ui.intro.addEventListener("click",e=>{if(e.target!==document.getElementById("start"))reset()});document.getElementById("restart").onclick=reset;
addEventListener("keydown",e=>{if(e.key==="Escape"&&state==="playing"){paused=!paused;ui.status.textContent=paused?"PAUSED":"READY"}});
