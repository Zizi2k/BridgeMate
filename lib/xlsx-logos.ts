import JSZip from 'jszip';
export async function xlsxLogos(bytes:Uint8Array,logos:Record<number,string>){
 const zip=await JSZip.loadAsync(bytes);let types=await zip.file('[Content_Types].xml')!.async('string');
 if(Object.keys(logos).length&&!types.includes('Extension="png"'))types=types.replace('</Types>','<Default Extension="png" ContentType="image/png"/></Types>');
 for(const [number,logo] of Object.entries(logos)){if(!logo)continue;const i=Number(number),drawing=`drawing${i}.xml`;zip.file(`xl/media/logo${i}.png`,Buffer.from(logo.split(',')[1],'base64'));
 types=types.replace('</Types>',`<Override PartName="/xl/drawings/${drawing}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
 const sheet=`xl/worksheets/sheet${i}.xml`,xml=await zip.file(sheet)!.async('string');zip.file(sheet,xml.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ').replace('</worksheet>','<drawing r:id="logoDrawing"/></worksheet>'));
 zip.file(`xl/worksheets/_rels/sheet${i}.xml.rels`,`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="logoDrawing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/${drawing}"/></Relationships>`);
 zip.file(`xl/drawings/_rels/${drawing}.rels`,`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="logo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo${i}.png"/></Relationships>`);
 const png=Buffer.from(logo.split(',')[1],'base64'),width=png.readUInt32BE(16),height=png.readUInt32BE(20),scale=Math.min(72/width,42/height);const cx=Math.round(width*scale*9525),cy=Math.round(height*scale*9525);
 zip.file(`xl/drawings/${drawing}`,`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="Logo Ban"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="logo"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);
 }
 zip.file('[Content_Types].xml',types);return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
