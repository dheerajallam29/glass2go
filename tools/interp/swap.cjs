const fs=require('fs');const path=require('path');
const PUB='C:/Users/Owner/Glass2Go/web/public';
const BK='C:/Users/Owner/Glass2Go/tools/interp/flight_backup';
fs.mkdirSync(BK,{recursive:true});
const tiers={landscape:['m','xl'],portrait:['s','p']};
for(const [set,ts] of Object.entries(tiers)){
  for(const t of ts){
    const src=`${PUB}/flight2/${set}/${t}`; const dst=`${PUB}/flight/${set}/${t}`;
    if(fs.readdirSync(src).length!==505) throw new Error('incomplete '+src);
    fs.mkdirSync(`${BK}/${set}`,{recursive:true});
    if(!fs.existsSync(`${BK}/${set}/${t}`)) fs.renameSync(dst,`${BK}/${set}/${t}`); else fs.rmSync(dst,{recursive:true,force:true});
    fs.renameSync(src,dst);
  }
  const mp=`${PUB}/flight/${set}/manifest.json`; const m=JSON.parse(fs.readFileSync(mp,'utf8'));
  m.fps=48; m.frames=505; m.waypoints=m.waypoints.map(k=>2*k-1);
  fs.writeFileSync(mp,JSON.stringify(m,null,1));
}
const lp=`${PUB}/flight/layout.json`; const L=JSON.parse(fs.readFileSync(lp,'utf8'));
for(const set of Object.keys(L)){const o={};for(const k of Object.keys(L[set]))o[String(2*Number(k)-1)]=L[set][k];L[set]=o;}
fs.writeFileSync(lp,JSON.stringify(L,null,1));
console.log('swapped');
