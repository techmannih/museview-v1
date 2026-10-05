import json, math, heapq, time, sys, argparse
from pathlib import Path
import numpy as np
R=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description="Board-specific clearance-aware MuseView router")
parser.add_argument("--input",type=Path,default=R/"routing/input.simple-route.json")
parser.add_argument("--geometry",type=Path,default=R/"routing/geometry.json")
parser.add_argument("--output",type=Path,required=True)
args=parser.parse_args()
I=json.load(open(args.input)); C=json.load(open(args.geometry))
VIA_HOLE=float(I['minViaHoleDiameter'])
# The board's minimum pad is a floor, not the requested actual via diameter.
# Retain 0.15 mm annular copper around the 0.30 mm through drill.
VIA_PAD=max(float(I['minViaPadDiameter']),VIA_HOLE+.3); VIA_RADIUS=VIA_PAD/2
if VIA_PAD-VIA_HOLE < .3-1e-9: raise ValueError('Vias require at least 0.15 mm annular ring')
STEP=.05; X0=-25.;Y0=-17.5;NX=1001;NY=701;N=NX*NY
xs=X0+np.arange(NX)*STEP;ys=Y0+np.arange(NY)*STEP
parent={}
def find(a):
 parent.setdefault(a,a)
 if parent[a]!=a:parent[a]=find(parent[a])
 return parent[a]
def union(a,b):parent[find(b)]=find(a)
def join(ids):
 for p in ids[1:]:union(ids[0],p)
for o in I['obstacles']:join(o.get('connectedTo',[]))
for c in I['connections']:join([c['name']]+[p['pointId'] for p in c['pointsToConnect']])
for t in I['traces']:join([t['connection_name']]+t.get('connectsTo',[]))
canonical={}
for s in C:
 if s['type']=='source_net':canonical[find(s['source_net_id'])]=s['source_net_id']
def net(ids):
 for k in ids:
  r=find(k)
  if r in canonical:return canonical[r]
 return find(ids[0]) if ids else '__keepout'
ports={p['pcb_port_id']:p for p in C if p['type']=='pcb_port'}
names={p['source_net_id']:p['name'] for p in C if p['type']=='source_net'}
points={};aliases={}
for c in I['connections']:
 n=net([c['name']]);points.setdefault(n,{})
 if c.get('source_trace_id'):aliases[n]=c['source_trace_id']
 for p in c['pointsToConnect']:points[n][p['pointId']]=p
fixed=list(I['traces'])
fixed.append(next(t for t in C if t['type']=='pcb_trace' and t['pcb_trace_id']=='pcb_trace_8'))
# Geometries: net, layers, primitive, parameters; all coordinates in board mm.
geoms=[];padgeoms=[];viaxy=[]
for o in I['obstacles']:
 if o.get('isCopperPour'):continue
 layers=[0 if l=='top' else 1 for l in o['layers'] if l in ['top','bottom']]
 if not layers:continue
 n=net(o.get('connectedTo',[]));x=o['center']['x'];y=o['center']['y'];w=o['width'];h=o['height'];a=o.get('ccwRotationDegrees',0)
 if o.get('circuitJsonMetadata',{}).get('pcb_via_id'):
  viaxy.append((x,y,n));g=(n,layers,'circle',(x,y,max(w,h)/2),.13)
 elif o.get('shape')=='circle':g=(n,layers,'circle',(x,y,max(w,h)/2),.23 if o.get('isNonPlatedHole') else .13)
 else:g=(n,layers,'rect',(x,y,w,h,a),.13)
 geoms.append(g)
 if o.get('circuitJsonMetadata',{}).get('pcb_smtpad_id') or o.get('circuitJsonMetadata',{}).get('pcb_plated_hole_id'):padgeoms.append(g)
