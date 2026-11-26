import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleWeek,addScheduleDays,plannedShift,scheduleOverlaps} from '../lib/work-schedule.ts';
const now=new Date('2026-11-26T00:00:00Z');
const input={day:'2026-11-30',start:'08:00',end:'17:00',overnight:false,breakMinutes:60,note:'Lắp đặt tại công trình A'};
test('week starts Monday, including Sunday and month/year boundaries',()=>{
 assert.equal(scheduleWeek('2026-11-26'),'2026-11-23');assert.equal(scheduleWeek('2026-11-29'),'2026-11-23');assert.equal(scheduleWeek('2026-11-30'),'2026-11-30');assert.equal(scheduleWeek('2027-01-01'),'2026-12-28');assert.equal(addScheduleDays('2026-12-28',6),'2027-01-03');assert.throws(()=>scheduleWeek('2026-02-30'));
});
test('future shifts are stored in Vietnam time and deduct planned lunch',()=>{
 const row=plannedShift(input,now);assert.equal(row.start,'2026-11-30T01:00:00.000Z');assert.equal(row.end,'2026-11-30T10:00:00.000Z');assert.equal(row.minutes,480);assert.equal(row.note,input.note);
});
test('overnight shifts may cross the selected week boundary',()=>{
 const row=plannedShift({...input,day:'2026-11-29',start:'22:00',end:'06:00',overnight:true,breakMinutes:30},now);assert.equal(row.start,'2026-11-29T15:00:00.000Z');assert.equal(row.end,'2026-11-29T23:00:00.000Z');assert.equal(row.minutes,450);
});
test('past or already-starting shifts cannot be newly registered',()=>{
 assert.throws(()=>plannedShift({...input,day:'2026-11-25'},now),/SCHEDULE_PAST/);assert.throws(()=>plannedShift({...input,day:'2026-11-26',start:'07:00'},now),/SCHEDULE_PAST/);
});
test('rejects invalid dates, time intervals, notes and lunch durations',()=>{
 for(const patch of [{day:'2026-02-30'},{start:'25:00'},{start:'17:00',end:'08:00'},{overnight:'1'},{breakMinutes:-1},{breakMinutes:1000},{breakMinutes:1.5},{note:'x'.repeat(1001)}])assert.throws(()=>plannedShift({...input,...patch},now));
});
test('overlap protection allows adjoining morning/afternoon shifts but rejects shared minutes',()=>{
 const row=plannedShift(input,now);assert.equal(scheduleOverlaps('2026-11-30T10:00:00.000Z','2026-11-30T12:00:00.000Z',[row]),false);assert.equal(scheduleOverlaps('2026-11-30T09:59:00.000Z','2026-11-30T12:00:00.000Z',[row]),true);assert.equal(scheduleOverlaps(row.start,row.end,[row]),true);
});
