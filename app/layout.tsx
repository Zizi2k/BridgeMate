import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'BridgeMate · Vietnam × WCC',description:'Different languages. Shared goals. A bilingual workspace for student collaboration.',icons:{icon:[{url:'/brand/favicon.png',sizes:'64x64',type:'image/png'}],shortcut:'/brand/favicon.png',apple:[{url:'/brand/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