# Ground exposed-pad island is actual top copper, represented in the input.
def add_trace_geometry(t,n):
 rr=t['route']
 for a,b in zip(rr,rr[1:]):
  if a['route_type']=='wire' and b['route_type']=='wire' and a.get('layer')==b.get('layer') and a.get('layer') in ['top','bottom']:
   geoms.append((n,[0 if a['layer']=='top' else 1],'seg',(a['x'],a['y'],b['x'],b['y'],max(a['width'],b['width'])/2),.13))
 for p in rr:
  if p['route_type']=='via':
   geoms.append((n,[0,1],'circle',(p['x'],p['y'],VIA_RADIUS),.13));viaxy.append((p['x'],p['y'],n))
for t in fixed:
 n=net([t.get('connection_name',t.get('source_trace_id',''))]+t.get('connectsTo',[]));add_trace_geometry(t,n)
# Explicit vias have both top and bottom ports; expose both as routing terminals.
manualvias=[v for v in C if v['type']=='pcb_via' and int(v['pcb_via_id'].split('_')[-1])<39]
for v in manualvias:
 if not any(math.hypot(v['x']-x,v['y']-y)<.001 for x,y,n in viaxy):
  n=v.get('source_net_id') or net(v.get('pcb_port_ids',[]));viaxy.append((v['x'],v['y'],n));geoms.append((n,[0,1],'circle',(v['x'],v['y'],VIA_RADIUS),.13))
def atvia(p):return p.get('virtual',False) or any(math.hypot(p['x']-v['x'],p['y']-v['y'])<.002 for v in manualvias)
def pid_layer(p,z):
 if p.get('virtual'):return None
 if z==0:return p['pointId']
 for v in manualvias:
  if math.hypot(p['x']-v['x'],p['y']-v['y'])<.002:
   for pid in v.get('pcb_port_ids',[]):
    if 'bottom' in ports.get(pid,{}).get('layers',[]):return pid
 return p['pointId']
def index(p,z=0):return (z*NY+round((p['y']-Y0)/STEP))*NX+round((p['x']-X0)/STEP)
def loc(i):z,i=divmod(i,N);y,x=divmod(i,NX);return x,y,z
# Paint exact expanded primitives in small NumPy windows.
def paint(mask,g,extra,forced=False):
 n,layers,typ,q,gap=g;r=extra+gap
 if typ=='rect':cx,cy,w,h,ang=q;rad=math.hypot(w,h)/2+r
 elif typ=='circle':cx,cy,rad=q;rad+=r
 else:ax,ay,bx,by,rr=q;cx=(ax+bx)/2;cy=(ay+by)/2;rad=math.hypot(bx-ax,by-ay)/2+rr+r
 ix0=max(0,int(math.floor((cx-rad-X0)/STEP)));ix1=min(NX,int(math.ceil((cx+rad-X0)/STEP))+1)
 iy0=max(0,int(math.floor((cy-rad-Y0)/STEP)));iy1=min(NY,int(math.ceil((cy+rad-Y0)/STEP))+1)
 if ix1<=ix0 or iy1<=iy0:return
 xx=xs[ix0:ix1][None,:];yy=ys[iy0:iy1][:,None]
 if typ=='rect':
  a=math.radians(ang);dx=(xx-cx)*math.cos(a)+(yy-cy)*math.sin(a);dy=-(xx-cx)*math.sin(a)+(yy-cy)*math.cos(a)
  area=np.maximum(np.abs(dx)-w/2,0)**2+np.maximum(np.abs(dy)-h/2,0)**2<=(r+1e-8)**2
 elif typ=='circle':area=(xx-cx)**2+(yy-cy)**2<=(rad+1e-8)**2
 else:
  ax,ay,bx,by,rr=q;d=(bx-ax)**2+(by-ay)**2
  u=np.clip(((xx-ax)*(bx-ax)+(yy-ay)*(by-ay))/max(d,1e-20),0,1)
  area=(xx-ax-u*(bx-ax))**2+(yy-ay-u*(by-ay))**2<=(rr+r+1e-8)**2
 for z in ([0,1] if forced else layers):mask[z,iy0:iy1,ix0:ix1]|=area

