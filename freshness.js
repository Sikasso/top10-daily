'use strict';
(function(root){
  const zone='America/Chicago';
  const grace=30*60*1000;
  const nfl=new Set(['touchdowns','receptions','rushing','receiving']);
  function parts(date){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));}
  function localInstant(day,minute){
    const [year,month,date]=day.split('-').map(Number), hour=Math.floor(minute/60), min=minute%60;
    let stamp=Date.UTC(year,month-1,date,hour,min);
    for(let i=0;i<3;i++){
      const got=parts(new Date(stamp));
      const correction=Date.UTC(year,month-1,date,hour,min)-Date.UTC(+got.year,+got.month-1,+got.day,+got.hour,+got.minute);
      if(!correction)break;
      stamp+=correction;
    }
    return new Date(stamp);
  }
  function latestDue(category,now){
    const p=parts(now), today=`${p.year}-${p.month}-${p.day}`;
    const base=Date.UTC(+p.year,+p.month-1,+p.day);
    let due=null;
    for(let offset=-1;offset<=0;offset++){
      const d=new Date(base+offset*86400000), day=d.toISOString().slice(0,10), weekday=d.getUTCDay();
      const mins=[420];
      if(nfl.has(category)){
        if(weekday===4)mins.push(18*60+7);
        if(weekday===0)mins.push(10*60+52,14*60+7,18*60+7);
        if(weekday===1)mins.push(18*60+7);
      }
      for(const minute of mins){const candidate=localInstant(day,minute);if(candidate.getTime()+grace<=now.getTime()&&(!due||candidate>due))due=candidate;}
    }
    return due;
  }
  function staleFor(key,category,now=new Date()){
    if(category.status==='error')return true;
    const generated=new Date(category.generatedAt);
    if(!category.generatedAt||!Number.isFinite(generated.getTime()))return true;
    const due=latestDue(key,now);
    return !!due&&generated<due;
  }
  const api={staleFor};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.Top10Freshness=api;
})(typeof globalThis!=='undefined'?globalThis:this);
