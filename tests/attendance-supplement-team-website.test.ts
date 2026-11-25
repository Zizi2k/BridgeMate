import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalAttendance,overlapsAttendance} from '../lib/attendance-supplement.ts';
import {teamWebsite,canEditTeamWebsite} from '../lib/team-website.ts';
import {netShiftMinutes} from '../lib/attendance.ts';
const now=new Date('2026-11-25T02:00:00Z');
const base={day:'2026-11-24',start:'08:00',end:'17:00',overnight:false,breakMinutes:60,reason:'Bổ sung ca do nhân viên quên chấm'};
test('supplemented shifts use Vietnam time and deduct lunch correctly',()=>{
 const row=historicalAttendance(base,now);
 assert.equal(row.start,'2026-11-24T01:00:00.000Z');assert.equal(row.end,'2026-11-24T10:00:00.000Z');
 assert.equal(netShiftMinutes(row.start,row.end,row.breakMinutes),480);
 assert.equal(row.reason,base.reason);
});
test('supplementation rejects today, future days, invalid dates, invalid times and missing reasons',()=>{
 for(const patch of [{day:'2026-11-25'},{day:'2026-11-26'},{day:'2026-11-31'},{day:'2026-02-29'},{start:'25:00'},{end:'07:00'},{reason:' '},{breakMinutes:600},{breakMinutes:-1},{breakMinutes:0.5}])assert.throws(()=>historicalAttendance({...base,...patch},now));
});
test('overnight supplementation must finish before the present time and remain within 24 hours',()=>{
 const row=historicalAttendance({...base,start:'22:00',end:'06:00',overnight:true,breakMinutes:30},now);
 assert.equal(row.end,'2026-11-24T23:00:00.000Z');assert.equal(netShiftMinutes(row.start,row.end,30),450);
 assert.throws(()=>historicalAttendance({...base,start:'22:00',end:'10:00',overnight:true},now));
 assert.throws(()=>historicalAttendance({...base,start:'08:00',end:'17:00',overnight:true},now));
});
test('website links normalize domains and permit HTTP or HTTPS only',()=>{
 assert.equal(teamWebsite('example.com/activities'),'https://example.com/activities');
 assert.equal(teamWebsite(' https://example.com/group '),'https://example.com/group');
 assert.equal(teamWebsite('http://example.com'),'http://example.com/');
 assert.equal(teamWebsite('//example.com/team'),'https://example.com/team');
 assert.equal(teamWebsite(''),'');
 for(const value of ['javascript:alert(1)','data:text/html,hello','file:///tmp/private','ftp://example.com','https://user:pass@example.com','https://example.com/\nscript','https://','x'.repeat(2050)])assert.throws(()=>teamWebsite(value));
});
test('team website editing is restricted to owner, elected leader and admin',()=>{
 const team={ownerId:'owner',leaderId:'leader'};
 assert.equal(canEditTeamWebsite('owner',team),true);assert.equal(canEditTeamWebsite('leader',team),true);
 assert.equal(canEditTeamWebsite('member',team),false);assert.equal(canEditTeamWebsite('member',team,true),true);
});

test('supplementation detects overlapping overnight and still-open shifts but accepts adjacent shifts',()=>{
 const rows=[{start:'2026-11-24T22:00:00+07:00',end:'2026-11-25T06:00:00+07:00'}];
 assert.equal(overlapsAttendance('2026-11-25T05:00:00+07:00','2026-11-25T10:00:00+07:00',rows),true);
 assert.equal(overlapsAttendance('2026-11-24T20:00:00+07:00','2026-11-24T22:00:00+07:00',rows),false);
 assert.equal(overlapsAttendance('2026-11-25T06:00:00+07:00','2026-11-25T10:00:00+07:00',rows),false);
 assert.equal(overlapsAttendance('2026-11-24T23:00:00+07:00','2026-11-25T03:00:00+07:00',[{start:rows[0].start,end:null}]),true);
});
