"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const ui={gas:document.getElementById("gas-price"),change:document.getElementById("gas-change"),ammo:document.getElementById("ammo"),status:document.getElementById("status"),intro:document.getElementById("intro"),result:document.getElementById("result"),resultTitle:document.getElementById("result-title"),resultCopy:document.getElementById("result-copy"),ticker:document.getElementById("ticker-text")};
let W=0,H=0,dpr=1,state="intro",last=0,elapsed=0,spawnClock=0,spawned=0,ammo=18,gas=3.41,startGas=3.41,paused=false;
let missiles=[],interceptors=[],blasts=[],ships=[],sparks=[];
const TOTAL=16, battery={x:.39,y:.80}, refinery={x:.56,y:.63,hp:2}, terminal={x:.24,y:.73,hp:2};

function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener("resize",resize);resize();
function sx(v){return v*W} function sy(v){return v*H}
function reset(){
 state="playing";elapsed=spawnClock=0;spawned=0;ammo=18;gas=startGas;missiles=[];interceptors=[];blasts=[];sparks=[];refinery.hp=2;terminal.hp=2;
 ships=[{x:-.08,y:.67,lane:-.025,speed:.019,hp:1,name:"TANKER 01",done:false},{x:-.28,y:.72,lane:.018,speed:.017,hp:1,name:"TANKER 02",done:false},{x:-.50,y:.77,lane:.055,speed:.015,hp:1,name:"ESCORT 03",done:false}];
 ui.intro.classList.add("hidden");ui.result.classList.add("hidden");ui.status.textContent="ACTIVE";ui.ticker.textContent="DAY 1 ACTIVE · PROTECT THE CONVOY · CLICK TO LAUNCH INTERCEPTORS ·";updateHud();
}
function updateHud(){ui.gas.textContent="$"+gas.toFixed(2);const d=gas-startGas;ui.change.textContent=(d>=0?"▲ +$":"▼ -$")+Math.abs(d).toFixed(2);ui.change.style.color=d>0?"#ff5a3d":"#65d7d0";ui.ammo.textContent=ammo}
function launch(x,y){if(state!=="playing"||paused||ammo<=0||y>H*.85)return;ammo--;interceptors.push({x:sx(battery.x),y:sy(battery.y),tx:x,ty:y,speed:620,trail:[]});updateHud()}
function spawnMissile(){
 const targets=[...ships.filter(s=>s.hp>0&&!s.done),refinery,terminal];if(!targets.length)return;
 const t=targets[Math.floor(Math.random()*targets.length)],tx=t.x+(Math.random()-.5)*.025,ty=t.y;
 missiles.push({x:sx(.10+Math.random()*.78),y:sy(.05+Math.random()*.14),tx:sx(tx),ty:sy(ty),speed:75+Math.random()*32,target:t,trail:[]});spawned++;
}
function blast(x,y,max=70,friendly=true){blasts.push({x,y,r:2,max,age:0,life:1.15,friendly});for(let i=0;i<14;i++)sparks.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,age:0,life:.35+Math.random()*.4})}
function hitTarget(m){
 m.target.hp--;blast(m.tx,m.ty,50,false);gas=Math.min(7.99,gas+(m.target===refinery||m.target===terminal?.28:.18));updateHud();
}
function update(dt){
 if(state!=="playing"||paused)return;elapsed+=dt;spawnClock+=dt;
 if(spawned<TOTAL&&spawnClock>Math.max(.52,1.28-elapsed*.012)){spawnClock=0;spawnMissile()}
 ships.forEach(s=>{if(s.hp>0&&!s.done){s.x+=s.speed*dt;s.y=.665-.245*Math.max(0,Math.min(1,(s.x+.08)/1.16))+s.lane;if(s.x>1.08){s.done=true;gas=Math.max(1.5,gas-.14);updateHud();}}});
 interceptors.forEach(i=>{const dx=i.tx-i.x,dy=i.ty-i.y,d=Math.hypot(dx,dy);i.trail.push([i.x,i.y]);if(i.trail.length>14)i.trail.shift();if(d<i.speed*dt){i.dead=true;blast(i.tx,i.ty,74,true)}else{i.x+=dx/d*i.speed*dt;i.y+=dy/d*i.speed*dt}});
 missiles.forEach(m=>{const dx=m.tx-m.x,dy=m.ty-m.y,d=Math.hypot(dx,dy);m.trail.push([m.x,m.y]);if(m.trail.length>24)m.trail.shift();if(d<m.speed*dt){m.dead=true;hitTarget(m)}else{m.x+=dx/d*m.speed*dt;m.y+=dy/d*m.speed*dt}});
 blasts.forEach(b=>{b.age+=dt;const p=b.age/b.life;b.r=Math.sin(Math.min(1,p)*Math.PI)*b.max;if(b.age>b.life)b.dead=true;if(b.friendly)missiles.forEach(m=>{if(!m.dead&&Math.hypot(m.x-b.x,m.y-b.y)<b.r){m.dead=true;blast(m.x,m.y,44,true)}})});
 sparks.forEach(s=>{s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=90*dt;if(s.age>s.life)s.dead=true});
 missiles=missiles.filter(x=>!x.dead);interceptors=interceptors.filter(x=>!x.dead);blasts=blasts.filter(x=>!x.dead);sparks=sparks.filter(x=>!x.dead);
 if(spawned===TOTAL&&!missiles.length&&!interceptors.length&&!blasts.length)finish();
}
function finish(){
 state="result";const saved=ships.filter(s=>s.done).length,lost=ships.filter(s=>s.hp<=0).length;
 ui.resultTitle.textContent=gas<=startGas?"STRAIT HELD":"SUPPLY SHOCK";
 ui.resultCopy.textContent=saved+" vessels cleared · "+lost+" lost · Closing gas price $"+gas.toFixed(2);
 ui.result.classList.remove("hidden");ui.status.textContent="COMPLETE";ui.ticker.textContent="DAY 1 COMPLETE · CLOSING GAS PRICE $"+gas.toFixed(2)+" · "+(gas<=startGas?"STRAIT REMAINS OPEN ·":"MARKETS REACT TO LOSSES ·");
}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>(i?ctx.lineTo(...p):ctx.moveTo(...p)));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawSea(){
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#274954");g.addColorStop(.48,"#163b48");g.addColorStop(1,"#082633");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.strokeStyle="#74aeb21c";ctx.lineWidth=1;for(let y=H*.16;y<H;y+=26){ctx.beginPath();for(let x=-40;x<=W+40;x+=35){ctx.lineTo(x,y+Math.sin(x*.021+y*.012)*3)}ctx.stroke()}
 ctx.strokeStyle="#7eb8b515";for(let x=-W*.2;x<W*1.2;x+=W*.08){ctx.beginPath();ctx.moveTo(W*.53+(x-W*.53)*.45,0);ctx.lineTo(x,H);ctx.stroke()}ctx.restore();
}
function drawLand(){
 poly([[0,0],[W,0],[W,H*.245],[W*.92,H*.275],[W*.84,H*.255],[W*.77,H*.29],[W*.69,H*.275],[W*.62,H*.325],[W*.55,H*.305],[W*.48,H*.355],[W*.39,H*.33],[W*.30,H*.385],[W*.20,H*.36],[W*.10,H*.405],[0,H*.395]],"#a78458","#d2b177");
 poly([[0,H*.765],[W*.11,H*.735],[W*.21,H*.695],[W*.32,H*.685],[W*.41,H*.645],[W*.47,H*.575],[W*.515,H*.505],[W*.555,H*.535],[W*.575,H*.615],[W*.64,H*.685],[W*.76,H*.72],[W*.87,H*.695],[W,H*.705],[W,H],[0,H]],"#987448","#cba76c");
 ctx.fillStyle="#5d472f";for(let i=0;i<110;i++){const x=((i*83)%107)/107*W,y=i%2?H*(.02+((i*47)%31)/100):H*(.70+((i*29)%27)/100);ctx.fillRect(x,y,2,2)}
}
function drawInfrastructure(o,label){
 const x=sx(o.x),y=sy(o.y);ctx.save();ctx.translate(x,y);ctx.fillStyle=o.hp?"#1b2527":"#311714";ctx.strokeStyle=o.hp?"#e6c88f":"#6e362d";ctx.lineWidth=2;
 ctx.fillRect(-32,-16,64,20);ctx.strokeRect(-32,-16,64,20);for(let i=-20;i<=20;i+=20){ctx.beginPath();ctx.arc(i,-18,10,Math.PI,0);ctx.stroke()}
 ctx.fillStyle="#061115";ctx.font="10px Share Tech Mono";ctx.fillText(label,-32,18);ctx.restore()
}
function drawShip(s){
 if(s.hp<=0){ctx.fillStyle="#291512";ctx.fillRect(sx(s.x)-18,sy(s.y),38,4);return}if(s.done)return;
 const x=sx(s.x),y=sy(s.y);ctx.save();ctx.translate(x,y);poly([[-34,-5],[30,-5],[22,7],[-25,7]],"#172327","#d6c394");ctx.fillStyle="#cfb26e";ctx.fillRect(-10,-16,24,10);ctx.fillStyle="#b14a32";ctx.fillRect(-28,-11,13,5);ctx.fillRect(16,-11,9,5);ctx.fillStyle="#d9d1b6";ctx.fillRect(0,-24,4,8);ctx.restore();
}
function drawBattery(){const x=sx(battery.x),y=sy(battery.y);ctx.fillStyle="#152126";ctx.fillRect(x-25,y-8,50,16);ctx.strokeStyle="#ffc464";ctx.strokeRect(x-25,y-8,50,16);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x+16,y-29);ctx.stroke()}
function drawObjects(){
 drawInfrastructure(refinery,"KHASAB / OMAN");drawInfrastructure(terminal,"ALLIED DEPOT / UAE");ships.forEach(drawShip);drawBattery();
 missiles.forEach(m=>{ctx.strokeStyle="#ff6848aa";ctx.lineWidth=2;ctx.beginPath();m.trail.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.fillStyle="#ffd6a0";ctx.beginPath();ctx.arc(m.x,m.y,3,0,7);ctx.fill()});
 interceptors.forEach(i=>{ctx.strokeStyle="#83f5e0bb";ctx.lineWidth=2;ctx.beginPath();i.trail.forEach((p,n)=>n?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.fillStyle="#fff";ctx.fillRect(i.x-2,i.y-2,4,4)});
 blasts.forEach(b=>{const a=1-b.age/b.life;ctx.strokeStyle=(b.friendly?"rgba(101,215,208,":"rgba(255,90,61,")+a+")";ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.stroke();ctx.fillStyle=(b.friendly?"rgba(101,215,208,":"rgba(255,90,61,")+(a*.12)+")";ctx.fill()});
 sparks.forEach(s=>{ctx.fillStyle="#ffc45c";ctx.fillRect(s.x,s.y,2,2)});
}
function drawLabels(){ctx.save();ctx.fillStyle="#e2c99588";ctx.font="10px Share Tech Mono";ctx.fillText("IRAN",W*.54,H*.17);ctx.fillText("UNITED ARAB EMIRATES",W*.10,H*.88);ctx.fillText("MUSANDAM · OMAN",W*.50,H*.79);ctx.fillStyle="#9cc7c688";ctx.fillText("PERSIAN GULF",W*.12,H*.55);ctx.fillText("GULF OF OMAN",W*.80,H*.49);ctx.translate(W*.48,H*.49);ctx.rotate(-.17);ctx.fillStyle="#f0d39caa";ctx.fillText("STRAIT OF HORMUZ",0,0);ctx.restore();ctx.strokeStyle="#ffc15877";ctx.lineWidth=1.5;ctx.setLineDash([7,9]);ctx.beginPath();ctx.moveTo(-20,H*.69);ctx.quadraticCurveTo(W*.52,H*.52,W+20,H*.40);ctx.stroke();ctx.setLineDash([])}
function render(){drawSea();drawLand();drawLabels();drawObjects();if(paused){ctx.fillStyle="#02090dcc";ctx.fillRect(0,0,W,H);ctx.fillStyle="#ffbd54";ctx.font="700 48px Barlow Condensed";ctx.textAlign="center";ctx.fillText("PAUSED",W/2,H/2);ctx.textAlign="left"}}
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);
canvas.addEventListener("pointerdown",e=>{const r=canvas.getBoundingClientRect();launch(e.clientX-r.left,e.clientY-r.top)});
document.getElementById("start").onclick=reset;ui.intro.addEventListener("click",e=>{if(e.target!==document.getElementById("start"))reset()});document.getElementById("restart").onclick=reset;
addEventListener("keydown",e=>{if(e.key==="Escape"&&state==="playing"){paused=!paused;ui.status.textContent=paused?"PAUSED":"ACTIVE"}});
