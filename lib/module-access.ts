export const modules=['links','payroll-personal','payroll-team'] as const;
export type Module=typeof modules[number];
export type Permission='pending'|'approved'|'denied';
export const moduleLabels:Record<Module,[string,string]>={
 links:['My links','Kho liên kết'],
 'payroll-personal':['Personal payroll','Lương cá nhân'],
 'payroll-team':['Team payroll','Lương nhóm'],
};
export function isModule(value:unknown):value is Module{
 return typeof value==='string'&&modules.some(module=>module===value);
}

export const printDefaults={
 company:'',address:'',salaryTitle:'Phiếu lương nhân viên',advanceTitle:'Phiếu tạm ứng lương',
 code:'Mã nhân viên',worker:'Họ và tên',position:'Chức danh',income:'Các khoản thu nhập',
 base:'Lương chính',allowance:'Phụ cấp',insurance:'Bảo hiểm xã hội',tax:'Thuế thu nhập cá nhân',commission:'Hoa hồng',deductions:'Các khoản phải trừ',advance:'Tiền tạm ứng',
 total:'Tổng thu nhập',balance:'Còn lại',payer:'Người lập phiếu',receiver:'Người nhận',
};
export type PrintTemplate=typeof printDefaults;
export function validatePrintTemplate(input:Record<string,unknown>):PrintTemplate|null{
 const output={...printDefaults};
 for(const key of Object.keys(output) as Array<keyof PrintTemplate>){
  const value=input[key];
  if(typeof value!=='string'||value.trim().length>180||
     (!value.trim()&&key!=='company'&&key!=='address'))return null;
  output[key]=value.trim();
 }
 return output;
}
