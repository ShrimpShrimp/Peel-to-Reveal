from pathlib import Path
import re,math
head_outer='M 53 124 C 51 114 61 112 72 109 C 92 101 119 95 155 89 C 188 84 212 78 226 94'
head_low='C 209 178 167 176 141 166 C 119 163 103 154 93 149 C 76 145 55 137 53 124 Z'
head_high='C 212 132 167 127 141 128 C 116 127 100 120 93 119 C 76 115 55 131 53 124 Z'
shoulder_outer='C 254 94 287 100 301 118'
shoulder_low='C 310 142 286 165 248 170 C 240 171 235 166 232 155'
shoulder_high='C 306 130 291 144 270 145 C 255 144 247 137 229 131'
sections=[
 # Leading edges tuck under their preceding shell section, creating broad
 # shared material at the shoulder and middle bend instead of point joins.
 (10,'M 298 114 C 325 128 347 155 348 180 C 350 198 346 209 337 213',
 'C 323 223 297 230 280 218 C 268 209 277 186 288 165 C 292 140 303 122 298 114 Z',
 'C 335 211 331 205 331 198 C 327 187 334 169 330 156 C 320 136 306 119 298 114 Z'),
 (9,'M 343 177 C 355 204 356 226 345 249 C 339 258 326 270 317 273',
 'Q 297 278 281 266 C 267 257 279 230 300 216 C 319 201 333 187 343 177 Z',
 'Q 315 267 320 258 C 326 246 336 224 340 211 C 341 195 342 184 343 177 Z'),
 (8,'M 343 249 C 329 275 300 295 275 296',
 'C 262 294 254 284 261 273 C 284 268 318 253 343 249 Z',
 'C 269 293 270 284 279 278 C 299 274 324 260 343 249 Z'),
 (7,'M 274 297 C 252 307 231 307 216 295',
 'C 211 288 212 279 221 275 C 239 277 262 271 276 276 C 284 287 282 295 274 297 Z',
 'C 211 291 213 284 221 282 C 239 285 263 280 276 283 C 282 290 280 295 274 297 Z')
]
tail='M 217 282 C 193 268 177 260 155 265 C 141 269 149 286 173 294 C 188 299 204 294 217 282 Z M 217 284 C 191 290 163 302 164 317 C 166 335 204 322 221 304 C 228 295 226 287 217 284 Z'
legs='M 95 145 C 84 151 72 169 80 176 C 85 181 100 159 111 155 Z M 112 152 C 99 164 94 183 101 187 C 107 190 116 166 125 158 Z M 128 158 C 118 170 117 189 124 191 C 131 193 131 171 146 162 Z'
antennae='M 80 117 C 66 109 51 92 43 78 C 42 75 44 73 46 76 C 57 92 70 104 84 112 Q 86 117 80 117 Z M 74 124 C 49 126 32 117 24 103 C 22 100 25 98 27 101 C 37 115 53 119 77 119 Q 81 122 74 124 Z'
colors=['#f8dc78','#f9d47e','#face85','#f9c18a','#f7b18b','#f5a287','#f39a83','#f18f7a','#f18b77','#f18774','#f18471','#f1826f','#f1806d','#f17e6b']
def blend(a,b,q):
 aa=re.findall(r'[A-Z]|-?\d+(?:\.\d+)?',a);bb=re.findall(r'[A-Z]|-?\d+(?:\.\d+)?',b)
 assert len(aa)==len(bb)
 return ' '.join(x if x.isalpha() else f'{float(x)+(float(y)-float(x))*q:.1f}'.rstrip('0').rstrip('.') for x,y in zip(aa,bb))
def ease(level,height):
 t=(level-1)/(height-1)
 # A belly at 32% of the height, with the bottom returning inward. Above
 # the belly, the established inside slope is retained. No pyramid base.
 if t < .32:
  return .67*((.32-t)/.32)**1.65
 return math.sin((t-.32)/.68*math.pi/2)

def underside(path,level,center):
 scale={1:.86,2:.92,3:.97}.get(level,1)
 if scale==1: return path
 tokens=re.findall(r'[A-Z]|-?\d+(?:\.\d+)?',path)
 axis=0; result=[]
 for token in tokens:
  if token.isalpha(): axis=0;result.append(token)
  else:
   v=float(token);anchor=center[axis%2]
   result.append(f'{anchor+(v-anchor)*scale:.1f}'.rstrip('0').rstrip('.'))
   axis+=1
 return ' '.join(result)
lines=[
 '/** Shared 400 × 350 paper coordinates. Ordered bottom to top. */',
 'export type ShrimpSlice = { id: string; color: string; path: string };',
 "export const PAPER_BOUNDS = 'M 0 0 H 400 V 350 H 0 Z';",
 "export const COVER_COLOR = '#f8e6ce';",'',
 '// The lower contours tuck inward below the broad middle cross-sections.',
 '// Higher outside contours stay registered, with pale paper toward the curl;',
 '// the high outer shell stays salmon. Sections keep distinct heights.',
 '// The head and shoulder share one outline with no separating gap.',
 '// Each slice has one flat color. Slice 15 is the dark eye inlay.',
 'export const shrimpSlices: readonly ShrimpSlice[] = ['
]
for level,color in enumerate(colors,1):
 q=ease(level,14)
 if level<=12:
  head=head_outer+' '+shoulder_outer+' '+blend(shoulder_low,shoulder_high,ease(level,12))+' '+blend(head_low,head_high,q)
 else:
  head=head_outer+' C 248 94 267 101 278 116 C 282 129 251 134 229 131 '+blend(head_low,head_high,q)
 pieces=[underside(head,level,(174,130))]
 for height,outer,low,high in sections:
  if level<=height:
   center={10:(319,176),9:(319,233),8:(300,277),7:(246,292)}[height]
   pieces.append(underside(outer+' '+blend(low,high,ease(level,height)),level,center))
 if level<=6: pieces.append(underside(tail,level,(188,293)))
 if level<=7: pieces.append(underside(legs,level,(119,158)))
 if level==14: pieces.append(antennae)
 lines.extend(['  {',f"    id: 'slice-{level:02d}',",f"    color: '{color}',",f"    path: '{' '.join(pieces)}',",'  },'])
lines.extend(["  { id: 'eye-inlay', color: '#945445', path: 'M 127.7 122 A 7.5 7.5 0 1 1 112.7 122 A 7.5 7.5 0 1 1 127.7 122 Z' },",'];',''])
Path('src/geometry/shrimpSlices.ts').write_text('\n'.join(lines))
