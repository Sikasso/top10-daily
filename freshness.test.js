'use strict';
const assert=require('node:assert/strict');
const {staleFor}=require('./freshness.js');
const cat=generatedAt=>({status:'ok',generatedAt});

// Daily schedule: the 30 minute grace expires exactly at 07:30 Central.
assert.equal(staleFor('strikeouts',cat('2026-09-26T11:59:00Z'),new Date('2026-09-26T12:29:59Z')),false);
assert.equal(staleFor('strikeouts',cat('2026-09-26T11:59:00Z'),new Date('2026-09-26T12:30:00Z')),true);
assert.equal(staleFor('strikeouts',cat('2026-09-26T12:01:00Z'),new Date('2026-09-26T12:30:00Z')),false);
assert.equal(staleFor('strikeouts',cat('2026-09-24T12:01:00Z'),new Date('2026-09-26T12:10:00Z')),true);

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

// A valid prior-day board remains current until today's 07:30 grace expires.
assert.equal(staleFor('strikeouts',cat('2026-09-25T12:05:00Z'),new Date('2026-09-26T12:29:59Z')),false);
assert.equal(staleFor('strikeouts',cat('2026-09-25T12:05:00Z'),new Date('2026-09-26T12:30:00Z')),true);
assert.equal(staleFor('strikeouts',cat('2026-09-25T11:59:00Z'),new Date('2026-09-26T12:10:00Z')),true);
console.log('freshness tests passed');
