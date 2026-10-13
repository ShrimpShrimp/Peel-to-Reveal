"""Detailed paper tree and woodland shelter. Literal editable paths are generated
from shared cross sections; each retained sheet has one flat color.
"""
from pathlib import Path
import math
import json
import re

PITCH = 4
COVER_HEIGHT = 136

def f(v): return f'{v:.1f}'.rstrip('0').rstrip('.')
def polygon(points): return 'M '+' L '.join(f'{f(x)} {f(y)}' for x,y in points)+' Z'
def rect(x,y,w,h): return f'M {f(x)} {f(y)} h {f(w)} v {f(h)} h -{f(w)} Z'
def oval(x,y,rx,ry): return f'M {f(x-rx)} {f(y)} a {f(rx)} {f(ry)} 0 1 1 {f(2*rx)} 0 a {f(rx)} {f(ry)} 0 1 1 -{f(2*rx)} 0 Z'
def slit(x,y,w,h): return f'M {f(x)} {f(y)} v {f(h)} h {f(w)} v -{f(h)} Z'
def blend(a,b,t): return '#'+''.join(f'{round(int(a[i:i+2],16)*(1-t)+int(b[i:i+2],16)*t):02x}' for i in (1,3,5))

# Union the leaf silhouettes and their connecting veins before emitting SVG.
# The raster is only a geometry-construction aid; the app renders literal vectors.
GRID = 1.25