def base_mask(rad):
 xx=xs[None,:];yy=ys[:,None]
 # Rounded 50x35 rectangle, inset by edge clearance + copper radius.
 dx=np.maximum(np.abs(xx)-22.5,0);dy=np.maximum(np.abs(yy)-15,0)
 outside=(dx*dx+dy*dy>(2.5-.27-rad)**2)|(np.abs(xx)>25-.27-rad)|(np.abs(yy)>17.5-.27-rad)
 return np.broadcast_to(outside,(2,NY,NX)).copy()
def masks(n,width):
 block=base_mask(width/2);vblock=base_mask(VIA_RADIUS)
 for g in geoms:
  if g[0]!=n:paint(block,g,width/2);paint(vblock,g,VIA_RADIUS,True)
  elif g[0]=='__keepout':paint(block,g,width/2);paint(vblock,g,VIA_RADIUS,True)
 # A through via must avoid the lands of even its own net (no via in pad).
 for g in padgeoms:paint(vblock,(g[0],g[1],g[2],g[3],.16),VIA_RADIUS,True)
 for x,y,vn in viaxy:paint(vblock,(vn,[0,1],'circle',(x,y,VIA_RADIUS),.12),VIA_RADIUS,True)
 return block, vblock[0]|vblock[1]

counter=0;output=[]
def w(x,y,z,width):return dict(route_type='wire',x=round(x,7),y=round(y,7),width=width,layer=['top','bottom'][z])
def via(x,y,fr,to):return dict(route_type='via',x=round(x,7),y=round(y,7),from_layer=fr,to_layer=to,via_diameter=VIA_PAD,via_hole_diameter=VIA_HOLE)
def emit(n,a,b,path,width,plane=None):
 global counter
 rr=[];x,y,z=loc(path[0]);rr.append(w(a['x'],a['y'],z,width));
 if pid_layer(a,z):rr[0]['start_pcb_port_id']=pid_layer(a,z)
 # Retain corners and layer transitions; collinear points need no vertices.
 for k,i in enumerate(path):
  x,y,z=loc(i);prev=loc(path[k-1]) if k else None;nxt=loc(path[k+1]) if k+1<len(path) else None
  if prev and prev[2]!=z:
   rr.append(via(xs[x],ys[y],['top','bottom'][prev[2]],['top','bottom'][z]));rr.append(w(xs[x],ys[y],z,width))
  elif k==0 or nxt is None or nxt[2]!=z or (prev is not None and (x-prev[0],y-prev[1])!=(nxt[0]-x,nxt[1]-y)):
   rr.append(w(xs[x],ys[y],z,width))
 if plane:
  x,y,z=loc(path[-1]);rr.append(via(xs[x],ys[y],['top','bottom'][z],plane));toid=f'plane:{n}:{counter}'
 else:
  z=loc(path[-1])[2];rr.append(w(b['x'],b['y'],z,width));toid=b['pointId']
  if pid_layer(b,z):rr[-1]['end_pcb_port_id']=pid_layer(b,z)
 # Remove zero-length same-layer wires, retaining endpoint identities.
 clean=[]
 for p in rr:
  if clean and p['route_type']==clean[-1]['route_type']=='wire' and p['layer']==clean[-1]['layer'] and math.hypot(p['x']-clean[-1]['x'],p['y']-clean[-1]['y'])<.001:
   if p.get('end_pcb_port_id'):clean[-1]['end_pcb_port_id']=p['end_pcb_port_id']
  else:clean.append(p)
 t=dict(type='pcb_trace',pcb_trace_id=f'grid_{counter}',connection_name=n,connectsTo=[a['pointId'],toid],route=clean)
 if n in aliases:t['source_trace_id']=aliases[n]
 counter+=1;output.append(t);add_trace_geometry(t,n)

