"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const ui={gas:document.getElementById("gas-price"),change:document.getElementById("gas-change"),ammo:document.getElementById("ammo"),status:document.getElementById("status"),intro:document.getElementById("intro"),result:document.getElementById("result"),resultTitle:document.getElementById("result-title"),resultCopy:document.getElementById("result-copy"),ticker:document.getElementById("ticker-text"),transits:document.getElementById("transits"),losses:document.getElementById("losses")};
let W=0,H=0,dpr=1,state="intro",last=0,elapsed=0,spawnClock=0,spawned=0,ammo=18,gas=3.47,startGas=3.47,paused=false;
let missiles=[],interceptors=[],blasts=[],ships=[],sparks=[];
const TOTAL_MISSILES=16,battery={x:.63,y:.70},refinery={x:.62,y:.72,hp:2},terminal={x:.26,y:.78,hp:2};

function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener("resize",resize);resize();
function sx(v){return v*W} function sy(v){return v*H}
function reset(){
 state="playing";elapsed=spawnClock=0;spawned=0;ammo=18;gas=startGas;missiles=[];interceptors=[];blasts=[];sparks=[];refinery.hp=2;terminal.hp=2;
 ships=[
  {x:-.07,y:.53,lane:-.006,speed:.034,hp:1,name:"TANKER 01",done:false},
  {x:-.27,y:.54,lane:.006,speed:.032,hp:1,name:"CARRIER 02",done:false},
  {x:-.47,y:.53,lane:-.003,speed:.030,hp:1,name:"TANKER 03",done:false},
  {x:-.67,y:.54,lane:.003,speed:.028,hp:1,name:"FREIGHTER 04",done:false}
 ];
 ui.intro.classList.add("hidden");ui.result.classList.add("hidden");ui.status.textContent="READY";ui.ticker.textContent="DAY 1 ACTIVE — FOUR VESSELS ENTERING THE STRAIT — PROTECT ALL SHIPPING —";updateHud();
}
function outcomes(){return{saved:ships.filter(s=>s.done).length,lost:ships.filter(s=>s.hp<=0).length}}
function updateHud(){const o=outcomes();ui.gas.textContent="$"+gas.toFixed(2);const d=gas-startGas;ui.change.textContent=(d>=0?"▲ +":"▼ -")+Math.abs(d).toFixed(2);ui.change.style.color=d>0?"#ff7138":"#9ee75b";ui.ammo.textContent=String(ammo).padStart(2,"0");ui.transits.textContent=String(o.saved).padStart(2,"0");ui.losses.textContent=String(o.lost).padStart(2,"0")}
function launch(x,y){if(state!=="playing"||paused||ammo<=0||y>H*.90)return;ammo--;interceptors.push({x:sx(battery.x),y:sy(battery.y),tx:x,ty:y,speed:620,trail:[]});updateHud()}
function spawnMissile(){
 const targets=[...ships.filter(s=>s.hp>0&&!s.done),refinery,terminal];if(!targets.length)return;
 const t=targets[Math.floor(Math.random()*targets.length)],tx=t.x+(Math.random()-.5)*.025,ty=t.y;
 missiles.push({x:sx(.30+Math.random()*.62),y:sy(.05+Math.random()*.10),tx:sx(tx),ty:sy(ty),speed:75+Math.random()*32,target:t,trail:[]});spawned++;
}
function blast(x,y,max=70,friendly=true){blasts.push({x,y,r:2,max,age:0,life:1.15,friendly});for(let i=0;i<14;i++)sparks.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,age:0,life:.35+Math.random()*.4})}
function hitTarget(m){if(m.target.hp<=0||m.target.done)return;m.target.hp--;blast(m.tx,m.ty,50,false);gas=Math.min(7.99,gas+(m.target===refinery||m.target===terminal?.28:.18));updateHud()}
function update(dt){
 if(state!=="playing"||paused)return;elapsed+=dt;spawnClock+=dt;
 if(spawned<TOTAL_MISSILES&&spawnClock>Math.max(.58,1.35-elapsed*.012)){spawnClock=0;spawnMissile()}
 ships.forEach(s=>{if(s.hp>0&&!s.done){s.x+=s.speed*dt;const p=Math.max(0,Math.min(1,(s.x+.07)/1.14));s.y=.535-.085*Math.sin(p*Math.PI)-.010*p+s.lane;if(s.x>1.07){s.done=true;gas=Math.max(1.5,gas-.14);updateHud()}}});
 interceptors.forEach(i=>{const dx=i.tx-i.x,dy=i.ty-i.y,d=Math.hypot(dx,dy);i.trail.push([i.x,i.y]);if(i.trail.length>14)i.trail.shift();if(d<i.speed*dt){i.dead=true;blast(i.tx,i.ty,74,true)}else{i.x+=dx/d*i.speed*dt;i.y+=dy/d*i.speed*dt}});
 missiles.forEach(m=>{if(m.target.done||m.target.hp<=0){m.dead=true;return}const dx=m.tx-m.x,dy=m.ty-m.y,d=Math.hypot(dx,dy);m.trail.push([m.x,m.y]);if(m.trail.length>24)m.trail.shift();if(d<m.speed*dt){m.dead=true;hitTarget(m)}else{m.x+=dx/d*m.speed*dt;m.y+=dy/d*m.speed*dt}});
 blasts.forEach(b=>{b.age+=dt;const p=b.age/b.life;b.r=Math.sin(Math.min(1,p)*Math.PI)*b.max;if(b.age>b.life)b.dead=true;if(b.friendly)missiles.forEach(m=>{if(!m.dead&&Math.hypot(m.x-b.x,m.y-b.y)<b.r){m.dead=true;blast(m.x,m.y,44,true)}})});
 sparks.forEach(s=>{s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=90*dt;if(s.age>s.life)s.dead=true});
 missiles=missiles.filter(x=>!x.dead);interceptors=interceptors.filter(x=>!x.dead);blasts=blasts.filter(x=>!x.dead);sparks=sparks.filter(x=>!x.dead);
 if(ships.length&&ships.every(s=>s.done||s.hp<=0))finish();
}
function finish(){
 state="result";missiles=[];interceptors=[];const {saved,lost}=outcomes();
 ui.resultTitle.textContent=lost===0?"STRAIT HELD":saved?"CONVOY DAMAGED":"CONVOY LOST";
 ui.resultCopy.textContent=saved+" of 4 vessels cleared · "+lost+" lost · Closing gas price $"+gas.toFixed(2);
 ui.result.classList.remove("hidden");ui.status.textContent="COMPLETE";ui.ticker.textContent="DAY 1 COMPLETE — "+saved+" TRANSITS — "+lost+" LOSSES — CLOSING GAS PRICE $"+gas.toFixed(2)+" —";
}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>(i?ctx.lineTo(...p):ctx.moveTo(...p)));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawSea(){
 const g=ctx.createRadialGradient(W*.62,H*.44,10,W*.55,H*.45,W*.75);g.addColorStop(0,"#123c25");g.addColorStop(.55,"#092719");g.addColorStop(1,"#03140d");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.strokeStyle="#91d84b18";ctx.lineWidth=1;for(let y=H*.13;y<H;y+=20){ctx.beginPath();for(let x=-40;x<=W+40;x+=30)ctx.lineTo(x,y+Math.sin(x*.021+y*.012)*2);ctx.stroke()}ctx.restore();
}
function coast(points){ctx.strokeStyle="#a8d93c";ctx.lineWidth=1.5;ctx.shadowColor="#72c83c";ctx.shadowBlur=5;ctx.beginPath();points.forEach((p,i)=>(i?ctx.lineTo(p[0]*W,p[1]*H):ctx.moveTo(p[0]*W,p[1]*H)));ctx.stroke();ctx.shadowBlur=0}
function drawLand(){
 const north=[[0,0],[1,0],[1,.24],[.96,.25],[.92,.29],[.87,.30],[.83,.34],[.78,.35],[.74,.33],[.70,.35],[.66,.33],[.61,.36],[.56,.34],[.52,.38],[.47,.37],[.43,.40],[.38,.39],[.33,.43],[.28,.41],[.23,.44],[.18,.43],[.13,.47],[.08,.45],[.04,.49],[0,.48]];
 const south=[[0,.74],[.06,.72],[.12,.69],[.18,.67],[.24,.63],[.30,.61],[.36,.57],[.42,.55],[.48,.51],[.53,.48],[.57,.50],[.59,.56],[.58,.62],[.61,.67],[.67,.70],[.73,.72],[.80,.75],[.88,.78],[.95,.79],[1,.81],[1,1],[0,1]];
 poly(north,"#172d15");poly(south,"#183016");coast(north.slice(2));coast(south.slice(0,20));
 ctx.strokeStyle="#68a73922";ctx.lineWidth=.7;for(let i=0;i<34;i++){ctx.beginPath();ctx.moveTo((i*.079%1)*W,0);ctx.lineTo(((i*.079+.12)%1)*W,H*.39);ctx.stroke();ctx.beginPath();ctx.moveTo((i*.091%1)*W,H);ctx.lineTo(((i*.091+.07)%1)*W,H*.66);ctx.stroke()}
 poly([[W*.455,H*.395],[W*.480,H*.375],[W*.515,H*.382],[W*.505,H*.405],[W*.468,H*.410]],"#1c3518","#95cc3d");
 poly([[W*.625,H*.365],[W*.642,H*.350],[W*.660,H*.358],[W*.654,H*.380],[W*.633,H*.383]],"#1c3518","#95cc3d");
 poly([[W*.765,H*.342],[W*.774,H*.336],[W*.781,H*.347],[W*.772,H*.355]],"#1c3518","#95cc3d");
}
function drawLane(){ctx.save();ctx.strokeStyle="#8fe54899";ctx.lineWidth=1.5;ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(-20,H*.535);ctx.bezierCurveTo(W*.30,H*.535,W*.52,H*.405,W+20,H*.525);ctx.stroke();ctx.restore()}
function drawInfrastructure(o,label){const x=sx(o.x),y=sy(o.y);ctx.save();ctx.translate(x,y);ctx.strokeStyle=o.hp?"#d8c849":"#863b24";ctx.lineWidth=1.5;ctx.strokeRect(-20,-10,40,13);ctx.beginPath();ctx.arc(-10,-11,6,Math.PI,0);ctx.arc(9,-11,6,Math.PI,0);ctx.stroke();ctx.fillStyle="#d8c849";ctx.font="10px Share Tech Mono";ctx.fillText(label,-31,19);ctx.restore()}
function drawShip(s){if(s.hp<=0){ctx.fillStyle="#6f351f";ctx.fillRect(sx(s.x)-14,sy(s.y),29,2);return}if(s.done)return;const x=sx(s.x),y=sy(s.y);ctx.save();ctx.translate(x,y);ctx.scale(.78,.78);poly([[-28,-4],[26,-4],[19,6],[-22,6]],"#18331b","#b7e34b");ctx.fillStyle="#9fd947";ctx.fillRect(-8,-13,20,8);ctx.fillRect(-20,-9,9,4);ctx.fillRect(14,-9,7,4);ctx.fillRect(1,-20,3,7);ctx.restore()}
function drawBattery(){const x=sx(battery.x),y=sy(battery.y);ctx.strokeStyle="#d8c849";ctx.lineWidth=2;ctx.strokeRect(x-18,y-6,36,12);ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+14,y-25);ctx.stroke()}
function drawObjects(){
 drawInfrastructure(refinery,"AL MINHAD");drawInfrastructure(terminal,"AL DHAFRA");ships.forEach(drawShip);drawBattery();
 missiles.forEach(m=>{ctx.strokeStyle="#ff7138bb";ctx.lineWidth=2;ctx.beginPath();m.trail.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.fillStyle="#ffb04d";ctx.beginPath();ctx.arc(m.x,m.y,3,0,7);ctx.fill()});
 interceptors.forEach(i=>{ctx.strokeStyle="#b8fff0cc";ctx.lineWidth=2;ctx.beginPath();i.trail.forEach((p,n)=>n?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.fillStyle="#fff";ctx.fillRect(i.x-2,i.y-2,4,4)});
 blasts.forEach(b=>{const a=1-b.age/b.life;ctx.strokeStyle=(b.friendly?"rgba(185,255,224,":"rgba(255,113,56,")+a+")";ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.stroke()});sparks.forEach(s=>{ctx.fillStyle="#ffe164";ctx.fillRect(s.x,s.y,2,2)});
}
function drawLabels(){ctx.save();ctx.textAlign="center";ctx.fillStyle="#abd850aa";ctx.font="18px Share Tech Mono";ctx.fillText("I R A N",W*.58,H*.16);ctx.font="14px Share Tech Mono";ctx.fillText("U A E",W*.33,H*.83);ctx.fillText("O M A N",W*.76,H*.88);ctx.fillStyle="#8bc46c88";ctx.font="13px Share Tech Mono";ctx.fillText("P E R S I A N   G U L F",W*.17,H*.56);ctx.fillText("G U L F   O F   O M A N",W*.85,H*.55);ctx.fillStyle="#d8c849";ctx.font="11px Share Tech Mono";ctx.fillText("Qeshm Island",W*.485,H*.365);ctx.fillText("Hormuz Island",W*.645,H*.335);ctx.fillText("Dubai",W*.45,H*.75);ctx.fillText("Fujairah",W*.72,H*.72);ctx.save();ctx.translate(W*.48,H*.49);ctx.rotate(-.13);ctx.fillStyle="#9ee75b";ctx.fillText("EASTBOUND SHIPPING LANE",0,0);ctx.restore();ctx.restore()}
function render(){drawSea();drawLand();drawLane();drawLabels();drawObjects();if(paused){ctx.fillStyle="#020b07dd";ctx.fillRect(0,0,W,H);ctx.fillStyle="#a9ea55";ctx.font="700 48px Barlow Condensed";ctx.textAlign="center";ctx.fillText("PAUSED",W/2,H/2);ctx.textAlign="left"}}
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);
canvas.addEventListener("pointerdown",e=>{const r=canvas.getBoundingClientRect();launch(e.clientX-r.left,e.clientY-r.top)});
document.getElementById("start").onclick=reset;ui.intro.addEventListener("click",e=>{if(e.target!==document.getElementById("start"))reset()});document.getElementById("restart").onclick=reset;
addEventListener("keydown",e=>{if(e.key==="Escape"&&state==="playing"){paused=!paused;ui.status.textContent=paused?"PAUSED":"READY"}});
