const {test}=require('node:test');const assert=require('node:assert/strict');const {parseCards,render}=require('./import_complications_from_sheet.js');
const header=['Index','Name','Category','Rarity','Value','Set','Effect','Enhanced','DESIGN\nCOMPLETE?','Standard','Discipline','Willpower','Launch','Goal'];const row=(id,name,value,done='✔️')=>[String(id),name,'Project','Rare',value,'Projects','','',done,true,true,true,true,true];
test('skips unfinished duplicate indices, retains numeric negatives and X',()=>{const c=parseCards([header,row(1,'One','-3'),row(1,'Draft','','❌'),row(2,'Two','X')]);assert.equal(c.length,2);assert.equal(c[0].value,-3);assert.match(render(c),/value = "X"/);});
test('rejects malformed completed cards and duplicate identities',()=>{assert.throws(()=>parseCards([header,row(1,'One','???')]));assert.throws(()=>parseCards([header,row(1,'One','2'),row(1,'Two','1')]));assert.throws(()=>parseCards([['wrong']]));});
test('omits unindexed drafts but keeps indexed cards disabled for every roll',()=>{const disabled=row(1,'Retooling','1');disabled.fill(false,9);const cards=parseCards([header,row('','Draft',''),disabled]);assert.equal(cards.length,1);assert(Object.values(cards[0].rollTypes).every(x=>x===false));});
test('reads reordered checkbox columns by header and rejects blank flags',()=>{const r=row(1,'One','2');r[9]=false;const c=parseCards([header,r]);assert.equal(c[0].rollTypes.standard,false);assert.equal(c[0].rollTypes.launch,true);const order=[0,9,10,11,12,13,1,2,3,4,5,6,7,8];assert.deepEqual(parseCards([order.map(i=>header[i]),order.map(i=>r[i])]),c);r[9]='';assert.throws(()=>parseCards([header,r]));});
test('fetches the Cards CSV export without gviz type inference',async t=>{
  const {fetchCards}=require('./import_complications_from_sheet.js');
  const rows=[['','','66','Functions'],header.map(v=>` ${v} `),row(1,'Negative','−3'),row(2,'Variable','X')];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
  t.mock.method(globalThis,'fetch',async url=>{
    const parsed=new URL(url);
    assert.equal(parsed.pathname,'/spreadsheets/d/11kcsl9vAqWeEBEFFmadMs65xpDqMNV8SkCaCNM_09bU/export');
    assert.equal(parsed.searchParams.get('format'),'csv');
    assert.equal(parsed.searchParams.get('gid'),'0');
    return {ok:true,text:async()=>csv};
  });
  const cards=await fetchCards();
  assert.equal(cards[0].value,-3);
  assert.equal(cards[1].value,'X');
  assert(cards[0].rollTypes.willpowerRoll);
});