# A* on 0.05 mm grid, eight planar directions and legal through-via transitions.
dirs=[(1,0,1.),(-1,0,1.),(0,1,1.),(0,-1,1.),(1,1,1.414214),(1,-1,1.414214),(-1,1,1.414214),(-1,-1,1.414214)]
def search(a,b,n,width,plane=False):
 block,vblock=masks(n,width);flat=block.ravel();starts=[index(a,z) for z in ([0,1] if atvia(a) else [0])]
 tx=round((b['x']-X0)/STEP) if b else 0;ty=round((b['y']-Y0)/STEP) if b else 0
 ends={index(b,z) for z in ([0,1] if atvia(b) else [0])} if b else set()
 if any(flat[s] for s in starts) or (b and all(flat[e] for e in ends)):
  print('blocked terminal',names.get(n,n),a['pointId'],b['pointId'] if b else 'plane',flush=True);return None
 def h(x,y):
  if plane:return 0
  dx=abs(x-tx);dy=abs(y-ty);return max(dx,dy)+.414214*min(dx,dy)
 best={s:0. for s in starts};prev={};queue=[(h(*loc(s)[:2]),0.,s) for s in starts];heapq.heapify(queue);exp=0
 while queue:
  f,cost,i=heapq.heappop(queue)
  if cost!=best.get(i):continue
  x,y,z=loc(i);exp+=1
  if (plane and not vblock[y,x]) or (not plane and i in ends):
   path=[i]
   while i in prev:i=prev[i];path.append(i)
   return path[::-1]
  if plane and cost>64:continue
  for dx,dy,dist in dirs:
   xx=x+dx;yy=y+dy
   if not(0<=xx<NX and 0<=yy<NY):continue
   k=(z*NY+yy)*NX+xx
   if flat[k]:continue
   if dx and dy and (flat[(z*NY+y)*NX+xx] or flat[(z*NY+yy)*NX+x]):continue
   cc=cost+dist*(1.0 if (z==0 and dx) or (z==1 and dy) else 1.015)
   if cc<best.get(k,1e30):best[k]=cc;prev[k]=i;heapq.heappush(queue,(cc+h(xx,yy)*1.0,cc,k))
  if not plane and not vblock[y,x]:
   k=(1-z)*N+y*NX+x;cc=cost+32
   if not flat[k] and cc<best.get(k,1e30):best[k]=cc;prev[k]=i;heapq.heappush(queue,(cc+h(x,y)*1.0,cc,k))
  if exp>1500000:break
 print('no route',names.get(n,n),a['pointId'],b['pointId'] if b else 'plane','expanded',exp,flush=True);return None

def groups(n):
 pp=list(points[n].values());par=list(range(len(pp)));idx={p['pointId']:i for i,p in enumerate(pp)}
 def f(a):
  while par[a]!=a:a=par[a]
  return a
 for t in fixed:
  ids=t.get('connectsTo',[])
  if not ids:ids=[t['route'][0].get('start_pcb_port_id'),t['route'][-1].get('end_pcb_port_id')]
  ii=[idx[k] for k in ids if k in idx]
  for k in ii[1:]:par[f(k)]=f(ii[0])
 gg={}
 for i,p in enumerate(pp):gg.setdefault(f(i),[]).append(p)
 return list(gg.values())
# Four USB data contacts escape under the receptacle body, clear of C18.
for ni,pid,x in [('source_net_12','pcb_port_6',-20.),('source_net_13','pcb_port_7',-20.65),('source_net_12','pcb_port_8',-20.),('source_net_13','pcb_port_9',-20.65)]:
 p=points[ni].pop(pid);y=p['y'];vid='usb-escape:'+pid
 rr=[w(p['x'],y,0,.15),w(x,y,0,.15),via(x,y,'top','bottom')];rr[0]['start_pcb_port_id']=pid
 t=dict(type='pcb_trace',pcb_trace_id='grid_usb_'+pid,connection_name=ni,connectsTo=[pid,vid],route=rr)
 output.append(t);add_trace_geometry(t,ni)
 points[ni][vid]=dict(x=x,y=y,layer='bottom',pointId=vid,virtual=True)
