import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
let failures=[];let count=0;
for(const file of (await readdir(root)).filter(f=>f.endsWith('.html'))){const html=await readFile(file,'utf8');count++;
  if(!html.includes('lang="uk"'))failures.push(`${file}: missing uk language`);
  if((html.match(/<h1\b/g)||[]).length!==1)failures.push(`${file}: expected one h1`);
  if(/PHONE|EMAIL|TELEGRAM|VIBER|\+380000000000/.test(html))failures.push(`${file}: unresolved contact`);
  if(html.includes('·'))failures.push(`${file}: forbidden middle dot`);
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g)){try{await stat(path.resolve(root,match[1]));}catch{failures.push(`${file}: missing ${match[1]}`);}}
}
const css=await readFile('styles.css','utf8');
for(const match of css.matchAll(/url\(['"]?(\.\/[^)'"?#]+)/g)){try{await stat(path.resolve(root,match[1]));}catch{failures.push(`styles.css: missing ${match[1]}`);}}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log(`Verified ${count} pages / local assets / contacts / Ukrainian language / headings / separators.`);
