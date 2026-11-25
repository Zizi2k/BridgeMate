import test from 'node:test';
import assert from 'node:assert/strict';
import {canManageDepartment,searchEmployee} from '../lib/department-policy.ts';
import {evidenceExpiry,imageFilenameAllowed,evidencePreviewMime} from '../lib/attendance-evidence.ts';
const approved={departmentId:'department-a',status:'approved',active:true};
test('department managers cannot manage another department or an unassigned employee',()=>{
 assert.equal(canManageDepartment(false,true,approved,'department-a'),true);
 for(const target of ['department-b','',undefined])assert.equal(canManageDepartment(false,true,approved,target),false);
});
test('pending, disabled and missing department assignments grant no manager access',()=>{
 assert.equal(canManageDepartment(false,true,{...approved,status:'pending'},'department-a'),false);
 assert.equal(canManageDepartment(false,true,{...approved,active:false},'department-a'),false);
 assert.equal(canManageDepartment(false,true,null,'department-a'),false);
 assert.equal(canManageDepartment(false,false,approved,'department-a'),false);
});
test('only the supreme admin can access all departments',()=>{
 assert.equal(canManageDepartment(true,false,null,'department-b'),true);
 assert.equal(canManageDepartment(true,false,null,undefined),true);
});
test('employee search matches Vietnamese names without accents and employee codes',()=>{
 assert.ok(searchEmployee('NV001 Phan Lê Duy').includes(searchEmployee('le duy')));
 assert.ok(searchEmployee('Đặng Văn Anh').includes(searchEmployee('dang')));
 assert.ok(searchEmployee('NV001 Phan Lê Duy').includes(searchEmployee('nv001')));
});
test('evidence expires after two calendar months with month-end clamping',()=>{
 assert.equal(evidenceExpiry('2026-11-25T08:30:00.000Z'),'2027-01-25T08:30:00.000Z');
 assert.equal(evidenceExpiry('2026-12-31T08:30:00.000Z'),'2027-02-28T08:30:00.000Z');
 assert.equal(evidenceExpiry('2023-12-31T08:30:00.000Z'),'2024-02-29T08:30:00.000Z');
});
test('accepts camera, vector, browser and image MIME formats without treating nonimages as images',()=>{
 for(const name of ['a.HEIC','b.tiff','c.nef','d.cr3','e.psd','f.svg','g.avif','h.jpg'])assert.equal(imageFilenameAllowed(name,''),true);
 assert.equal(imageFilenameAllowed('custom.unknown','image/x-custom'),true);
 assert.equal(imageFilenameAllowed('script.html','text/html'),false);
 assert.equal(imageFilenameAllowed('program.exe','application/octet-stream'),false);
});
test('previews only recognized safe raster bytes, never SVG or arbitrary content',()=>{
 assert.equal(evidencePreviewMime(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
 assert.equal(evidencePreviewMime(new Uint8Array([255,216,255])),'image/jpeg');
 assert.equal(evidencePreviewMime(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),null);
 assert.equal(evidencePreviewMime(new TextEncoder().encode('<html>hello</html>')),null);
});
