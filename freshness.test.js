'use strict';
const assert=require('node:assert/strict');
const {staleFor}=require('./freshness.js');
const cat=generatedAt=>({status:'ok',generatedAt});

// Daily schedule: the 6:47 AM Central run (11:47Z); its 30 minute grace expires at 07:17 Central.
assert.equal(staleFor('strikeouts',cat('2026-09-26T11:46:00Z'),new Date('2026-09-26T12:16:59Z')),false);
assert.equal(staleFor('strikeouts',cat('2026-09-26T11:46:00Z'),new Date('2026-09-26T12:17:00Z')),true);
assert.equal(staleFor('strikeouts',cat('2026-09-26T11:48:00Z'),new Date('2026-09-26T12:17:00Z')),false);
assert.equal(staleFor('strikeouts',cat('2026-09-24T11:48:00Z'),new Date('2026-09-26T12:10:00Z')),true);
// The real 6:47 run finishes ~6:49 and stays current all day (Oct 11: it showed "overdue" from 7:30).
assert.equal(staleFor('receptions',cat('2026-10-11T11:49:10Z'),new Date('2026-10-11T14:49:00Z')),false);

// NFL boards get an additional Thursday refresh; MLB remains daily only.
assert.equal(staleFor('touchdowns',cat('2026-09-24T22:00:00Z'),new Date('2026-09-24T23:36:59Z')),false);
assert.equal(staleFor('touchdowns',cat('2026-09-24T22:00:00Z'),new Date('2026-09-24T23:37:00Z')),true);
assert.equal(staleFor('strikeouts',cat('2026-09-24T22:00:00Z'),new Date('2026-09-24T23:37:00Z')),false);

// Sunday afternoon run that missed its 14:07 refresh becomes overdue at 14:37.
assert.equal(staleFor('receiving',cat('2026-09-27T18:00:00Z'),new Date('2026-09-27T19:36:59Z')),false);
assert.equal(staleFor('receiving',cat('2026-09-27T18:00:00Z'),new Date('2026-09-27T19:37:00Z')),true);
assert.equal(staleFor('passing',cat('2026-09-27T18:00:00Z'),new Date('2026-09-27T19:37:00Z')),true);
// Monday morning, Sunday's 18:07 refresh has expired; a Sunday morning board is stale.
assert.equal(staleFor('touchdowns',cat('2026-09-27T15:00:00Z'),new Date('2026-09-28T11:00:00Z')),true);

// Central DST is respected: January is UTC-6, so the Sunday 10:52 run is 16:52Z.
assert.equal(staleFor('rushing',cat('2026-01-11T16:00:00Z'),new Date('2026-01-11T17:21:59Z')),false);
assert.equal(staleFor('rushing',cat('2026-01-11T16:00:00Z'),new Date('2026-01-11T17:22:00Z')),true);

// A valid prior-day board remains current until today's 07:17 grace expires.
assert.equal(staleFor('strikeouts',cat('2026-09-25T11:48:00Z'),new Date('2026-09-26T12:16:59Z')),false);
assert.equal(staleFor('strikeouts',cat('2026-09-25T11:48:00Z'),new Date('2026-09-26T12:17:00Z')),true);
assert.equal(staleFor('strikeouts',cat('2026-09-25T11:46:00Z'),new Date('2026-09-26T12:10:00Z')),true);
console.log('freshness tests passed');

// NBA boards are due at 6:47 AM, 4:15 PM and 8:15 PM Central every day.
{
  const {staleFor}=require('./freshness.js');
  const at=(iso)=>new Date(iso);
  const ok=g=>({status:'ok',generatedAt:g});
  // Wed Oct 21 2026, 5:00 PM CDT (22:00Z): 4:15 PM slot + 30 min grace has passed.
  assert.equal(staleFor('nba_points',ok('2026-10-21T11:50:00Z'),at('2026-10-21T22:00:00Z')),true);
  assert.equal(staleFor('nba_points',ok('2026-10-21T21:16:00Z'),at('2026-10-21T22:00:00Z')),false);
  // NFL boards on a Wednesday only owe the morning run.
  assert.equal(staleFor('touchdowns',ok('2026-10-21T11:50:00Z'),at('2026-10-21T22:00:00Z')),false);
  console.log('nba freshness ok');
}
