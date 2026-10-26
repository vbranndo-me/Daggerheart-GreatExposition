"""Bandeiras dos 8 países de Lucentia, 3:2 (900x600)."""
import math, os
W,H=900,600
def svg(body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{body}</svg>'
def rect(x,y,w,h,c): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>'
def poly(pts,c): return '<polygon points="'+" ".join(f"{x:.1f},{y:.1f}" for x,y in pts)+f'" fill="{c}"/>'
def star(cx,cy,r,c,rot=-90):
    pts=[]
    for i in range(10):
        a=math.radians(rot+i*36); rr=r if i%2==0 else r*0.382
        pts.append((cx+rr*math.cos(a),cy+rr*math.sin(a)))
    return poly(pts,c)
def saltire(cx,cy,w,h,t,c):  # aspa
    return (f'<line x1="{cx-w/2}" y1="{cy-h/2}" x2="{cx+w/2}" y2="{cy+h/2}" stroke="{c}" stroke-width="{t}"/>'
            f'<line x1="{cx+w/2}" y1="{cy-h/2}" x2="{cx-w/2}" y2="{cy+h/2}" stroke="{c}" stroke-width="{t}"/>')

IRON,WHITE,EMBER="#3B3F45","#F4F1EA","#E0702B"
BLACK,GOLD,RED="#16161A","#D9A93A","#A8322D"
NAVY="#1F3B63"
PURPLE="#5B2A6E"
SEA,MIST="#1F5C57","#B9C4C2"
WINE,SLATE="#7A1F2B","#5E6A73"
FOREST="#2E5E34"
IVORY,DARK="#EFE6D2","#22182A"

F={}
STEEL="#1E3550"; AUBERG="#3A1F45"
def star8(cx,cy,r,c):
    pts=[]
    for i in range(16):
        a=math.radians(-90+i*22.5); rr=r if i%2==0 else r*0.45
        pts.append((cx+rr*math.cos(a),cy+rr*math.sin(a)))
    return poly(pts,c)
# Entremonts: o vale entre dois montes sobre azul-aço, e a brasa da forja
F["entremonts"]=rect(0,0,W,H,STEEL)+poly([(0,0),(W/2,H*0.62),(W,0),(W,H*0.22),(W/2,H*0.84),(0,H*0.22)],WHITE)+f'<circle cx="{W/2}" cy="{H*0.33}" r="{H*0.12}" fill="{EMBER}"/>'
# Kenturia: preto sobre vermelho, faixa dourada e a estrela de oito pontas do império
F["kenturia"]=rect(0,0,W,H*0.5,BLACK)+rect(0,H*0.5,W,H*0.5,RED)+rect(0,H*0.46,W,H*0.08,GOLD)+star8(W*0.5,H*0.5,H*0.3,GOLD)
# Maresme: listras do mar e o cantão de Kenturia com a estrela em branco
st="".join(rect(0,i*H/5,W,H/5,NAVY if i%2==0 else WHITE) for i in range(5))
F["maresme"]=st+rect(0,0,W*0.4,H*0.6,BLACK)+star8(W*0.2,H*0.3,H*0.2,WHITE)
F["maresme-separatista"]=st
# Narona: branco sobre púrpura; o olho fechado em meia-lua, com os raios do sol em volta
sol=""
for i in range(12):
    a=math.radians(i*30); r1,r2=H*0.21,H*0.3
    sol+=poly([(W/2+r1*math.cos(a-0.12),H/2+r1*math.sin(a-0.12)),(W/2+r2*math.cos(a),H/2+r2*math.sin(a)),(W/2+r1*math.cos(a+0.12),H/2+r1*math.sin(a+0.12))],GOLD)
ew,eh=H*0.19,H*0.11
sol+=f'<path d="M{W/2-ew},{H/2} Q{W/2},{H/2-eh*1.6} {W/2+ew},{H/2} Q{W/2},{H/2+eh*1.6} {W/2-ew},{H/2} Z" fill="{GOLD}"/>'
sol+=f'<path d="M{W/2-ew*0.82},{H/2+H*0.005} Q{W/2},{H/2+eh*1.05} {W/2+ew*0.82},{H/2+H*0.005} Q{W/2},{H/2+eh*0.45} {W/2-ew*0.82},{H/2+H*0.005} Z" fill="{PURPLE}"/>'
F["narona"]=rect(0,0,W,H/2,WHITE)+rect(0,H/2,W,H/2,PURPLE)+sol
# Bretemar: verde-mar, a faixa branca da névoa e a chama da procissão
flame=f'<path d="M{W/2},{H*0.24} C{W/2+H*0.1},{H*0.42} {W/2+H*0.09},{H*0.62} {W/2},{H*0.7} C{W/2-H*0.09},{H*0.62} {W/2-H*0.1},{H*0.42} {W/2},{H*0.24} Z" fill="#F2C14E"/>'
F["bretemar"]=rect(0,0,W,H,SEA)+rect(0,H/3,W,H/3,WHITE)+flame
# Serrania: vinho e branco, a estrela dourada da república na divisa
F["serrania"]=rect(0,0,W*0.4,H,WINE)+rect(W*0.4,0,W*0.6,H,WHITE)+star(W*0.2,H/2,H*0.17,WHITE)
# Codrina: floresta livre, petróleo e a linha da frente
z=[]; n=7
for i in range(n+1):
    t=i/n; z.append((t*W,H*(1-t)))
F["codrina"]=rect(0,0,W,H,FOREST)+poly([(0,H),(W,0),(W,H)],BLACK)+\
  f'<polyline points="'+" ".join(f"{x+((-1)**k)*18:.1f},{y+((-1)**k)*18:.1f}" for k,(x,y) in enumerate(z))+f'" fill="none" stroke="{WHITE}" stroke-width="{H*0.05}" stroke-linejoin="miter"/>'
# Fiorescuro: ouro dos bancos e a flor escura de cinco pétalas na tralha
fl=""
cx0,cy0=W*0.3,H*0.5
for i in range(5):
    a=math.radians(-90+i*72); px,py=cx0+H*0.12*math.cos(a),cy0+H*0.12*math.sin(a)
    fl+=f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{H*0.11:.1f}" fill="{AUBERG}"/>'
fl+=f'<circle cx="{cx0}" cy="{cy0}" r="{H*0.06}" fill="{GOLD}"/>'
F["fiorescuro"]=rect(0,0,W,H,GOLD)+rect(W*0.62,0,W*0.38,H,AUBERG)+fl

for k,b in F.items(): open(f"bandeira-{k}.svg","w").write(svg(b))
print(len(F))
