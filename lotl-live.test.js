'use strict';
const assert=require('node:assert/strict');
const {meter,countdown,slip}=require('./lotl-live.js');
const catches=['catch','catches'],yds=['yd','yds'],tds=['TD','TDs'];

// Over 3.5 catches: 4 clears it, 3 needs one more, the line sits inside the track.
assert.equal(meter({pick:'Over',line:3.5},4,catches).tone,'cashed');
assert.equal(meter({pick:'Over',line:3.5},3,catches).note,'Needs 1 more catch');
assert.equal(meter({pick:'Over',line:54.5},40,yds).note,'Needs 15 more yds');
assert.equal(meter({pick:'Over',line:3.5},1,catches).tone,'chasing');
assert.equal(meter({pick:'Over',line:3.5},3,catches).tone,'close');
assert.ok(meter({pick:'Over',line:3.5},0,catches).mark<100);
assert.equal(meter({pick:'Over',line:3.5},0,catches).pct,0);
// Never draws past the end of the track, even on a monster game.
assert.ok(meter({pick:'Over',line:6.5},14,catches).pct<=100);

// Under 3.5 catches: 3 is the most it can take, 4 busts it.
assert.equal(meter({pick:'Under',line:3.5},1,catches).note,'2 catches to spare');
assert.equal(meter({pick:'Under',line:3.5},3,catches).note,'No room left');
assert.equal(meter({pick:'Under',line:3.5},3,catches).tone,'danger');
assert.equal(meter({pick:'Under',line:3.5},4,catches).tone,'bust');
// Yardage Under: 54.5 allows 54.
assert.equal(meter({pick:'Under',line:54.5},40,yds).note,'14 yds to spare');
assert.equal(meter({pick:'Under',line:54.5},50,yds).tone,'danger');

// Anytime TD has no line: one touchdown cashes it.
assert.equal(meter({pick:'Yes',line:null},0,tds).note,'Needs a touchdown');
assert.equal(meter({pick:'Yes',line:null},1,tds).tone,'cashed');
// Pass TDs Over 1.5 needs 2.
assert.equal(meter({pick:'Over',line:1.5},1,tds).note,'Needs 1 more TD');

// No stat yet, no meter.
assert.equal(meter({pick:'Over',line:3.5},null,catches),null);
assert.equal(meter({pick:'Over',line:3.5},NaN,catches),null);

// Countdowns: hours+minutes, then a ticking clock under an hour, nothing beyond a day.
assert.equal(countdown(2*3600e3+14*60e3+5e3),'in 2h 14m');
assert.equal(countdown(14*60e3+3e3),'in 14:03');
assert.equal(countdown(0),'Kicking off');
assert.equal(countdown(25*3600e3),'');

// The slip line.
assert.equal(slip(['won','live','pre','pre']).text,'1 cashed · 1 live · 2 to kick off');
assert.deepEqual(slip(['won','won','won','won']),{text:'Clean sweep, 4 for 4',sweep:true});
assert.equal(slip(['won','lost','won','won']).text,'Final: 3–1');
console.log('lotl-live tests passed');

// NBA (2026-10-20): the slip and countdown say tip off; threes meter like any count.
assert.equal(slip(['pre','pre','live','won'],'tip off').text,'1 cashed · 1 live · 2 to tip off');
assert.equal(countdown(0,'Tipping off'),'Tipping off');
assert.equal(meter({pick:'Under',line:1.5},1,['three','threes']).note,'No room left');
assert.equal(meter({pick:'Over',line:24.5},20,['pt','pts']).note,'Needs 5 more pts');
console.log('nba ok');

// Record history (2026-10-21): day groups on the Central calendar, market-side breakdown.
{
const {centralDay,summarize,byDay,byMarket}=require('./lotl-live.js');
const rec=(kickoff,market,pick,grade,units,line=1.5)=>({player:'P',kickoff,market,pick,line,grade,units});
// 7:20 PM CDT Sunday is 00:20 UTC Monday: still Sunday in Central.
assert.equal(centralDay('2026-10-18T19:20:00-05:00'),'2026-10-18');
assert.equal(centralDay('2026-10-19T04:59:00Z'),'2026-10-18');
assert.equal(centralDay('2026-10-19T05:01:00Z'),'2026-10-19');
const items=[
 rec('2026-10-18T12:00:00-05:00','threes','Over','won',0.8),
 rec('2026-10-19T00:20:00Z','threes','Over','lost',-1),           // Sun night game, after UTC midnight
 rec('2026-10-18T15:25:00-05:00','points','Under','void',0),
 rec('2026-10-20T18:30:00-05:00','threes','Over',null,null),       // pending
 rec('2026-10-20T19:00:00-05:00','points','Under','won',0.7),
 rec('2026-10-17T19:00:00-05:00','points','Under','won',0.6),
 rec('2026-10-17T19:00:00-05:00','anytime TD','Yes','won',0.4,null),
];
const days=byDay(items);
assert.deepEqual(days.map(d=>d.day),['2026-10-20','2026-10-18','2026-10-17']);
assert.equal(days[1].label,'Sun, Oct 18');
assert.equal(days[1].items.length,3);
assert.equal(days[1].items[0].kickoff,'2026-10-19T00:20:00Z');   // newest pick first within the day
assert.deepEqual([days[1].won,days[1].lost,days[1].void,days[1].pending],[1,1,1,0]);
assert.equal(days[1].units,-0.2);
// Pending counts as pending and adds no units.
assert.deepEqual([days[0].won,days[0].pending,days[0].units],[1,1,0.7]);
const s=summarize(items);
assert.deepEqual([s.n,s.won,s.lost,s.void,s.pending],[7,4,1,1,1]);
assert.equal(s.units,1.5);
// Breakdown: keyed market + side, most-bet first, units summed over graded picks only.
const m=byMarket(items);
assert.deepEqual(m.map(x=>x.label),['Points Under','Threes Over','Anytime TD']);
assert.deepEqual(m.map(x=>x.n),[3,3,1]);
assert.equal(m[0].units,1.3);assert.equal(m[1].units,-0.2);
assert.deepEqual([m[1].won,m[1].lost,m[1].pending],[1,1,1]);
assert.equal(byMarket([rec('2026-10-18T12:00:00Z','pra','Over','won',1)])[0].label,'PRA Over');
assert.deepEqual(byDay([]),[]);
console.log('history ok');
}
