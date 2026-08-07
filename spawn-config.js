"use strict";

// Randomize hostile launcher type from the first spawn onward.
// Missile and drone sites receive equal selection weight instead of
// waiting for the missile sequence to complete before drones can appear.
spawnThreat=function(){
 const kind=Math.random()<.5?"missile":"drone";
 const sites=(kind==="missile"?missileSites:droneSites).filter(s=>s.hp>0&&airborneFrom(s)<projectileLimit());
 if(!sites.length)return;
 const target=attackTarget(kind);
 if(!target)return;
 const site=choose(sites);spawned++;site.active=true;
 const x=sx(site.x),y=sy(site.y),tx=sx(target.x),ty=sy(target.y),distance=Math.hypot(tx-x,ty-y);
 const threat={x,y,startX:x,startY:y,tx,ty,target,site,age:0,duration:distance/(kind==="missile"?92+Math.random()*28:58+Math.random()*18),trail:[]};
 (kind==="missile"?missiles:drones).push(threat);
};
