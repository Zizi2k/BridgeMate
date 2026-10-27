import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile } from '../lib/profile.ts';
const profile = () => ({name:'Duy',bio:'IT student',slogan:'Learn together',interests:['Coding','Swimming'],socials:[{platform:'GitHub',url:'https://github.com/Zizi2k'}],avatar:''});
test('profile preserves Vietnamese text, removes duplicate interests and accepts HTTPS social links',()=>{
  const result=validateProfile({...profile(),bio:'Sinh viên CNTT',interests:['Lập trình','Lập trình']});
  assert.equal(result.bio,'Sinh viên CNTT');assert.deepEqual(result.interests,['Lập trình']);
});
test('profile rejects executable URLs, credentials in URLs and unknown platforms',()=>{
  for(const url of ['javascript:alert(1)','http://example.com','https://user:password@example.com'])assert.throws(()=>validateProfile({...profile(),socials:[{platform:'Website',url}]}));
  assert.throws(()=>validateProfile({...profile(),socials:[{platform:'Unknown',url:'https://example.com'}]}));
});
test('avatar rejects SVG, remote image URLs, oversized data and forged raster types',()=>{
  for(const avatar of ['https://example.com/photo.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,SGVsbG8gd29ybGQh','x'.repeat(160001)])assert.throws(()=>validateProfile({...profile(),avatar}));
});
test('valid raster avatars can be saved and explicitly removed',()=>{
  const avatar='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZksAAAAASUVORK5CYII=';
  assert.equal(validateProfile({...profile(),avatar}).avatar,avatar);
  assert.equal(validateProfile({...profile(),avatar:''}).avatar,'');
});
test('profile bounds prevent oversized biography, slogans and excessive links',()=>{
  assert.throws(()=>validateProfile({...profile(),name:' '}));assert.throws(()=>validateProfile({...profile(),bio:'x'.repeat(1001)}));
  assert.throws(()=>validateProfile({...profile(),slogan:'x'.repeat(181)}));assert.throws(()=>validateProfile({...profile(),socials:Array(9).fill(profile().socials[0])}));
});
