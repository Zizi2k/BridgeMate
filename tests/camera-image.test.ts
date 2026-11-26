import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraImageSize} from '../lib/camera-image.ts';
test('phone image sizing preserves landscape and portrait geometry without enlarging small photos',()=>{
 assert.deepEqual(cameraImageSize(4000,3000),{width:2048,height:1536});assert.deepEqual(cameraImageSize(3000,4000),{width:1536,height:2048});assert.deepEqual(cameraImageSize(640,480),{width:640,height:480});
});
test('extreme aspect ratios remain bounded and non-empty; invalid decoder dimensions are rejected',()=>{
 const thin=cameraImageSize(20000,1);assert.equal(thin.width,2048);assert.equal(thin.height,1);
 for(const dimensions of [[0,100],[-1,100],[100,Infinity],[NaN,100]])assert.throws(()=>cameraImageSize(dimensions[0],dimensions[1]));
});
