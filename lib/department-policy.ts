export function canManageDepartment(ownerAdmin:boolean,manager:boolean,department:{departmentId:string;status:string;active:boolean}|null|undefined,targetDepartmentId:string|null|undefined){
 return ownerAdmin||!!(manager&&department?.active&&department.status==='approved'&&department.departmentId&&targetDepartmentId===department.departmentId);
}
export const searchEmployee=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLocaleLowerCase('vi').trim();
