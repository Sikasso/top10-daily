// Life on the Line as one image: a window's picks (or a night's), drawn to a canvas and
// handed to the share sheet (Save Image on iPhone). Drawn, not screenshotted: the cards
// scroll sideways on a phone, so no single screenshot ever held all four.
(function(){
 'use strict';
 // The site's own cards, 2 across (the tablet layout), at 2x: same photos, stamps, meters, status lines.
 const S=2,CW=320*S,CH=280*S,GAP=12*S,PAD=24*S,HEAD=136*S,FOOT=70*S,COLS=2;
 const C={bg:'#0a0d12',gold:'#f5d08a',amber:'#d9a24b',text:'#edf2f7',soft:'#c4ceda',muted:'#94a0af',tan:'#a89a82',cream:'#e8dcc4',lime:'#c7f36b',red:'#ff5a4a',live:'#ff9a8a',lost:'#c98b8b',bust:'#e08a8a',parlay:'#e8d2a6'};
 const ARTS=['img/lotl-stadium.jpg','img/lotl-tunnel.jpg','img/lotl-goalline.jpg','img/lotl-playbook.jpg'];
 const arts={};
 const loadArt=src=>arts[src]||(arts[src]=new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src;}));
 const FONTS=['900 64px Archivo','800 44px Archivo','700 32px Archivo','600 26px Archivo'];
 const fontsReady=()=>document.fonts?Promise.all(FONTS.map(f=>document.fonts.load(f).catch(()=>{}))):Promise.resolve();
 // Condensed like the site where the canvas supports it; text is shrunk to fit either way.
 function font(ctx,weight,size,stretch){
  ctx.font=`${weight} ${size}px Archivo, system-ui, sans-serif`;
  if('fontStretch' in ctx)ctx.fontStretch=stretch||'normal';
 }
 function fit(ctx,text,maxW,weight,size,stretch,min=16){
  let s=size;font(ctx,weight,s,stretch);
  while(s>min&&ctx.measureText(text).width>maxW){s-=2;font(ctx,weight,s,stretch);}
  return s;
 }
 function rr(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
 function cover(ctx,img,x,y,w,h){   // background-size:cover, anchored right center
  const s=Math.max(w/img.width,h/img.height),iw=img.width*s,ih=img.height*s;
  ctx.drawImage(img,x+w-iw,y+(h-ih)/2,iw,ih);
 }
 // Wrap to at most maxLines lines of maxW (ellipsis on the last); the font must already be set.
 function wrap(ctx,text,maxW,maxLines){
  const lines=[];let cur='';
  for(const w of String(text).split(/\s+/)){const t=cur?cur+' '+w:w;if(!cur||ctx.measureText(t).width<=maxW)cur=t;else{lines.push(cur);cur=w;}}
  if(cur)lines.push(cur);
  if(lines.length<=maxLines)return lines;
  const keep=lines.slice(0,maxLines);let last=keep[maxLines-1];
  while(last&&ctx.measureText(last+'…').width>maxW)last=last.slice(0,-1);
  keep[maxLines-1]=last.replace(/[\s,;]+$/,'')+'…';return keep;
 }
 const clock=t=>String(t||'').replace(/^\S+ /,'').replace(/(\d)(AM|PM)$/,'$1 $2');
 function parlay(legs){
  if(legs.length<2)return '';
  const dec=legs.map(({it})=>{const a=parseInt(String(it.book||'').split(' ')[0],10);return a>0?1+a/100:a<0?1+100/-a:null;});
  const ch=legs.map(({it})=>parseFloat(it.chance)/100);
  if(!dec.every(Boolean)||!ch.every(Number.isFinite))return '';
  const d=dec.reduce((x,y)=>x*y,1),c=ch.reduce((x,y)=>x*y,1),am=d>=2?`+${Math.round((d-1)*100)}`:`-${Math.round(100/(d-1))}`;
  return `All ${legs.length} as a parlay: about ${am} at these prices, hits about ${Math.round(c*100)}% of the time.`;
 }
 // One leg's state, the way its card shows it.
 function legState(L,{it,r,unit,started}){
  const grade=r?.grade||null;
  const total=r?.total??(r?.text?parseFloat(r.text):null);
  const m=Number.isFinite(total)&&L?.meter?L.meter(it,total,unit):null;
  if(m&&grade)m.tone=grade==='won'?'cashed':grade==='lost'?'bust':'void';
  return {grade,total:Number.isFinite(total)?total:null,m,started};
 }
 const FILL={cashed:['#7fa83a',C.lime],close:['#c9933f','#ffe5a1'],danger:['#c9733f','#ffb35c'],bust:['#8a3a36','#e0605a'],void:[C.muted,C.muted]};
 function card(ctx,x,y,l,i,img,o){
  const {it,r,unit,st}=l,g=st.grade;
  ctx.save();if(g==='lost')ctx.globalAlpha=.72;
  rr(ctx,x,y,CW,o.ch,10*S);ctx.save();ctx.clip();
  ctx.fillStyle='#060709';ctx.fillRect(x,y,CW,o.ch);
  if(img)cover(ctx,img,x,y,CW,o.ch);
  let gr=ctx.createLinearGradient(x,y,x+CW,y);gr.addColorStop(0,'rgba(6,7,9,.7)');gr.addColorStop(.48,'rgba(6,7,9,.34)');gr.addColorStop(1,'rgba(6,7,9,.08)');ctx.fillStyle=gr;ctx.fillRect(x,y,CW,o.ch);
  gr=ctx.createLinearGradient(x,y+o.ch,x,y+o.ch*.62);gr.addColorStop(0,'rgba(6,7,9,.7)');gr.addColorStop(1,'rgba(6,7,9,0)');ctx.fillStyle=gr;ctx.fillRect(x,y,CW,o.ch);
  ctx.restore();
  rr(ctx,x+S/2,y+S/2,CW-S,o.ch-S,10*S);ctx.lineWidth=S;ctx.strokeStyle=g==='won'?'rgba(199,243,107,.55)':'rgba(217,162,75,.25)';
  if(g==='won'){ctx.shadowColor='rgba(199,243,107,.25)';ctx.shadowBlur=26*S;}ctx.stroke();ctx.shadowBlur=0;
  const px=x+16*S,inner=CW-32*S;ctx.textBaseline='alphabetic';ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=3*S;
  font(ctx,900,34*S,'extra-condensed');ctx.fillStyle=C.amber;ctx.fillText(String(i+1),px,y+46*S);
  fit(ctx,it.player,inner,800,21*S,'condensed');ctx.fillStyle=C.text;ctx.fillText(it.player,px,y+80*S);
  let yy=y+80*S;
  if(it.market!=='total'){const sub=[it.team,it.opp?'vs '+it.opp:''].filter(Boolean).join(' ');font(ctx,500,13*S,'normal');ctx.fillStyle=C.muted;yy+=24*S;ctx.fillText(sub,px,yy);}
  const mk=l.label||it.market,bet=it.line!=null?`${it.pick} ${it.line} ${mk}`:mk.replace(/^./,c=>c.toUpperCase());
  yy+=30*S;fit(ctx,bet,inner,700,16*S,'normal');ctx.fillStyle=C.text;ctx.fillText(bet,px,yy);
  yy+=24*S;font(ctx,500,13*S,'normal');ctx.fillStyle=C.soft;let mx=px;
  [it.book,it.chance?`${it.chance} to hit`:'',it.hits?`${it.hits} last 10`:''].filter(Boolean).forEach(t=>{ctx.fillText(t,mx,yy);mx+=ctx.measureText(t).width+10*S;});
  // The niche pick's reason, wrapped under the meta row; the card grows (draw) so it never meets the meter below.
  if(l.whyLines?.length){font(ctx,500,12*S,'normal');ctx.fillStyle=C.muted;l.whyLines.forEach((t,k)=>ctx.fillText(t,px,yy+20*S+k*16*S));}
  // Bottom up: status line, then the meter above it.
  const sy=y+o.ch-16*S;let status,scol,sw=500,ssz=12.5;
  if(g==='won'){status=`✓ Won: ${r?.text||''}`;scol=C.lime;sw=800;ssz=14;}
  else if(g==='lost'){status=`✗ Lost: ${r?.text||''}`;scol=C.lost;sw=700;}
  else if(g==='void'){status=`Void: ${r?.text||''}`;scol=C.muted;}
  else if(st.started){status=r?.clock?`Live · ${r.clock}`:r?.text?`Live: ${r.text} so far`:'In progress';scol=C.live;sw=700;}
  else{status=`${o.verb==='tip off'?'Tips off':'Kicks off'} ${clock(it.time)}`;scol=C.tan;}
  let sx=px;
  if(!g&&st.started){ctx.beginPath();ctx.arc(px+4*S,sy-4.5*S,4*S,0,Math.PI*2);ctx.fillStyle=C.red;ctx.fill();sx+=14*S;}
  font(ctx,sw,ssz*S,'normal');ctx.fillStyle=scol;ctx.fillText(status,sx,sy);
  const m=st.m;
  if(m){
   const ty=sy-30*S,ry=ty-14*S;
   const tone=m.tone,cnt=tone==='cashed'?C.lime:tone==='bust'?C.bust:C.gold;
   font(ctx,900,32*S,'extra-condensed');ctx.fillStyle=cnt;const cs=String(st.total);ctx.fillText(cs,px,ry);
   const cw=ctx.measureText(cs).width;font(ctx,500,13*S,'normal');ctx.fillStyle=C.tan;
   ctx.fillText(m.line==null?`/ 1 ${unit[0]}`:`/ ${m.line} ${unit[1]}`,px+cw+6*S,ry);
   if(!g&&m.note){font(ctx,700,12.5*S,'normal');ctx.fillStyle=tone==='cashed'?C.lime:tone==='danger'?'#ffb35c':tone==='bust'?C.bust:C.cream;ctx.textAlign='right';ctx.fillText(m.note,px+inner,ry);ctx.textAlign='left';}
   ctx.shadowBlur=0;
   rr(ctx,px,ty,inner,7*S,4*S);ctx.fillStyle='rgba(255,255,255,.09)';ctx.fill();
   const [c0,c1]=FILL[tone]||['#9b773b','#f5d08a'],fw=Math.max(7*S,inner*m.pct/100);
   const fg=ctx.createLinearGradient(px,0,px+fw,0);fg.addColorStop(0,c0);fg.addColorStop(1,c1);
   rr(ctx,px,ty,fw,7*S,4*S);ctx.fillStyle=fg;if(tone!=='bust'&&tone!=='void'){ctx.shadowColor=c1+'99';ctx.shadowBlur=12*S;}ctx.fill();ctx.shadowBlur=0;
   ctx.shadowColor='rgba(255,255,255,.7)';ctx.shadowBlur=6*S;ctx.fillStyle='#fff';ctx.fillRect(px+inner*m.mark/100-S,ty-5*S,2*S,17*S);ctx.shadowBlur=0;
  }
  ctx.shadowBlur=0;
  // Top right: the CASHED / BUSTED stamp, or the tag before a result.
  if(g==='won'||g==='lost'){
   const word=g==='won'?'CASHED':'BUSTED',col=g==='won'?C.lime:'#e0605a';
   ctx.save();font(ctx,900,19*S,'extra-condensed');if('letterSpacing' in ctx)ctx.letterSpacing=`${1.5*S}px`;
   const tw=ctx.measureText(word).width,bw=tw+20*S,bh=28*S,cx=x+CW-14*S-bw/2,cy=y+14*S+bh/2;
   ctx.translate(cx,cy);ctx.rotate(-8*Math.PI/180);
   rr(ctx,-bw/2,-bh/2,bw,bh,6*S);ctx.fillStyle='rgba(6,7,9,.55)';ctx.fill();ctx.lineWidth=2*S;ctx.strokeStyle=col;ctx.stroke();
   ctx.fillStyle=col;if(g==='won'){ctx.shadowColor='rgba(199,243,107,.5)';ctx.shadowBlur=10*S;}
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(word,0,S);ctx.restore();
  }else if(it.tag){
   font(ctx,800,11*S,'normal');const t=it.tag.toUpperCase(),tw=ctx.measureText(t).width+18*S;
   rr(ctx,x+CW-14*S-tw,y+14*S,tw,20*S,10*S);ctx.fillStyle=C.lime;ctx.fill();ctx.fillStyle=C.bg;ctx.fillText(t,x+CW-14*S-tw+9*S,y+28*S);
  }
  ctx.restore();
 }
 async function draw(o){
  const legs=o.legs,L=window.Top10Live;
  const [imgs]=await Promise.all([Promise.all(ARTS.map(loadArt)),fontsReady()]);
  const rows=Math.ceil(legs.length/COLS),cols=Math.min(COLS,legs.length);
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d');
  font(ctx,500,12*S,'normal');legs.forEach(l=>{l.whyLines=l.it.why?wrap(ctx,l.it.why,CW-32*S,3):[];});
  // 2x2 stays: every card is as tall as the one with the longest reason needs (280 css px with none).
  const lines=Math.max(0,...legs.map(l=>l.whyLines.length));o.ch=Math.max(CH,(268+16*Math.max(0,lines-1))*S);
  const W=PAD*2+cols*CW+(cols-1)*GAP,H=HEAD+rows*o.ch+(rows-1)*GAP+FOOT;cv.width=W;cv.height=H;
  font(ctx,500,12*S,'normal');
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#17130d');bg.addColorStop(.35,C.bg);bg.addColorStop(1,C.bg);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // Header, as the section reads: title + league, then the window and its slip.
  ctx.textBaseline='alphabetic';font(ctx,900,34*S,'extra-condensed');ctx.fillStyle=C.gold;ctx.shadowColor='rgba(217,162,75,.35)';ctx.shadowBlur=24*S;
  ctx.fillText('Life on the Line',PAD,PAD+30*S);ctx.shadowBlur=0;const tw=ctx.measureText('Life on the Line').width;
  font(ctx,900,13*S,'normal');if('letterSpacing' in ctx)ctx.letterSpacing=`${1.5*S}px`;const lw=ctx.measureText(o.league).width+18*S;
  rr(ctx,PAD+tw+12*S,PAD+8*S,lw,24*S,5*S);ctx.fillStyle='#d8b566';ctx.fill();ctx.fillStyle='#1a1206';ctx.fillText(o.league,PAD+tw+21*S,PAD+25*S);if('letterSpacing' in ctx)ctx.letterSpacing='0px';
  font(ctx,900,22*S,'condensed');ctx.fillStyle=C.gold;ctx.fillText(o.window||o.subtitle,PAD,PAD+72*S);let hx=PAD+ctx.measureText(o.window||o.subtitle).width+12*S;
  const times=[...new Set(legs.slice().sort((a,b)=>new Date(a.it.kickoff)-new Date(b.it.kickoff)).map(l=>clock(l.it.time)))].join(' · ');
  font(ctx,500,14*S,'normal');ctx.fillStyle=C.tan;const meta=[o.window?o.day:'',times].filter(Boolean).join('  ·  ');ctx.fillText(meta,hx,PAD+72*S);
  const states=legs.map(l=>l.st.grade||(l.st.started?'live':'pre')),sl=L?.slip?L.slip(states,o.verb):null;
  let x=PAD+6*S;const py=PAD+96*S;
  states.forEach(s=>{ctx.beginPath();ctx.arc(x,py,5*S,0,Math.PI*2);const f={won:C.lime,lost:C.lost,void:C.muted,live:C.red}[s];
   if(f){ctx.fillStyle=f;ctx.fill();}else{ctx.lineWidth=1.5*S;ctx.strokeStyle='rgba(217,162,75,.55)';ctx.stroke();}x+=15*S;});
  if(sl){font(ctx,600,13*S,'normal');ctx.fillStyle=sl.sweep?C.lime:C.cream;ctx.fillText(sl.text,x+4*S,py+4.5*S);}
  legs.forEach((l,i)=>card(ctx,PAD+(i%COLS)*(CW+GAP),HEAD+Math.floor(i/COLS)*(o.ch+GAP),l,i,imgs[i%ARTS.length],o));
  const fy=H-FOOT+30*S,pl=parlay(legs);
  if(pl){fit(ctx,pl,W-2*PAD,500,13*S,'normal');ctx.fillStyle=C.parlay;ctx.fillText(pl,PAD,fy);}
  font(ctx,800,13*S,'normal');ctx.fillStyle=C.gold;ctx.fillText('Top10 Daily',PAD,fy+24*S);const bw=ctx.measureText('Top10 Daily').width;
  font(ctx,500,13*S,'normal');ctx.fillStyle=C.muted;ctx.fillText(`  ·  sikasso.github.io/top10-daily  ·  ${o.stamp}`,PAD+bw,fy+24*S);
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
 ARTS.forEach(loadArt);
})();
