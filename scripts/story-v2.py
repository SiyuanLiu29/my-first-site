import json
from pathlib import Path
nodes={}
def block(name,text,nxt):
 lines=text.split('|') if text else []
 for i,t in enumerate(lines):
  id=f'{name}:{i}'; typ='reply' if t.startswith('我:') else 'pause' if t.startswith('停:') else 'time' if t.startswith('时:') else 'message'
  e={'id':id,'type':typ,'next':f'{name}:{i+1}' if i+1<len(lines) else nxt}
  if typ=='pause': e.update(delay=int(t[2:])*1000,typing=False)
  else:
   e['text']=t[2:] if typ in ['reply','time'] else t
   if typ=='message':e.update(delay=0 if i and lines[i-1].startswith('停:') else 800 if t=='在干嘛' else 2000 if len(t)>12 else 800,typing=len(t)>12)
  nodes[id]=e
 if not lines:nodes[name+':0']={'id':name+':0','type':'jump','next':nxt}
block('start','时:22:41|在干嘛','q1')
data=[
(['刚洗完澡','躺着玩手机','没干嘛'],['哦|我也刚回来没多久|终于能躺会儿了','好悠闲|我:你不也在玩|我这是刚忙完|性质不一样','那挺好|我今天感觉一直在干嘛|现在终于没事了'],'今天是真的有点困|下午有一会儿感觉脑子都不转了'),
(['听起来今天挺累的','那你现在先缓缓','感觉你最近事情确实挺多'],['有一点|主要是困|累倒还好','已经缓过来了|刚回来那会儿才是真的不想动','最近是有一点|不过也还好|忙完就好了'],'诶|我今天中午还遇到一个特别好笑的事|我:什么|就是吃饭的时候|旁边有人突然说了一句话|我当时真的笑了好久|我:然后呢|停:2|……|我现在忘了他说的什么'),
(['没事，你记得自己笑过就行','所以这个故事的重点是你笑了','好，很完整的故事'],['对|反正当时是真的很好笑|现在想不起来了','差不多|我本来还想给你讲来着|算了','……|你这个“完整”是不是有点勉强|我:没有|行吧'],'我最近老这样|想讲一个东西|讲到一半忘了最开始要说什么|我:那说明脑子确实有点累了|也可能|或者单纯就是我记性不好|我:你自己选一个|我不晓得|停:2|不过最近其实还行|感觉慢慢适应一点了'),
(['我也觉得你最近状态还不错','那就好','感觉你现在比以前稳一点了'],['有吗|我:有一点|那还挺好的','嗯|反正慢慢来嘛','好像是|我自己有时候也会这么觉得'],'以前碰到一点事情|可能会一直想|现在就觉得|想那么久也没什么用|该做的还是得做|我:现在确实比以前会处理一点了|可能长大了一点吧|就一点'),
(['不止一点吧','有进步就行','反正我觉得变化还挺明显的'],['你这么觉得啊|我:嗯|那挺好的','对|我也是这么想的','可能你看得比较久吧|我:也有可能|自己有时候反而感觉不到'],'但是唱歌这些还是有好多东西要练|我:我知道|我:但进步了就是进步了|我:偶尔也可以好好夸夸自己|我有啊|我又没说自己没进步|就是还有很多东西想学|我:那就好|我:我还怕你每次别人一夸你|我:你就只想着自己哪里还不够|也没有|被夸还是会开心的|我:那就多开心一会儿|停:2|嘿嘿|好吧|停:2|你今天呢'),
(['也有点累','普普通通','今天还挺闲的'],['那你也早点休息|我:知道|别光知道|等会儿又不睡','那挺好的|普通一点也不错','羡慕|我:你也会有闲的时候|希望吧'],'我明天还得早起|我:听起来不是很想面对|是不太想|但是也没办法'),
(['那今天别拖太晚','明天又是忙的一天','先别想明天了'],['嗯|等会儿就睡','应该吧|希望不要太早|虽然感觉不太可能','也对|想了也改变不了|明天再说'],'停:4|诶|你刚刚说我现在比以前稳一点|我:嗯|我刚刚想了想|可能确实是|以前有些事情会觉得特别大|现在再回头看|好像也就那样'),
(['因为当时的你也是真的觉得很难','能走过来就已经很好了','人本来就是这样一点点长大的吧'],['停:2|嗯|也是|当时觉得难也是真的|现在觉得没那么难也是真的','嗯|反正都走过来了|以后还有以后的事','可能吧|慢慢学嘛|我现在也还有好多东西不会'],'我:反正不用急|我知道|但是还是想让自己再厉害一点|我:这个倒很像你|有吗|我:有|那就继续努力一下|看看明年能不能比现在再好一点'),
(['那你快睡','好，今天先到这里','快去吧'],['知道啦','嗯|下次再说','好|不拖了'],'停:1|晚安|我:晚安')]
for q,(labels,branches,tail) in enumerate(data,1):
 opts=[]
 for letter,label,body in zip('ABC',labels,branches):
  opts.append({'id':f'{q}{letter}','label':label,'messages':[label],'next':f'b{q}{letter}:0'})
  block(f'b{q}{letter}',body,f'after{q}:0')
 nodes[f'q{q}']={'id':f'q{q}','type':'choice','options':opts}
 block(f'after{q}',tail,'memory' if q==8 else 'end' if q==9 else f'q{q+1}')
nodes['memory']={'id':'memory','type':'condition','yes':'tired:0','no':'night:0'}
block('tired','对了|你不是也说累吗|等下早点睡|我:知道啦|嗯','night:0')
block('night','时:23:16|行了不说了|明天还得早起','q9')
nodes['end']={'id':'end','type':'end'}
Path('src/data/conversation.json').write_text(json.dumps({'version':2,'start':'start:0','nodes':nodes},ensure_ascii=False,indent=2)+'\n')