def leaf_polygon(x,y,r,phase):
 curves=[((-1,-.21),(-.79,-.47),(-.58,-.38)),((-.57,-.65),(-.21,-.65),(-.05,-.50)),((.18,-.68),(.56,-.51),(.49,-.31)),((.85,-.33),(1.02,-.04),(.83,.14)),((1.01,.45),(.59,.63),(.42,.47)),((.27,.73),(-.12,.64),(-.21,.42)),((-.60,.65),(-.87,.41),(-.69,.19)),((-.97,.23),(-1.04,.09),(-.90,0))]
 c=math.cos(phase);s=math.sin(phase);points=[];start=(-.9,0)
 for a,b,end in curves:
  for k in range(6):
   t=k/6;u=1-t
   px=u**3*start[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t**3*end[0]
   py=u**3*start[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t**3*end[1]
   points.append((x+r*(px*c-py*s),y+r*(px*s+py*c)*.78))
  start=end
 return points

def fill_polygon(cells,points):
 first=max(0,math.floor(min(y for x,y in points)/GRID))
 last=min(279,math.ceil(max(y for x,y in points)/GRID))
 for row in range(first,last+1):
  y=(row+.5)*GRID;crossings=[]
  for j,(x1,y1) in enumerate(points):
   x2,y2=points[(j+1)%len(points)]
   if (y1>y)!=(y2>y):crossings.append(x1+(y-y1)*(x2-x1)/(y2-y1))
  crossings.sort()
  for i in range(0,len(crossings)-1,2):
   left=max(0,math.ceil(crossings[i]/GRID-.5));right=min(319,math.floor(crossings[i+1]/GRID-.5))
   cells.update((col,row) for col in range(left,right+1))

def bridge(cells,a,b,width):
 dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
 if not length:return
 nx=-dy/length*width/2;ny=dx/length*width/2
 fill_polygon(cells,[(a[0]+nx,a[1]+ny),(b[0]+nx,b[1]+ny),(b[0]-nx,b[1]-ny),(a[0]-nx,a[1]-ny)])
 for x,y in (a,b):
  fill_polygon(cells,[(x+math.cos(k*math.tau/16)*width*.58,y+math.sin(k*math.tau/16)*width*.58) for k in range(16)])

def components(cells):
 remaining=set(cells);count=0
 while remaining:
  count+=1;pending=[remaining.pop()]
  while pending:
   x,y=pending.pop()
   for neighbor in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
    if neighbor in remaining:remaining.remove(neighbor);pending.append(neighbor)
 return count

def simplify(points,tolerance=1.05):
 if len(points)<3:return points
 a=points[0];b=points[-1];dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
 distances=[abs(dy*(x-a[0])-dx*(y-a[1]))/length if length else math.hypot(x-a[0],y-a[1]) for x,y in points]
 index=max(range(len(points)),key=lambda i:distances[i])
 if distances[index]<=tolerance:return [a,b]
 return simplify(points[:index+1],tolerance)[:-1]+simplify(points[index:],tolerance)

def vectorize(cells):
 edges={}
 def edge(a,b):edges.setdefault(a,[]).append(b)
 for x,y in sorted(cells):
  if (x,y-1) not in cells:edge((x,y),(x+1,y))
  if (x+1,y) not in cells:edge((x+1,y),(x+1,y+1))
  if (x,y+1) not in cells:edge((x+1,y+1),(x,y+1))
  if (x-1,y) not in cells:edge((x,y+1),(x,y))
 paths=[];outer=0;holes=0
 while edges:
  start=next(iter(edges));point=start;previous=(start[0]-1,start[1]);ring=[]
  while True:
   ring.append((point[0]*GRID,point[1]*GRID));choices=edges[point]
   dx=point[0]-previous[0];dy=point[1]-previous[1]
   target=max(choices,key=lambda p:dx*(p[1]-point[1])-dy*(p[0]-point[0]))
   choices.remove(target)
   if not choices:del edges[point]
   previous,point=point,target
   if point==start:break
  area=sum(ring[i][0]*ring[(i+1)%len(ring)][1]-ring[(i+1)%len(ring)][0]*ring[i][1] for i in range(len(ring)))/2
  if abs(area)<5:continue
  outer+=area>0;holes+=area<0
  ring=simplify(ring+[ring[0]])[:-1]
  def middle(a,b):return ((a[0]+b[0])/2,(a[1]+b[1])/2)
  m=middle(ring[-1],ring[0]);path=f'M {f(m[0])} {f(m[1])}'
  for i,p in enumerate(ring):
   q=middle(p,ring[(i+1)%len(ring)]);path+=f' Q {f(p[0])} {f(p[1])} {f(q[0])} {f(q[1])}'
  paths.append(path+' Z')
 assert outer==1, f'Canopy must be one connected outer contour, got {outer}'
 return ' '.join(paths),holes

def canopy(course):
 cells=set();nodes=[]
 profiles=[.83,.91,.97,1,.99,.97,1,.97,.94,.97,.93,.94,.90,.91,.87,.89,.86]
 size=profiles[course]
 for row in range(-5,6):
  for col in range(-7,8):
   x=col*22+(row%2)*11;y=row*18
   if (x/122)**2+(y/78)**2>1:continue
   cx=218+x*size+5*math.sin(col*13.7+row*5.3+course*.8)
   cy=137+y*size+5*math.sin(row*11.9+col*7.1+course*.7)
   r=(13.7+2.5*math.sin(col*2.2+row*3.1+course*.45))*size
   fill_polygon(cells,leaf_polygon(cx,cy,r,course*.32+row*.62+col*.8));nodes.append((cx,cy))
 if course<=10:
  side_size=[.65,.78,.90,1,.98,.96,.90,.84,.79,.71,.63][course]
  for row in range(-2,3):
   for col in range(-2,3):
    x=col*17+(row%2)*8;y=row*14
    if (x/39)**2+(y/28)**2>1:continue
    cx=320+x*side_size+3*math.sin(col*7+row+course)
    cy=214+y*side_size+3*math.cos(row*4+col+course*.7)
    fill_polygon(cells,leaf_polygon(cx,cy,11.5,course*.28+row*.4+col));nodes.append((cx,cy))
 # A fixed fork seat lies inside the crown, where the bent wooden fork enters.
 # It does not follow the exposed lower trunk or create blue collars around it.
 anchor=(239,184)
 fill_polygon(cells,[(anchor[0]+math.cos(k*math.tau/32)*8,anchor[1]+math.sin(k*math.tau/32)*7) for k in range(32)])
 nodes.append(anchor)
 # A minimum spanning vein network makes the whole paper sheet connected.
 connected={len(nodes)-1};remaining=set(range(len(nodes)-1))
 while remaining:
  _,a,b=min((math.dist(nodes[a],nodes[b]),a,b) for a in connected for b in remaining)
  bridge(cells,nodes[a],nodes[b],3.8 if b<len(nodes)-10 else 4.8)
  connected.add(b);remaining.remove(b)
 # Cut irregular leaf windows only where a solid surrounding rim remains.
 # Checking an expanded window keeps each aperture inside the connected sheet.
 for row in range(-5,6):
  for col in range(-7,8):
   cx=218+col*19+(row%2)*9+4*math.sin(course*.83+row+col)
   cy=137+row*16+4*math.cos(col+course*.7)
   radius=5.4+1.4*math.sin(col*2.7+row*1.3+course*.8)
   if math.dist((cx,cy),anchor)<14 or (course<=10 and math.dist((cx,cy),(320,214))<13):continue
   def window(extra):
    points=[]
    for k in range(32):
     a=k*math.tau/32;rr=(radius+extra)*(1+.28*math.cos(5*a+col)+.06*math.sin(3*a))
     points.append((cx+math.cos(a)*rr*.82,cy+math.sin(a)*rr))
    return points
   rim=set();fill_polygon(rim,window(2.2))
   if rim and rim<=cells:
    hole=set();fill_polygon(hole,window(0))
    trial=cells-hole
    if components(trial)==1:cells=trial
 assert components(cells)==1, 'Retained foliage must be a continuous paper sheet'
 path,holes=vectorize(cells)
 assert holes>=5, 'Keep a lacy, open interior'
 return path


def wood_core(course):
 # The same registered center continues from root flare through the branch fork.
 x=244-.05*course;y=231-.20*course-3.6*max(0,course-18)
 radius=22-5*min(1,max(0,(course-7)/15))
 flare=max(0,1-(course-1)/9)**2 if 1<=course<=10 else 0
 directions=[(.18,33),(.92,42),(1.70,46),(2.60,56),(3.35,20),(4.40,12)]
 points=[]
 for k in range(240):
  a=math.tau*k/240
  r=radius*(1+.027*math.sin(3*a+course*.05)+.018*math.cos(7*a))
  for direction,strength in directions:
   diff=math.atan2(math.sin(a-direction),math.cos(a-direction))
   r+=strength*flare*math.exp(-(diff/.26)**2)
  points.append((x+math.cos(a)*r,y+math.sin(a)*r*.84))
 return polygon(points)

def front_wall(z):
 # Door and window are absent material, framed by the adjacent wood courses.
 gaps=[]
 if 12<=z<=40:gaps.append((112,135))
 if 24<=z<=36:gaps.append((148,167))
 pieces=[];start=88
 for a,b in gaps:
  pieces.append(rect(start,218,a-start,8));start=b
 pieces.append(rect(start,218,178-start,8))
 if 24<=z<=36:pieces.append(rect(156.5,218,2,8))
 return pieces

def shelter(course):
 z=course*PITCH;pieces=[]
 if z==4:pieces += [rect(81,178,102,64),rect(105,242,48,18)]
 if z==8:pieces += [rect(83,179,98,63),rect(109,242,40,11)]
 if z==12:pieces += [rect(85,181,94,60)]
 if 12<=z<=44:
  pieces += [rect(88,181,6,45),rect(172,181,6,45),rect(88,181,90,6)]
  pieces += front_wall(z)
 # Porch posts are continuous, and rails leave a clear passage to the stairs.
 if 12<=z<=40:pieces += [rect(85,233,4,5),rect(175,233,4,5)]
 if z in (16,28):pieces += [rect(85,235,23,3),rect(148,235,31,3)]
 if 16<z<28:
  pieces += [rect(x,235,1.6,3) for x in (88,94,100,105,151,157,163,169,175)]
 if z in (20,40):pieces.append(rect(146,216,23,11))  # Window sill and lintel.
 if z==44:pieces.append(rect(84,178,99,58))        # Roof fascia.
 # Five roof contours create two pitched surfaces and a capped ridge.
 roofs={48:(78,170,112,69),52:(82,177,104,60),56:(86,184,96,47),60:(90,191,88,34),64:(94,198,80,21)}
 if z in roofs:
  x,y,w,h=roofs[z];pieces.append(rect(x,y,w,h))
  if z>=52:
   pieces += [slit(v,y+3,.7,h-6) for v in range(int(x+8),int(x+w-5),9)]
 if z==68:pieces.append(rect(95,203,78,10))
 if z==72:
  pieces += [rect(x,204,8,7) for x in range(96,172,10)]
 return pieces

branches=[
 'M 232 232 C 225 214 221 203 208 190 C 199 181 189 177 178 167 L 183 158 C 197 166 211 174 223 185 C 238 201 247 212 254 229 Z',
 'M 230 229 C 232 212 243 203 257 202 C 276 202 281 211 296 211 C 306 211 314 204 322 201 L 327 211 C 314 222 302 226 288 221 C 275 217 265 214 255 218 C 250 222 252 229 250 234 Z',
 'M 232 227 C 226 204 214 186 199 172 C 181 155 168 154 155 145 L 160 137 C 177 143 196 149 210 162 C 225 179 240 200 249 223 Z',
 'M 236 223 C 240 202 244 188 243 173 C 241 158 231 144 230 130 L 239 128 C 246 140 253 156 253 175 C 255 188 262 199 273 204 C 290 210 308 208 319 199 L 323 206 C 309 220 292 224 273 218 C 261 215 249 215 247 227 Z',
]
def branch_section(path,course,scale=1):
 tokens=re.findall(r'[MLCZ]|-?\d+(?:\.\d+)?',path);out=[];axis=0
 dy=5-.2*course-3.6*max(0,course-18)
 for token in tokens:
  if token in ('M','L','C','Z'):out.append(token);axis=0
  else:
   value=float(token)
   value=244+(value-244)*scale if axis==0 else 226+(value-226)*scale+dy
   out.append(f(value));axis=1-axis
 return ' '.join(out)

layers=[]
for i in range(30):
 color='#d7cfba' if i==0 else blend('#ad825c','#cfad88',min(1,(i-1)/28))
 pieces=['M 55 57 H 341 L 351 67 V 310 L 340 321 H 55 L 45 310 V 67 Z'] if i==0 else [wood_core(i)]
 pieces += shelter(i)
 # Forks grow over several adjacent courses, keeping every branch tied to the core.
 if 14<=i<=19:pieces.append(branch_section(branches[0],i))
 if 17<=i<=23:pieces.append(branch_section(branches[1],i,[.65,.84,1,.99,.9,.76,.58][i-17]))
 if 19<=i<=24:pieces.append(branch_section(branches[2],i))
 if 21<=i<=29:pieces.append(branch_section(branches[3],i))
 # Stone footings and small stepping stones retain the same single sheet color.
 if i in (1,2):pieces += [oval(123,275,11,7),oval(135,297,10,6),rect(83,233,8,8),rect(171,233,8,8)]
 layers.append(dict(id=f'tree-wood-{i+1:02d}',color=color,path=' '.join(pieces),inlay=i>=17,elevation=i*PITCH,thickness=4.15))
# Colors stay within the reference's blue/teal family, with lighter scattered caps.
blue=['#367b8a','#408697','#4b93a5','#589fb0','#6aafbd','#589fb3','#78b9c6','#63adbf','#8fc9d1','#77bac9','#a4d5da','#91ccd5','#b5dfe1','#a7d7dd','#c0e3e3','#b3dce1','#cce8e5']
for i,color in enumerate(blue):
 pieces=[canopy(i)]
 layers.append(dict(id=f'tree-canopy-{i+1:02d}',color=color,path=' '.join(pieces),elevation=68+i*PITCH,thickness=4.05))
layers.sort(key=lambda layer:layer['elevation'])

def opening_shadows():
 # A cast shade within each physical opening, drawn behind the wall courses.
 paths=[]
 floor=8
 for left,right,bottom,top in [(112,135,0,34),(148,167,14,30)]:
  def point(x,h):return f'{f(x-.3*227+128)} {f(37+.12*x+.79*227+COVER_HEIGHT-floor-h)}'
  paths.append(f'M {point(left,bottom)} L {point(left,top)} L {point(right,top)} L {point(right,bottom)} Z')
 return ' '.join(paths)
shadow=opening_shadows()
lines=["/** Detailed tree sections. Shared 400 × 350 coordinates, bottom to top. */", "import type { PaperSlice } from './scenes';", 'export const treeSlices: readonly PaperSlice[] = [']
for layer in layers:lines += ['  '+json.dumps(layer,separators=(',', ':'))+',']
lines += ['];',f"export const treeOpeningShadow = '{shadow}';",'']
Path('src/geometry/treeSlices.ts').write_text('\n'.join(lines))
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 520">','<rect width="560" height="520" fill="#f7f4ee"/>','<defs><filter id="s" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="10"/></filter></defs>','<ellipse cx="275" cy="460" rx="174" ry="18" fill="#594638" opacity=".10" filter="url(#s)"/>']
for layer in layers:
 z=COVER_HEIGHT-layer['elevation'];path=layer['path'];color=layer['color']
 svg += [f'<g transform="translate(0 {z+layer["thickness"]}) matrix(1 .12 -.30 .79 128 37)"><path d="{path}" fill="{color}"/><path d="{path}" fill="#62402d" opacity=".14"/></g>',f'<g transform="translate(0 {z}) matrix(1 .12 -.30 .79 128 37)"><path d="{path}" fill="{color}" stroke="#614631" stroke-opacity=".12" stroke-width=".65" stroke-linejoin="round"/></g>']
 if layer['id']=='tree-wood-03':svg.append(f'<path d="{shadow}" fill="#4f3827" opacity=".52"/>')
svg += ['</svg>']
Path('public/tree-form.svg').write_text('\n'.join(svg))
