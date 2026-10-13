from pathlib import Path
import math

def fmt(v): return f'{v:.2f}'.rstrip('0').rstrip('.')
def rect(x,y,w,h): return f'M {fmt(x)} {fmt(y)} h {fmt(w)} v {fmt(h)} h -{fmt(w)} Z'
def circle(x,y,r,reverse=False):
 s=0 if reverse else 1
 return f'M {fmt(x-r)} {fmt(y)} a {fmt(r)} {fmt(r)} 0 1 {s} {fmt(2*r)} 0 a {fmt(r)} {fmt(r)} 0 1 {s} -{fmt(2*r)} 0 Z'
def ring(x,y,r,inside): return circle(x,y,r)+' '+circle(x,y,inside,True)

colors=['#d9ccb3','#e3d5bc','#eadcc4','#efe1ca','#f0e3cf','#f2e6d4',
        '#f3e7d5','#f2e3cb','#efdec2','#ebd7b8','#e7cfaa','#b97758','#c88c67','#d79d77']
plants=[(92,222),(92,278),(310,222),(310,278)]
layers=[]
for level,color in enumerate(colors,1):
 pieces=[]
 if level==1:
  pieces += ['M 55 58 H 342 L 356 72 V 315 L 343 328 H 55 L 43 315 V 72 Z']
 if level==2:
  pieces += ['M 55 70 H 344 V 317 H 55 Z']
  # The garden's two long planting recesses leave a central stone walk.
  pieces += ['M 74 203 V 299 H 115 V 203 Z','M 287 203 V 299 H 328 V 203 Z']
 if level==3:
  pieces += [rect(80,115,254,61),rect(130,176,154,12),rect(182,190,36,119)]
  pieces += [rect(59,197,14,111),rect(329,197,14,111)]
 if level==2: pieces += [rect(124,176,166,22)]
 if level==1: pieces += [rect(117,176,180,33)]
 # Low garden boundary walls and carved rectangular beds.
 if level in (3,4):
  pieces += [rect(58,191,14,120),rect(330,191,14,120)]
  pieces += [rect(58,298,64,12),rect(279,298,65,12)]
 # Six courses of rounded topiary masses beneath the olive paper caps.
 if 3<=level<=6:
  radii={3:9,4:15,5:18,6:16}
  pieces += [circle(x,y,radii[level]) for x,y in plants]
 if 3<=level<=6:
  r={3:29,4:30,5:32,6:32}[level]
  pieces += [circle(201,249,r) if level==3 else ring(201,249,r,{4:22,5:24,6:25}[level])]
 # A continuous house foundation sits at the back of the garden.
 if level<=3: pieces += [rect(88,62,236,69)]
 if 4<=level<=11:
  pieces += [rect(88,62,236,11),rect(88,62,11,69),rect(313,62,11,69)]
  z=(level-3)*6
  radius=20 if z<=28 else math.sqrt(max(0,20**2-(z-28)**2))
  gaps=[(center-radius,center+radius) for center in (132,204,276)] if radius>1 else []
  start=88
  for a,b in gaps:
   pieces += [rect(start,119,a-start,12)]
   start=b
  pieces += [rect(start,119,324-start,12)]
 # A shallow hipped terracotta roof with an overhanging eave.
 if level==12: pieces += [rect(82,52,247,82)]
 if level==13: pieces += [rect(86,58,239,75)]
 if level==14:
  pieces += [rect(96,66,219,59)]
  pieces += [f'M {x} 73 v 44 h .8 v -44 Z' for x in range(119,304,28)]
 layers.append({'id':f'courtyard-{level:02d}','color':color,'path':' '.join(pieces),'inlay':False,'elevation':(level-1)*6})
 if level==4:
  layers.append({'id':'fountain-inlay','color':'#8caaa4','path':circle(201,249,21),'inlay':True,'elevation':19.2})
 if level==6:
  green=' '.join(circle(x,y,16) for x,y in plants)
  layers.append({'id':'garden-inlay','color':'#7d8f71','path':green,'inlay':True,'elevation':31.5})
lines=['/** Registered 400 × 350 coordinates. Bottom to top; one color per slice. */',
       "import type { PaperSlice } from './scenes';",'',
       'export const courtyardSlices: readonly PaperSlice[] = [']
for layer in layers:
 lines.extend(['  {',f"    id: '{layer['id']}',",f"    color: '{layer['color']}',",f"    path: '{layer['path']}',",f"    inlay: {str(layer['inlay']).lower()},",f"    elevation: {layer['elevation']},",f"    thickness: {1.1 if layer['inlay'] else 5.2},",'  },'])
lines+= ['];','']
Path('src/geometry/courtyardSlices.ts').write_text('\n'.join(lines))
# A source-derived SVG form study, without changing the existing experiment.
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 480">',
     '<rect width="560" height="480" fill="#f7f4ee"/>',
     '<defs><filter id="s" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="10"/></filter></defs>',
     '<ellipse cx="277" cy="419" rx="177" ry="18" opacity=".10" fill="#594638" filter="url(#s)"/>']
def opening_shadows():
 paths=[]
 for cx in (132,204,276):
  wx=cx-.3*125+128;wy=37+.12*cx+.79*125+72
  def point(x,h):return f'{fmt(wx+x)} {fmt(wy-h+.12*x)}'
  d=f'M {point(-20,0)} L {point(-20,28)} C {point(-20,39)} {point(-11,48)} {point(0,48)} C {point(11,48)} {point(20,39)} {point(20,28)} L {point(20,0)} Z'
  paths.append(d)
 return ' '.join(paths)
shadow=opening_shadows()
with Path('src/geometry/courtyardSlices.ts').open('a') as source:
 source.write(f"export const courtyardOpeningShadow = '{shadow}';\n")
for i,layer in enumerate(layers):
 z=84-layer['elevation']
 svg += [f'<g transform="translate(0 {z+(1.1 if layer['inlay'] else 5.2)}) matrix(1 .12 -.30 .79 128 37)">',f'<path d="{layer["path"]}" fill="{layer["color"]}"/>',f'<path d="{layer["path"]}" fill="#62402d" opacity=".14"/></g>',
         f'<g transform="translate(0 {z}) matrix(1 .12 -.30 .79 128 37)"><path d="{layer["path"]}" fill="{layer["color"]}" stroke="#614631" stroke-opacity=".12" stroke-width=".65" stroke-linejoin="round"/></g>']
 if layer['id']=='courtyard-03': svg.append(f'<path d="{shadow}" fill="#65533f" opacity=".22"/>')
svg+=['</svg>']
Path('public/courtyard-study.svg').write_text('\n'.join(svg))
