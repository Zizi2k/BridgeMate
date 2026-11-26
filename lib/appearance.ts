export const palettes=[{id:'sage',name:'Xanh lá',color:'#365c49'},{id:'ocean',name:'Xanh biển',color:'#2465a8'},{id:'violet',name:'Tím',color:'#7050a3'},{id:'rose',name:'Hồng',color:'#a23e69'},{id:'amber',name:'Hổ phách',color:'#875510'},{id:'slate',name:'Xám',color:'#475569'}] as const;
export const layouts=[{id:'standard',name:'Tiêu chuẩn',description:'Menu bên trái, khoảng cách cân đối.'},{id:'compact',name:'Gọn gàng',description:'Menu và khoảng cách gọn hơn, xem được nhiều dữ liệu.'},{id:'top',name:'Menu phía trên',description:'Menu ngang trên màn hình lớn, rộng chỗ cho bảng.'},{id:'wide',name:'Nội dung rộng',description:'Tận dụng chiều ngang màn hình cho bảng và báo cáo.'}] as const;
export type Layout=typeof layouts[number]['id'];
export function isLayout(value:unknown):value is Layout{return layouts.some(item=>item.id===value)}
export function isPalette(value:unknown):value is typeof palettes[number]['id']{return palettes.some(item=>item.id===value)}
