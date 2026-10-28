"""Build the walking graph from Rouillac's drawn streets and bridges (not railways)."""
import json, math, re, xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
root = ET.parse('content/mapas/rouillac/distritos.svg').getroot()
segments = []
# Streets and footpaths, plus the explicitly drawn bridge centerlines.
styles = {('#111', '2.1'), ('#f6eedb', '1.3'), ('#f6eedb', '3.5')}
for el in root.iter():
    if el.tag.endswith('path') and (el.get('stroke'), el.get('stroke-width')) in styles and el.get('fill') == 'none':
        d = el.get('d', '')
        if re.search('[A-LN-Za-ln-z]', d): raise ValueError('Unsupported SVG command')
        for part in d.split('M')[1:]:
            nums = list(map(float, re.findall(r'-?\d+(?:\.\d+)?', part)))
            points = [(nums[i], nums[i+1]+90) for i in range(0, len(nums), 2)]
            segments.extend((a,b) for a,b in zip(points,points[1:]) if math.dist(a,b) > .01)

# Local streets are negative space between city blocks, rather than SVG lines.
# Recover their centerlines with a Voronoi diagram of obstacle boundaries.
import numpy as np
import shapely
from shapely.geometry import Polygon, LineString
from shapely.ops import unary_union, linemerge
from scipy.spatial import Voronoi
block_colors={'#f5c497','#f0b6bf','#f4e39c','#a8c0e2','#b8acd9','#d8c4a2'}
park_colors={'#b9d3a0','#a7c98c','#c4dcae','#efe5cc'}
blocks=[]; city=[]; waters=[]
def polygons(d):
    out=[]
    for part in d.split('M')[1:]:
        nums=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',part)))
        pts=[(nums[i],nums[i+1]+90) for i in range(0,len(nums),2)]
        if len(pts)>=3:
            poly=Polygon(pts)
            if not poly.is_valid: poly=poly.buffer(0)
            if not poly.is_empty: out.extend(list(poly.geoms) if hasattr(poly,'geoms') else [poly])
    return out
for el in root.iter():
    if not el.tag.endswith('path'):continue
    fill=el.get('fill'); stroke=el.get('stroke')
    if fill=='#f6eedb' and stroke=='#b9a37f':city+=polygons(el.get('d',''))
    elif fill=='#8fb8d8':waters+=polygons(el.get('d',''))
    elif fill in block_colors or fill in park_colors:blocks+=polygons(el.get('d',''))
urban=unary_union(city)
obstacles=unary_union(blocks+waters)
free=urban.difference(obstacles)
sites=[]; owners=[]
for owner,poly in enumerate(blocks+waters+city):
    boundary=poly.exterior
    count=max(3,math.ceil(boundary.length/4))
    for t in np.linspace(0,boundary.length,count,endpoint=False):
        q=boundary.interpolate(t);sites.append((q.x,q.y));owners.append(owner)
points=np.asarray(sites);_,unique=np.unique(np.round(points,3),axis=0,return_index=True)
points=points[unique];owners=np.asarray(owners)[unique]
v=Voronoi(points)
lines=[]
for (a,b),ids in zip(v.ridge_points,v.ridge_vertices):
    if owners[a]==owners[b] or len(ids)!=2 or -1 in ids:continue
    pa,pb=v.vertices[ids]
    if np.linalg.norm(pb-pa)<.03:continue
    lines.append(LineString([pa,pb]))
# Exact clipping prevents edges through blocks, parks or rivers.
shapely.prepare(free)
line_array=np.array(lines,dtype=object)
inside=shapely.covers(free,line_array)
valid=list(line_array[inside])
print('Street centerlines inside corridors:',len(valid),flush=True)
merged=linemerge(unary_union(valid))
local_count=0
for line in list(merged.geoms) if hasattr(merged,'geoms') else [merged]:
    coords=list(line.simplify(.25).coords)
    for a,b in zip(coords,coords[1:]):
        if math.dist(a,b)>.05:segments.append((a,b));local_count+=1
print('Local street segments:',local_count,flush=True)
cuts = [[(0,a),(1,b)] for a,b in segments]
cells = defaultdict(list)
for i,(a,b) in enumerate(segments):
    for x in range(math.floor((min(a[0],b[0])-2)/16),math.floor((max(a[0],b[0])+2)/16)+1):
        for y in range(math.floor((min(a[1],b[1])-2)/16),math.floor((max(a[1],b[1])+2)/16)+1): cells[x,y].append(i)
seen=set()
for ids in cells.values():
    for ii,i in enumerate(ids):
        for j in ids[ii+1:]:
            key=(min(i,j),max(i,j))
            if key in seen: continue
            seen.add(key)
            a,b=segments[i]; c,d=segments[j]
            dx,dy=b[0]-a[0],b[1]-a[1]; ex,ey=d[0]-c[0],d[1]-c[1]
            cross=dx*ey-dy*ex
            if abs(cross)>.000001:
                t=((c[0]-a[0])*ey-(c[1]-a[1])*ex)/cross
                u=((c[0]-a[0])*dy-(c[1]-a[1])*dx)/cross
                if -.00001<=t<=1.00001 and -.00001<=u<=1.00001:
                    p=(a[0]+t*dx,a[1]+t*dy);cuts[i].append((max(0,min(1,t)),p));cuts[j].append((max(0,min(1,u)),p))
            # Rounded SVG endpoints may miss a junction by a fraction of a unit.
            for source,point,target,start,end in [(i,a,j,c,d),(i,b,j,c,d),(j,c,i,a,b),(j,d,i,a,b)]:
                vx,vy=end[0]-start[0],end[1]-start[1]
                t=max(0,min(1,((point[0]-start[0])*vx+(point[1]-start[1])*vy)/(vx*vx+vy*vy)))
                q=(start[0]+t*vx,start[1]+t*vy)
                if math.dist(point,q)<=1.2: cuts[target].append((t,point))
nodes=[]; index={}; buckets=defaultdict(list)
def node(p):
    cell=(math.floor(p[0]),math.floor(p[1]))
    for x in range(cell[0]-1,cell[0]+2):
        for y in range(cell[1]-1,cell[1]+2):
            for i in buckets[x,y]:
                if math.dist(nodes[i],p)<=.4:return i
    i=len(nodes);nodes.append([round(p[0],3),round(p[1],3)]);buckets[cell].append(i);return i
edges=set()
for split in cuts:
    ids=[node(p) for _,p in sorted(split,key=lambda x:x[0])]
    for a,b in zip(ids,ids[1:]):
        if a!=b:edges.add((min(a,b),max(a,b)))
adj=[[] for _ in nodes]
for a,b in edges:adj[a].append(b);adj[b].append(a)
components=[];visited=set()
for i in range(len(nodes)):
    if i in visited: continue
    stack=[i];visited.add(i);comp=[]
    while stack:
        n=stack.pop();comp.append(n)
        for j in adj[n]:
            if j not in visited:visited.add(j);stack.append(j)
    components.append(comp)
# Keep actual disconnected streets too: the UI reports when no connecting route exists.
out={'nodes':nodes,'edges':sorted(edges),'metersPerUnit':4}
Path('content/mapas/rouillac/rotas.json').write_text(json.dumps(out,separators=(',',':')),encoding='utf-8')
print(json.dumps({'nodes':len(nodes),'edges':len(edges),'components':len(components),'localSegments':local_count,'largest':sorted(map(len,components),reverse=True)[:8]}))
