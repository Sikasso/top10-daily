// Life on the Line as one image: a window's picks (or a night's), drawn to a canvas and
// handed to the share sheet (Save Image on iPhone). Drawn, not screenshotted: the cards
// scroll sideways on a phone, so no single screenshot ever held all four.
(function(){
 'use strict';
 const W=1080,PAD=56,ROW=232,GAP=20,HEAD=300,FOOT=150;
 const C={bg:'#0a0d12',panel:'#111720',line:'#25303e',gold:'#f5d08a',amber:'#d9a24b',text:'#edf2f7',soft:'#c4ceda',muted:'#94a0af',lime:'#c7f36b',red:'#ff5a4a',lost:'#c98b8b',parlay:'#e8d2a6'};
 const ART='img/lotl-stadium.jpg';
 let art=null;
 function loadArt(){
  if(art)return art;
  art=new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=ART;});
  return art;
 }
 const FONTS=['900 80px Archivo','800 48px Archivo','700 32px Archivo','600 26px Archivo'];
 const fontsReady=()=>document.fonts?Promise.all(FONTS.map(f=>document.fonts.load(f).catch(()=>{}))):Promise.resolve();
 // Condensed like the site where the canvas supports it; text is shrunk to fit either way.
 function font(ctx,weight,size,stretch){
  ctx.font=`${weight} ${size}px Archivo, system-ui, sans-serif`;
  if('fontStretch' in ctx)ctx.fontStretch=stretch||'normal';
 }
 function fit(ctx,text,maxW,weight,size,stretch,min=18){
  let s=size;font(ctx,weight,s,stretch);
  while(s>min&&ctx.measureText(text).width>maxW){s-=2;font(ctx,weight,s,stretch);}
  return s;
 }
 function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h);}
 function cover(ctx,img,x,y,w,h){
  const s=Math.max(w/img.width,h/img.height),iw=img.width*s,ih=img.height*s;
  ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
 }
 const clock=t=>String(t||'').replace(/^\S+ /,'').replace(/(\d)(AM|PM)$/,'$1 $2');
 function parlay(legs){
  if(legs.length<2)return '';
  const dec=legs.map(({it})=>{const a=parseInt(String(it.book||'').split(' ')[0],10);return a>0?1+a/100:a<0?1+100/-a:null;});
  const ch=legs.map(({it})=>parseFloat(it.chance)/100);
  if(!dec.every(Boolean)||!ch.every(Number.isFinite))return '';
  const d=dec.reduce((x,y)=>x*y,1),c=ch.reduce((x,y)=>x*y,1),am=d>=2?`+${Math.round((d-1)*100)}`:`-${Math.round(100/(d-1))}`;
  return `All ${legs.length} as a parlay: about ${am}, hits about ${Math.round(c*100)}% of the time`;
 }
 // One leg's state, the way the card shows it.
 function legState(L,{it,r,unit,started}){
  const grade=r?.grade||null;
  const total=r?.total??(r?.text?parseFloat(r.text):null);
  const m=Number.isFinite(total)&&L?.meter?L.meter(it,total,unit):null;
  if(m&&grade)m.tone=grade==='won'?'cashed':grade==='lost'?'bust':'void';
  let label,color;
  if(grade==='won'){label='CASHED';color=C.lime;}
  else if(grade==='lost'){label='LOST';color=C.lost;}
  else if(grade==='void'){label='VOID';color=C.muted;}
  else if(started){label=r?.clock?`LIVE · ${r.clock}`:'LIVE';color=C.red;}
  else{label=`${clock(it.time)}`;color=C.muted;}
  return {grade,total:Number.isFinite(total)?total:null,m,label,color};
 }
 async function draw(o){
  await fontsReady();const img=await loadArt();
  const L=window.Top10Live,legs=o.legs;
  const H=HEAD+legs.length*(ROW+GAP)-GAP+FOOT;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d');
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
  // Header: the stadium photo under a dark wash.
  if(img){ctx.save();ctx.globalAlpha=.55;cover(ctx,img,0,0,W,HEAD+40);ctx.restore();}
  const wash=ctx.createLinearGradient(0,0,0,HEAD+40);wash.addColorStop(0,'rgba(10,13,18,.35)');wash.addColorStop(.7,'rgba(10,13,18,.85)');wash.addColorStop(1,C.bg);
  ctx.fillStyle=wash;ctx.fillRect(0,0,W,HEAD+40);
  ctx.textBaseline='alphabetic';
  font(ctx,900,92,'extra-condensed');ctx.fillStyle=C.gold;ctx.shadowColor='rgba(217,162,75,.45)';ctx.shadowBlur=30;
  ctx.fillText('Life on the Line',PAD,PAD+80);ctx.shadowBlur=0;
  const tw=ctx.measureText('Life on the Line').width;
  // League chip
  font(ctx,900,26,'normal');const lw=ctx.measureText(o.league).width+28;
  rr(ctx,PAD+tw+22,PAD+40,lw,42,8);ctx.fillStyle='#d9a24b';ctx.fill();
  ctx.fillStyle='#1a1206';ctx.fillText(o.league,PAD+tw+36,PAD+71);
  // Window + day
  fit(ctx,o.subtitle,W-2*PAD,800,40,'condensed');ctx.fillStyle=C.text;ctx.fillText(o.subtitle,PAD,PAD+150);
  // Slip pips + summary
  const states=legs.map(l=>l.st.grade||(l.started?'live':'pre'));
  const sl=L?.slip?L.slip(states,o.verb):null;
  let x=PAD;const py=PAD+205;
  states.forEach(s=>{ctx.beginPath();ctx.arc(x+11,py,11,0,Math.PI*2);
   const fill={won:C.lime,lost:C.lost,void:C.muted,live:C.red}[s];
   if(fill){ctx.fillStyle=fill;ctx.fill();}else{ctx.lineWidth=3;ctx.strokeStyle='rgba(217,162,75,.6)';ctx.stroke();}
   x+=32;});
  if(sl){font(ctx,700,28,'normal');ctx.fillStyle=sl.sweep?C.lime:'#e8dcc4';ctx.fillText(sl.text,x+10,py+10);}
  // Rows
  legs.forEach((l,i)=>{
   const {it,st}=l,y=HEAD+i*(ROW+GAP),x0=PAD,w=W-2*PAD;
   rr(ctx,x0,y,w,ROW,20);ctx.fillStyle=C.panel;ctx.fill();
   ctx.lineWidth=2;ctx.strokeStyle=st.grade==='won'?'rgba(199,243,107,.55)':st.grade==='lost'?'rgba(201,139,139,.45)':C.line;ctx.stroke();
   font(ctx,900,64,'extra-condensed');ctx.fillStyle=C.amber;ctx.fillText(String(i+1),x0+30,y+82);
   const tx=x0+100,rightW=300,textW=w-100-rightW-30;
   fit(ctx,it.player,textW,900,48,'condensed',28);ctx.fillStyle=C.text;ctx.fillText(it.player,tx,y+64);
   const sub=[it.market!=='total'?[it.team,it.opp?'vs '+it.opp:''].filter(Boolean).join(' '):'',clock(it.time)].filter(Boolean).join(' · ');
   fit(ctx,sub,textW,600,26,'normal');ctx.fillStyle=C.muted;ctx.fillText(sub,tx,y+104);
   const mk=l.label||it.market,bet=it.line!=null?`${it.pick} ${it.line} ${mk}`:mk.replace(/^./,c=>c.toUpperCase());
   fit(ctx,bet,textW,800,34,'normal');ctx.fillStyle=C.text;ctx.fillText(bet,tx,y+152);
   const meta=[it.book,it.chance?`${it.chance} to hit`:'',it.tag||''].filter(Boolean).join('  ·  ');
   fit(ctx,meta,textW,600,26,'normal');ctx.fillStyle=C.soft;ctx.fillText(meta,tx,y+190);
   // Right: the count against the line, and the state.
   const rx=x0+w-30;ctx.textAlign='right';
   if(st.total!=null){
    const of=st.m?.line==null?' / 1':` / ${st.m.line}`;
    font(ctx,600,30,'normal');const ow=ctx.measureText(of).width;ctx.fillStyle=C.muted;ctx.fillText(of,rx,y+82);
    font(ctx,900,72,'condensed');ctx.fillStyle=st.grade==='won'?C.lime:st.grade==='lost'?C.lost:C.gold;ctx.fillText(String(st.total),rx-ow-6,y+82);
   }
   fit(ctx,st.label,rightW,900,st.grade?34:28,'condensed',20);ctx.fillStyle=st.color;
   ctx.fillText(st.label,rx,st.total!=null?y+128:y+82);
   if(st.total==null&&!st.grade&&!l.started){font(ctx,600,24,'normal');ctx.fillStyle=C.muted;ctx.fillText(o.verb==='tip off'?'tip-off':'kickoff',rx,y+114);}
   if(!st.grade&&st.m?.note){fit(ctx,st.m.note,rightW,600,24,'normal');ctx.fillStyle=C.soft;ctx.fillText(st.m.note,rx,y+162);}
   ctx.textAlign='left';
   // Meter along the bottom of the row.
   if(st.m){
    const bx=x0+30,bw=w-60,by=y+ROW-22;
    rr(ctx,bx,by,bw,8,4);ctx.fillStyle='rgba(255,255,255,.08)';ctx.fill();
    const tone=st.m.tone,col=tone==='cashed'||tone==='safe'?C.lime:tone==='bust'?C.lost:tone==='void'?C.muted:tone==='danger'?C.red:C.gold;
    rr(ctx,bx,by,Math.max(8,bw*st.m.pct/100),8,4);ctx.fillStyle=col;ctx.fill();
    ctx.fillStyle=C.text;ctx.fillRect(bx+bw*st.m.mark/100-2,by-8,4,24);
   }
  });
  // Footer
  const fy=H-FOOT+50,pl=parlay(legs);
  if(pl){fit(ctx,pl,W-2*PAD,600,28,'normal');ctx.fillStyle=C.parlay;ctx.fillText(pl,PAD,fy);}
  font(ctx,800,26,'normal');ctx.fillStyle=C.gold;ctx.fillText('Top10 Daily',PAD,fy+56);
  const bw=ctx.measureText('Top10 Daily').width;font(ctx,600,26,'normal');ctx.fillStyle=C.muted;
  ctx.fillText(`  ·  sikasso.github.io/top10-daily  ·  ${o.stamp}`,PAD+bw,fy+56);
  return cv;
 }
 const toBlob=cv=>new Promise(res=>cv.toBlob(res,'image/png'));
 function dialog(){
  let d=document.getElementById('lotl-shot');if(d)return d;
  d=document.createElement('dialog');d.id='lotl-shot';d.className='lotl-dlg lotl-shot-dlg';d.setAttribute('aria-labelledby','lotl-shot-title');
  d.innerHTML='<div class="lotl-dlg-in"><div class="lotl-dlg-head"><div><h2 class="lotl-dlg-title" id="lotl-shot-title">Save image</h2><p class="lotl-shot-hint"></p></div><button type="button" class="lotl-dlg-close" aria-label="Close"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></button></div><div class="lotl-dlg-body lotl-shot-body"><img class="lotl-shot-img" alt=""><div class="lotl-shot-actions"><button type="button" class="lotl-seeall lotl-shot-share">Share or save</button><a class="lotl-seeall lotl-shot-dl" download>Download</a></div></div></div>';
  d.querySelector('.lotl-dlg-close').addEventListener('click',()=>d.close());
  d.addEventListener('click',e=>{if(e.target===d)d.close();});
  d.addEventListener('close',()=>{const u=d.dataset.url;if(u){URL.revokeObjectURL(u);delete d.dataset.url;}});
  document.body.append(d);return d;
 }
 // o: {league, subtitle, verb, stamp, file, legs:[{it,r,unit,started,label}]}
 async function open(o){
  o.legs=o.legs.map(l=>({...l,st:legState(window.Top10Live,l)}));
  const cv=await draw(o),blob=await toBlob(cv);if(!blob)return;
  const d=dialog(),url=URL.createObjectURL(blob),file=new File([blob],o.file,{type:'image/png'});
  if(d.dataset.url)URL.revokeObjectURL(d.dataset.url);d.dataset.url=url;
  const im=d.querySelector('.lotl-shot-img');im.src=url;im.alt=`${o.league} Life on the Line, ${o.subtitle}`;
  const share=d.querySelector('.lotl-shot-share'),dl=d.querySelector('.lotl-shot-dl');
  const canShare=!!(navigator.canShare&&navigator.canShare({files:[file]}));
  share.hidden=!canShare;dl.href=url;dl.download=o.file;
  d.querySelector('.lotl-shot-hint').textContent=canShare?'Share or save sends it to Photos, Messages or anywhere else.':'Download it, or right-click the image to copy it.';
  share.onclick=()=>navigator.share({files:[file]}).catch(()=>{});
  if(!d.open)d.showModal();
 }
 window.Top10Shot={open,draw,legState};
 loadArt();
})();
