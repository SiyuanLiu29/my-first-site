"""Import the approved dialogue verbatim; run from the repository root."""
import re, json
from pathlib import Path

source = Path('docs/dialogue-source.txt').read_text()
story = source.split('## 第一段：在干嘛')[1].split('# 十三、结束方式')[0]
nodes = {}
def block(name, text, next_id):
    lines = [x.strip() for x in text.splitlines() if x.strip()]
    events = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line in ('用户：', '张函瑞：'):
            events.append({'type': 'reply' if line == '用户：' else 'message', 'text': lines[i+1]})
            i += 2
            continue
        if line.startswith(('等待', '聊天停顿')):
            number = re.search(r'(\d+)\s*秒', line)
            events.append({'type':'pause', 'delay': int(number[1])*1000 if number else 2000, 'typing':False})
        elif line == '`对方正在输入…`':
            events.append({'type':'pause', 'delay':2000, 'typing':True})
        elif line in ('`22:36`', '`23:18`'):
            events.append({'type':'time', 'text':line.strip('`')})
        i += 1
    for i,e in enumerate(events):
        e['id'] = f'{name}:{i}'
        e['next'] = f'{name}:{i+1}' if i+1 < len(events) else next_id
        if e['type'] == 'message':
            previous = events[i-1] if i else None
            e['delay'] = (0 if previous and previous['type']=='pause' else
                          800 if e['text']=='在干嘛' else
                          2400 if len(e['text'])>=18 else
                          1700 if len(e['text'])>=12 else
                          700 if previous and previous['type']=='message' else 1000)
            e['typing'] = len(e['text'])>=12
        nodes[e['id']] = e
    if not events:
        nodes[f'{name}:0'] = {'id':f'{name}:0', 'type':'jump', 'next':next_id}

splits = list(re.finditer(r'### (?:用户选择 (\d+)|最后选择)',story))
block('start',story[:splits[0].start()],'q1')
for index, match in enumerate(splits):
    q = index+1
    segment = story[match.end():splits[index+1].start() if index+1<len(splits) else len(story)]
    branches = list(re.finditer(r'### (?:分支 )?(?:'+str(q)+r'|最后 )([ABC])\s*\n',segment))
    options = re.findall(r'([ABC])：\s*\n\s*([^\n]+)', segment[:branches[0].start()])
    nodes[f'q{q}'] = {'id':f'q{q}', 'type':'choice','options':[]}
    for j,b in enumerate(branches):
        letter=b[1]
        content=segment[b.end():branches[j+1].start() if j+1<len(branches) else len(segment)]
        tail=''
        if letter=='C':
            boundary = re.search(r'(?:分支汇合。|(?<!最终)汇合。|# 第[二四]段|等待 4 秒。)',content)
            assert boundary, q
            tail=content[boundary.start():]
            content=content[:boundary.start()]
        sends = ['说不上来','反正就是不太一样了'] if q==7 and letter=='C' else [dict(options)[letter]]
        for msg in sends:
            pattern=r'用户：\s*\n\s*'+re.escape(msg)
            content,n=re.subn(pattern,'',content,count=1)
            assert n==1,(q,letter,msg)
        nodes[f'q{q}']['options'].append({'id':f'{q}{letter}','label':dict(options)[letter],'messages':sends,'next':f'b{q}{letter}:0'})
        block(f'b{q}{letter}',content,f'after{q}:0')
    if q==10:
        before,conditional=tail.split('## 隐藏回收逻辑')
        yes,rest=conditional.split('如果：')
        no,final=rest.split('最终汇合。')
        block('after10',before,'memory')
        nodes['memory']={'id':'memory','type':'condition','yes':'tired:0','no':'ordinary:0'}
        block('tired',yes,'night:0')
        block('ordinary',no,'night:0')
        block('night',final,'q11')
    else:
        block(f'after{q}',tail,f'q{q+1}' if q<11 else 'end')
nodes['end']={'id':'end','type':'end'}
Path('src/data/conversation.json').write_text(json.dumps({'version':1,'start':'start:0','nodes':nodes},ensure_ascii=False,indent=2)+'\n')
messages=sum(n['type'] in ('message','reply') for n in nodes.values())+sum(len(o['messages']) for n in nodes.values() for o in n.get('options',[]))
expected=len(re.findall(r'^(?:用户|张函瑞)：$',story,re.M))
assert messages==expected,(messages,expected)
print(f'Imported {messages} dialogue lines, {len(splits)} choices, {len(nodes)} events.')
