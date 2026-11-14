export const aptisPhotoSlots=[1,2,3,4,5,6] as const;
export type AptisPhotoSlot=(typeof aptisPhotoSlots)[number];
export const aptisPhotoKey=(slot:AptisPhotoSlot)=>slot===1?'aptis-celebration-photo':'aptis-celebration-photo-'+slot;
export const aptisPhotoPath=(slot:AptisPhotoSlot)=>'photo?slot='+slot;
