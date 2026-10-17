const {spawnSync}=require('child_process');const fs=require('fs');const path=require('path');const sharp=require('sharp');
const FF=require('ffmpeg-static');
const ROOT='C:/Users/Owner/Glass2Go';
const jobs=[['landscape','m',1280,800],['landscape','xl',1920,1200],['portrait','s',480,853],['portrait','p',720,1280]];
const N=253;const pad=n=>String(n).padStart(4,'0');
(async()=>{
for(const [set,tier,w,h] of jobs){
  const out=`${ROOT}/web/public/flight2/${set}/${tier}`;fs.mkdirSync(out,{recursive:true});
  if(fs.readdirSync(out).length>=2*N-1){console.log('skip',set,tier);continue;}
  const tmp=`${ROOT}/tools/interp/tmp_${set}_${tier}`;fs.rmSync(tmp,{recursive:true,force:true});fs.mkdirSync(tmp,{recursive:true});
  const t0=Date.now();
  const r=spawnSync(FF,['-y','-loglevel','error','-framerate','24','-start_number','1','-i',`${ROOT}/renders/master/${set}/%04d.png`,'-frames:v',String(N*2-1),'-vf',`scale=${w}:${h}:flags=lanczos,minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`,`${tmp}/%04d.png`],{stdio:'inherit'});
  if(r.status!==0)throw new Error('ffmpeg failed');
  for(let n=1;n<=2*N-1;n++){
    const dst=`${out}/${pad(n)}.webp`;
    if(n%2===1){fs.copyFileSync(`${ROOT}/web/public/flight/${set}/${tier}/${pad((n+1)/2)}.webp`,dst);}
    else if(!fs.existsSync(`${tmp}/${pad(n)}.png`)) fs.copyFileSync(`${out}/${pad(n-1)}.webp`,dst);
    else await sharp(`${tmp}/${pad(n)}.png`).webp({quality:80}).toFile(dst);
  }
  fs.rmSync(tmp,{recursive:true,force:true});
  console.log('done',set,tier,((Date.now()-t0)/1000).toFixed(0)+'s');
}})().catch(e=>{console.error(e);process.exit(1)});
