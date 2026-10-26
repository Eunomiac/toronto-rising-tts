const {test}=require('node:test');const assert=require('node:assert/strict');const {parseCards,render}=require('./import_complications_from_sheet.js');
const header=['Index','Name'];const row=(id,name,value,done='✔️')=>[String(id),name,'Project','Rare',value,'Projects','','',done];
test('skips unfinished duplicate indices, retains numeric negatives and X',()=>{const c=parseCards([header,row(1,'One','-3'),row(1,'Draft','','❌'),row(2,'Two','X')]);assert.equal(c.length,2);assert.equal(c[0].value,-3);assert.match(render(c),/value = "X"/);});
test('rejects malformed completed cards and duplicate identities',()=>{assert.throws(()=>parseCards([header,row(1,'One','???')]));assert.throws(()=>parseCards([header,row(1,'One','2'),row(1,'Two','1')]));assert.throws(()=>parseCards([['wrong']]));});
