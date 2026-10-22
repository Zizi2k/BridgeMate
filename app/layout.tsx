import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'BridgeMate · Vietnam × WCC',description:'Different languages. Shared goals. A bilingual workspace for student collaboration.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
