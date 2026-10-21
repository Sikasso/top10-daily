'use strict';
// Life on the Line, live: where each pick stands against its line, and the motion
// that only fires when a number actually changes (a stat ticks, a pick cashes or busts).
(function(root){
 // Where a pick stands. Pure: no DOM, no clock. total = the stat so far.
 function meter(it,total,unit=['','']){
  if(total==null||!Number.isFinite(total))return null;
  const under=it.pick==='Under',line=it.line==null?0.5:it.line;
  const cash=Math.floor(line)+1; // smallest count that clears an Over (anytime TD: 1)
  const max=Math.max(line*1.35,total*1.08,cash);
  const pct=Math.min(100,total/max*100),mark=Math.min(100,line/max*100);
  const u=n=>`${n} ${n===1?unit[0]:unit[1]}`.trim();
  let tone,note;
  if(under){
   const room=cash-1-total;
   if(room<0){tone='bust';note='Past the line';}
   else if(room===0){tone='danger';note='No room left';}
   else{tone=room/(cash-1||1)<=0.25?'danger':'safe';note=`${u(room)} to spare`;}
  }else{
   const need=cash-total;
   if(need<=0){tone='cashed';note='Cleared';}
   else{tone=total/line>=0.75?'close':'chasing';note=it.line==null?'Needs a touchdown':`Needs ${need} more ${need===1?unit[0]:unit[1]}`.trim();}
  }
  return {pct,mark,tone,note,line:it.line==null?null:it.line};
 }
 // Countdown text for a kickoff. ms = time left.
 function countdown(ms,verb='Kicking off'){
  if(ms<=0)return verb;
  const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);
  if(h>=24)return '';
  if(h)return `in ${h}h ${String(m).padStart(2,'0')}m`;
  return `in ${m}:${String(s%60).padStart(2,'0')}`;
 }
 // One-line state of the whole slip.
 function slip(states,verb='kick off'){
  const n=k=>states.filter(s=>s===k).length,won=n('won'),lost=n('lost'),live=n('live'),pre=n('pre');
  const parts=[];
  if(won)parts.push(`${won} cashed`);if(lost)parts.push(`${lost} busted`);if(live)parts.push(`${live} live`);if(pre)parts.push(`${pre} to ${verb}`);
  const decided=won+lost;
  if(!live&&!pre&&decided&&!lost)return {text:`Clean sweep, ${won} for ${won}`,sweep:true};
  if(!live&&!pre&&decided)return {text:`Final: ${won}–${lost}`,sweep:false};
  return {text:parts.join(' · '),sweep:false};
 }
 // Record history. Pure: items are record entries {kickoff, market, pick, line, grade, units}.
 const CT_DAY=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'});
 const CT_LABEL=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric'});
 const centralDay=iso=>{const p=Object.fromEntries(CT_DAY.formatToParts(new Date(iso)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;};   // 'YYYY-MM-DD' on the Central calendar
 const newestFirst=items=>items.map((e,i)=>[e,i]).sort((a,b)=>new Date(b[0].kickoff)-new Date(a[0].kickoff)||a[1]-b[1]).map(x=>x[0]);
 // W–L–V, pending, units (graded picks only), rounded clear of float noise.
 function summarize(items){
  const s={n:items.length,won:0,lost:0,void:0,pending:0,units:0};
  for(const e of items){if(e.grade==='won'||e.grade==='lost'||e.grade==='void'){s[e.grade]++;s.units+=Number(e.units)||0;}else s.pending++;}
  s.units=Math.round(s.units*1e4)/1e4;return s;
 }
 // Picks grouped by Central calendar day, newest day first, newest pick first within a day.
 function byDay(items){
  const days=new Map();
  for(const e of newestFirst(items)){const d=centralDay(e.kickoff);if(!days.has(d))days.set(d,[]);days.get(d).push(e);}
  return [...days].sort((a,b)=>a[0]<b[0]?1:a[0]>b[0]?-1:0).map(([day,list])=>({day,label:CT_LABEL.format(new Date(list[0].kickoff)),items:list,...summarize(list)}));
 }
 const MARKET_LABEL={pra:'PRA'};
 const marketLabel=(market,pick)=>`${MARKET_LABEL[market]||String(market).replace(/^./,c=>c.toUpperCase())}${pick&&pick!=='Yes'?' '+pick:''}`;
 const marketKey=e=>`${e.market}|${e.pick||''}`;
 // One row per market + side (Threes Over, Receptions Under), most-bet first, then best units.
 function byMarket(items){
  const groups=new Map();
  for(const e of items){const k=marketKey(e);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e);}
  return [...groups].map(([key,list])=>({key,market:list[0].market,pick:list[0].pick,label:marketLabel(list[0].market,list[0].pick),...summarize(list)}))
   .sort((a,b)=>b.n-a.n||b.units-a.units||a.label.localeCompare(b.label));
 }
 const api={meter,countdown,slip,centralDay,summarize,byDay,byMarket,marketKey,marketLabel};
 if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}

 // Browser side: remembers what each card last showed so motion fires on change only.
 const calm=()=>root.matchMedia('(prefers-reduced-motion:reduce)').matches;
 const seen=new Map();
 function tween(el,from,to,draw,ms=900){
  if(calm()||from===to){el.textContent=draw(to);return;}
  const t0=performance.now();
  const step=t=>{const k=Math.min(1,(t-t0)/ms),e=1-Math.pow(1-k,3);el.textContent=draw(from+(to-from)*e);if(k<1)requestAnimationFrame(step);};
  el.textContent=draw(from);requestAnimationFrame(step);
 }
 function sparks(li){
  if(calm())return;
  const box=document.createElement('span');box.className='lotl-sparks';box.setAttribute('aria-hidden','true');
  for(let i=0;i<20;i++){const s=document.createElement('i');const a=i/20*Math.PI*2;s.style.setProperty('--x',`${Math.cos(a)*(90+Math.random()*70)}px`);s.style.setProperty('--y',`${Math.sin(a)*(70+Math.random()*50)}px`);s.style.animationDelay=`${Math.random()*120}ms`;box.append(s);}
  li.append(box);setTimeout(()=>box.remove(),1600);
 }
 // Build the meter on a card and fire whatever changed since the last render.
 function card(li,it,r,id,add,unit){
  const total=r?.total??(r?.text?parseFloat(r.text):null);
  const m=meter(it,total,unit),grade=r?.grade||null;
  if(m&&grade)m.tone=grade==='won'?'cashed':grade==='lost'?'bust':'void';
  const was=seen.get(id);
  if(m){
   const box=add(li,'div','',`lotl-meter ${m.tone}`);
   const read=add(box,'div','','lotl-read');
   const num=add(read,'strong','','lotl-count');
   add(read,'span',m.line==null?`/ 1 ${unit[0]}`:`/ ${m.line} ${unit[1]}`,'lotl-of');
   if(!grade)add(read,'span',m.note,'lotl-need');
   const track=add(box,'div','','lotl-track');const fill=add(track,'span','','lotl-fill');const mark=add(track,'span','','lotl-mark');mark.style.left=m.mark+'%';
   track.setAttribute('role','meter');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(m.line??1));track.setAttribute('aria-valuenow',String(total));track.setAttribute('aria-label',`${it.player}: ${total} of ${m.line??1}`);
   const from=was?.pct??0;fill.style.width=from+'%';
   if(calm())fill.style.width=m.pct+'%';else requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.width=m.pct+'%';}));
   tween(num,was?.total??0,total,v=>String(Math.round(v)),was?600:900);
   if(was&&was.total!=null&&total>was.total&&!calm()){
    const d=add(li,'span',`+${total-was.total}`,`lotl-delta${it.pick==='Under'?' bad':''}`);d.setAttribute('aria-hidden','true');setTimeout(()=>d.remove(),1700);
    li.classList.add('bump');setTimeout(()=>li.classList.remove('bump'),1200);
   }
  }
  // Celebrate only a change watched live, not a result learned on page load.
  const flipped=was&&was.total!=null&&was.grade!==grade;
  if(grade==='won'||grade==='lost')add(li,'span',grade==='won'?'Cashed':'Busted',`lotl-stamp ${grade}${flipped?' fresh':''}`).setAttribute('aria-hidden','true');
  if(flipped){
   if(grade==='won'){li.classList.add('cash-in');sparks(li);}
   if(grade==='lost')li.classList.add('bust-in');
  }
  seen.set(id,{total,grade,pct:m?.pct??null});
 }
 // Kickoff countdowns tick every second; when one hits zero, ask for a regrade.
 let onKick=null;
 function tick(){
  const now=Date.now();
  document.querySelectorAll('[data-kick]').forEach(el=>{
   const left=Number(el.dataset.kick)-now;el.textContent=countdown(left,el.dataset.verb);el.classList.toggle('soon',left<15*60000);
   if(left<=0&&!el.dataset.fired){el.dataset.fired='1';onKick?.();}
  });
 }
 setInterval(tick,1000);
 // Record tally: W–L and units count up from what was last on screen.
 const lastTally={};   // per sport: NFL and NBA keep separate records
 function tally(wl,units,rec,money,sport='nfl'){
  const from=lastTally[sport]||{won:0,lost:0,units:0},v=rec.void?'–'+rec.void:'';
  if(from.won!==rec.won||from.lost!==rec.lost){const a=from.won,b=from.lost;tween(wl,0,1,k=>`${Math.round(a+(rec.won-a)*k)}–${Math.round(b+(rec.lost-b)*k)}${v}`,1100);}else wl.textContent=`${rec.won}–${rec.lost}${v}`;
  tween(units,from.units,rec.units||0,money,1100);
  lastTally[sport]={won:rec.won,lost:rec.lost,units:rec.units||0};
 }
 root.Top10Live={...api,card,tick,tally,onKick:f=>{onKick=f;}};
})(typeof globalThis!=='undefined'?globalThis:this);
