const {test}=require('node:test');const assert=require('node:assert/strict');const {parseCards,render,parseDuration,parseStyle,parseColor}=require('./import_complications_from_sheet.js');
const header=['Index','Name','Category','Rarity','Value','Set','Effect','Enhanced','Function Calls','Standard','Discipline','Willpower','Launch','Goal'];
const fullHeader=['Index','Name','Category','Rarity','Value','Standard Text','Enhanced Text','Active Enhanced Text','Standard','Discipline','Willpower','Launch','Goal','Requires Pause','Function Calls','Condition Title','Condition Subtitle','Condition Style','Condition Color','Dashboard Prompt','Condition Base Description','Condition Enhanced Description','Condition Base Duration','Condition Enhanced Duration'];
const row=(id,name,value,call='')=>[String(id),name,'Project','Rare',value,'Projects','','',call,true,true,true,true,true];
const fullRow = (id, name, value, extras = {}) => {
  const {
    call = '', pause = true, prompt = false, title = '', subtitle = '', style = '', color = '',
    baseDesc = '', enhDesc = '', baseDur = '', enhDur = '',
  } = extras;
  return [
    String(id), name, 'Project', 'Rare', value, '', '', '', true, true, true, true, true,
    pause, call, title, subtitle, style, color, prompt, baseDesc, enhDesc, baseDur, enhDur,
  ];
};
test('exports handler keys, numeric negatives and X',()=>{const c=parseCards([header,row(1,'One','-3','projectDiePenalty'),row(2,'Two','X')]);assert.equal(c.length,2);assert.equal(c[0].value,-3);assert.match(render(c),/automationKey = "projectDiePenalty"/);assert.match(render(c),/value = "X"/);assert.equal(c[0].requiresPause,true);assert.equal(c[0].dashboardPrompt,false);});
test('rejects malformed completed cards and duplicate identities',()=>{assert.throws(()=>parseCards([header,row(1,'One','???')]));assert.throws(()=>parseCards([header,row(1,'One','2'),row(1,'Two','1')]));assert.throws(()=>parseCards([['wrong']]));});
test('rejects unindexed drafts and keeps indexed cards disabled for every roll',()=>{const disabled=row(1,'Retooling','1');disabled.fill(false,9);assert.throws(()=>parseCards([header,row('','Draft',''),disabled]));const cards=parseCards([header,[],disabled]);assert.equal(cards.length,1);assert(Object.values(cards[0].rollTypes).every(x=>x===false));});
test('reads reordered checkbox columns by header and rejects blank flags',()=>{const r=row(1,'One','2');r[9]=false;const c=parseCards([header,r]);assert.equal(c[0].rollTypes.standard,false);assert.equal(c[0].rollTypes.launch,true);const order=[0,9,10,11,12,13,1,2,3,4,5,6,7,8];assert.deepEqual(parseCards([order.map(i=>header[i]),order.map(i=>r[i])]),c);r[9]='';assert.throws(()=>parseCards([header,r]));});
test('reads completed cards from the consolidated snapshot, retaining zero and X', async () => {
  const { fetchCards } = require('./import_complications_from_sheet.js');
  const cards = await fetchCards({tables: {EXPORT_COMPLICATIONS: [header, row(1,'Zero','0'), row(2,'Variable','X')]}});
  assert.equal(cards[0].value, 0);
  assert.equal(cards[1].value, 'X');
  assert(cards[0].rollTypes.willpowerRoll);
});
test('parses Requires Pause, Dashboard Prompt and condition fields', () => {
  const cards = parseCards([fullHeader, fullRow(15, 'Ennui', '1', {
    pause: false, prompt: false, title: 'ENNUI', subtitle: 'HUMANITY', color: 'Red',
    baseDesc: '−1 Humanity', enhDesc: '−2 Humanity', baseDur: 'Session:+2', enhDur: 'Session:+2',
  })]);
  assert.equal(cards[0].requiresPause, false);
  assert.equal(cards[0].dashboardPrompt, false);
  assert.equal(cards[0].condition.style, 'general');
  assert.equal(cards[0].condition.color, 'red');
  assert.equal(cards[0].condition.baseDescription, '-1 Humanity');
  assert.equal(cards[0].condition.enhancedDescription, '-2 Humanity');
  assert.deepEqual(cards[0].condition.baseDuration, { kind: 'EndOfSession', offset: 2 });
  assert.match(render(cards), /requiresPause = false/);
  assert.match(render(cards), /condition = \{/);
});
test('parses duration and style helpers', () => {
  assert.deepEqual(parseDuration('Session:+1', 'd', 'x'), { kind: 'EndOfSession', offset: 1 });
  assert.deepEqual(parseDuration('Manual', 'd', 'x'), { kind: 'Manual', offset: null });
  assert.equal(parseStyle('Debilitation', 'x'), 'debilitation');
  assert.equal(parseStyle('The Beast', 'x'), 'theBeast');
  assert.equal(parseColor('Gold', 'x'), 'gold');
  assert.throws(() => parseDuration('Scene', 'd', 'x'));
});