# Escape active ESP32 signal lands toward the free area under the module.
u=next(e for e in C if e['type']=='source_component' and e['name']=='U1')
pc=next(e for e in C if e['type']=='pcb_component' and e.get('source_component_id')==u['source_component_id'])
for ni,pp in points.items():
 if names.get(ni) in ['GND','VDD_IO','USB_DM_MCU','USB_DP_MCU']:continue
 for pid,p in list(pp.items()):
  if ports.get(pid,{}).get('pcb_component_id')!=pc['pcb_component_id']:continue
  x,y=p['x'],p['y']
  if x<-4:x=-2.8
  elif x>13:x=11.8
  elif y<-8:y=-6.8
  else:continue
  vid='mcu-escape:'+pid;rr=[w(p['x'],p['y'],0,.15),w(x,y,0,.15),via(x,y,'top','bottom')];rr[0]['start_pcb_port_id']=pid
  t=dict(type='pcb_trace',pcb_trace_id='grid_mcu_'+pid,connection_name=ni,connectsTo=[pid,vid],route=rr)
  output.append(t);add_trace_geometry(t,ni);del pp[pid]
  pp[vid]=dict(x=x,y=y,layer='bottom',pointId=vid,virtual=True)
fail=[];start=time.time()
def route_net(n):
 if n not in points:return
 gg=groups(n);width=.3 if n in ['source_net_1','source_net_2','source_net_4','source_net_5'] else .2 if n in ['source_net_14','source_net_15'] else .15
 while len(gg)>1:
  options=sorted(((math.hypot(a['x']-b['x'],a['y']-b['y']),i,j,a,b) for i,g in enumerate(gg) for j,h in enumerate(gg) if i<j for a in g for b in h),key=lambda q:q[:3])
  success=False
  for _,i,j,a,b in options[:6]:
   path=search(a,b,n,width)
   if path:
    emit(n,a,b,path,width);gg[i]+=gg.pop(j);success=True;break
  if not success:fail.append((n,[[p['pointId'] for p in g] for g in gg]));break
 print('net',names.get(n,n),'routes',counter,'fail',len(fail),'sec',round(time.time()-start,1),flush=True)
# Reserve the regulator feedback escape before larger power-plane vias.
early_nets=[n for n in points if names.get(n) in ['BUCK_FB','CAM_FB']]
for n in early_nets:route_net(n)
# Local plane drops first, without inter-pad detours or redundant plane loops.
for n,plane in [('source_net_0','inner1'),('source_net_3','inner2')]:
 for group in groups(n):
  if any(atvia(p) for p in group):continue
  if n=='source_net_0' and any(1.15<=p['x']<=4.85 and -.05<=p['y']<=3.75 for p in group):continue
  # Prefer capacitor/pull-up terminals over module lands for plane connections.
  candidates=sorted(group,key=lambda p:len([o for o in I['obstacles'] if o.get('componentId')=='pcb_component_19' and p['pointId'] in o.get('connectedTo',[])]))
  ok=False
  for a in candidates:
   path=search(a,None,n,.2,True)
   if path:emit(n,a,None,path,.2,plane);ok=True;break
  if not ok:fail.append((n,[p['pointId'] for p in group]))
 print('plane',plane,'routes',counter,'fail',len(fail),flush=True)
# Route narrow-pitch USB first, then feedback/power, then camera and controls.
order=['source_net_10','source_net_11','source_net_12','source_net_13','source_net_14','source_net_15','source_net_7','source_net_8','source_net_42','source_net_43','source_net_1','source_net_2','source_net_5','source_net_4','source_net_9']+[f'source_net_{i}' for i in [37,36,33,32,31,30,29,28,27,26,25,24,23,22,21,20]]
order += ['source_net_41']
order += [n for n in points if n not in order and n not in ['source_net_0','source_net_3']]
for n in order:
 if n not in early_nets:route_net(n)
result={'traces':output,'failedConnections':fail}
for t in output:
 if not t.get('source_trace_id'):
  st=next((s for s in C if s['type']=='source_trace' and t['connection_name'] in s.get('connected_source_net_ids',[])),None)
  if st:t['source_trace_id']=st['source_trace_id']
json.dump(result,open(args.output,'w'),indent=2)
print('FINISHED',len(output),'routes;',len(fail),'failures;',round(time.time()-start,1),'s',flush=True)

if fail:sys.exit(1)
