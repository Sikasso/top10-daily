'use strict';
(() => {
 const states=new Map();
 const present=v=>v!==null&&v!==undefined&&v!=='';
 const keyFor=(row,identity)=>[row[identity],row.Opp].join('|');
 function capture(parent){
  const list=parent.querySelector('.mobile-board');
  if(!list)return;
  const state={open:new Set(),focus:null};
  list.querySelectorAll('details').forEach(d=>{
   if(d.open)state.open.add(d.dataset.key);
   if(d.contains(document.activeElement))state.focus=d.dataset.key;
  });
  states.set(list.dataset.board,state);
 }
 function metric(active,row,value){
  if(active==='games')return ['Spread · Total',[value('Spread',row.Spread),value('Total',row.Total)].join(' · ')];
  if(active==='touchdowns')return ['TD chance',value('TD%',row['TD%'])];
  return [active==='receptions'?'Proj · catches':active==='strikeouts'?'Proj · Ks':'Proj · yards',value('Proj',row.Proj)];
 }
 function pickText(active,row,value){
  if(row.NoPick)return 'No pick';
  if(present(row.Pick))return [row.Pick,present(row.Line)?value('Line',row.Line):''].filter(Boolean).join(' ');
  if(active==='passing'||active==='receiving')return 'Projection only';
  if(active==='touchdowns')return present(row.Book)?'Book '+value('Book',row.Book):'No price listed';
  return 'No pick listed';
 }
 function render(parent,{active,rows,cols,identity,value,add}){
  const state=states.get(active)||{open:new Set(),focus:null};
  const list=add(parent,'ol','','mobile-board');
  list.dataset.board=active;
  list.setAttribute('aria-label',active==='games'?'Games this week':active+' top 10');
  rows.forEach((row,i)=>{
   const item=add(list,'li','','mobile-board-item');
   const details=add(item,'details','','mobile-board-details');
   details.dataset.key=keyFor(row,identity);details.open=state.open.has(details.dataset.key);
   const summary=add(details,'summary','','mobile-board-summary');
   const top=add(summary,'span','','mobile-board-top');
   add(top,'span',String(i+1).padStart(2,'0'),'mobile-board-rank');
   const name=add(top,'span',row[identity]||'—','mobile-board-name');
   const context=identity==='Game'?row.Time:[row.Tm,row.Pos,row.Opp&&'vs '+row.Opp].filter(Boolean).join(' · ');
   if(context)add(name,'span',context,'mobile-board-sub');
   const [label,number]=metric(active,row,value),main=add(summary,'span','','mobile-board-main');
   add(main,'span',label,'mobile-board-label');add(main,'strong',number,'mobile-board-value');
   if(active==='receptions'){
    const hits=['p3','p4'].filter(k=>present(row[k])).map(k=>(k==='p3'?'3+ catches':'4+ catches')+' '+value(k,row[k])).join(' · ');
    if(hits)add(summary,'span',hits,'mobile-board-hits');
   }
   const pick=pickText(active,row,value);
   add(summary,'span',pick,'mobile-board-pick'+(row.NoPick||!present(row.Pick)?' is-muted':''));
   const names={NoPick:'No pick','TD NoPick':'TD no pick'};
   const flags=['Inj','News','Leash','Role','Flags','Matchup','NoPick','TD NoPick'].filter(k=>present(row[k])).map(k=>(names[k]||k)+': '+value(k,row[k]));
   const sample=row.GS??row.G;
   if(present(sample)&&Number(sample)<10)flags.push('Limited history: '+sample+' games');
   if(flags.length)add(summary,'span',flags.join(' · '),'mobile-board-flags');
   const expanded=add(details,'div','','mobile-board-expanded');
   const fields=add(expanded,'dl','','mobile-board-fields');
   cols.forEach(k=>{add(fields,'dt',k);add(fields,'dd',value(k,row[k]));});
   const noteLabels={L10:'Last 10',NewsHeadline:'Full news',NoPick:'No pick','TD NoPick':'TD no pick'};
   Object.entries(noteLabels).forEach(([k,label])=>{
    if(!cols.includes(k)&&present(row[k])){add(fields,'dt',label);add(fields,'dd',String(row[k]));}
   });
   if(present(sample)&&Number(sample)<10)add(expanded,'p','Limited history: '+sample+' games. Treat this as lower confidence.','mobile-board-warning');
  });
  parent.classList.add('has-mobile-board');
  if(state.focus){
   const target=[...list.querySelectorAll('details')].find(d=>d.dataset.key===state.focus);
   target?.querySelector('summary')?.focus({preventScroll:true});
  }
  state.focus=null;
  return list;
 }
 window.Top10MobileBoard={render,capture};
})();
