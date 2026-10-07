'use strict';
const assert=require('node:assert/strict');
const {meter,countdown,slip}=require('./lotl-live.js');
const catches=['catch','catches'],yds=['yd','yds'],tds=['TD','TDs'];

// Over 3.5 catches: 4 clears it, 3 needs one more, the line sits inside the track.
assert.equal(meter({pick:'Over',line:3.5},4,catches).tone,'cashed');
assert.equal(meter({pick:'Over',line:3.5},3,catches).note,'Needs 1 catch more');
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
assert.equal(meter({pick:'Over',line:1.5},1,tds).note,'Needs 1 TD more');

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
