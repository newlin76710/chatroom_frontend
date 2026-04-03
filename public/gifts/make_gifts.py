"""
生成玫瑰、金沙巧克力、5款蛋糕的去背動畫 GIF
"""
from PIL import Image, ImageDraw
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))
W, H = 80, 80

def new_frame():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def save_gif(frames, path, duration=80):
    palettes = []
    for f in frames:
        p = f.convert("P", palette=Image.ADAPTIVE, colors=255)
        palettes.append(p)
    palettes[0].save(
        path, save_all=True, append_images=palettes[1:],
        duration=duration, loop=0, transparency=0, disposal=2
    )
    print(f"Saved {path}")

def draw_sparkle(draw, x, y, size, alpha=255, color=(255, 220, 50)):
    if size < 1: size = 1
    r, g, b = color
    c = (r, g, b, alpha)
    draw.line([(x-size, y), (x+size, y)], fill=c, width=1)
    draw.line([(x, y-size), (x, y+size)], fill=c, width=1)
    draw.line([(x-size//2, y-size//2), (x+size//2, y+size//2)], fill=c, width=1)
    draw.line([(x+size//2, y-size//2), (x-size//2, y+size//2)], fill=c, width=1)

def draw_flame(draw, cx, cy, flicker=0, color=(255, 140, 0)):
    r, g, b = color
    rw = 3 + flicker
    rh = 6 + flicker
    draw.ellipse([cx-rw, cy-rh, cx+rw, cy+1], fill=(r, max(0,g-80), 0, 210))
    draw.ellipse([cx-rw+1, cy-rh+1, cx+rw-1, cy], fill=(r, g, 20, 230))
    draw.ellipse([cx-1, cy-rh+2, cx+1, cy-1], fill=(255, 255, 160, 240))

# ══════════════════════════════════════════
# 玫瑰 rose.gif
# ══════════════════════════════════════════
def draw_rose(draw, cx, cy, scale=1.0, angle_offset=0):
    petal_color = (220, 30, 60, 230)
    petal_dark  = (160, 10, 40, 200)
    stem_color  = (40, 140, 40, 220)
    leaf_color  = (50, 160, 50, 200)
    draw.line([(cx, cy+int(18*scale)), (cx, cy+int(34*scale))],
              fill=stem_color, width=max(1, int(3*scale)))
    lx, ly = cx-int(8*scale), cy+int(26*scale)
    draw.ellipse([lx, ly, lx+int(10*scale), ly+int(6*scale)], fill=leaf_color)
    for i in range(5):
        a  = math.radians(angle_offset + i*72)
        px = cx + int(math.cos(a)*11*scale)
        py = cy + int(math.sin(a)*11*scale) - int(4*scale)
        r  = int(10*scale)
        draw.ellipse([px-r, py-r, px+r, py+r], fill=petal_color)
    for i in range(5):
        a  = math.radians(angle_offset + 36 + i*72)
        px = cx + int(math.cos(a)*7*scale)
        py = cy + int(math.sin(a)*7*scale) - int(4*scale)
        r  = int(7*scale)
        draw.ellipse([px-r, py-r, px+r, py+r], fill=petal_dark)
    draw.ellipse([cx-int(5*scale), cy-int(5*scale)-int(4*scale),
                  cx+int(5*scale), cy+int(5*scale)-int(4*scale)],
                 fill=(255, 180, 0, 240))

def make_rose():
    n = 18; frames = []
    for i in range(n):
        t   = i/n
        bob = int(math.sin(t*2*math.pi)*3)
        f   = new_frame()
        draw_rose(ImageDraw.Draw(f), W//2, H//2+bob, angle_offset=t*12)
        frames.append(f)
    save_gif(frames, os.path.join(OUT, "rose.gif"), duration=70)

# ══════════════════════════════════════════
# 金沙巧克力 chocolate.gif — 升級版
# ══════════════════════════════════════════
def draw_gold_choco(draw, cx, cy, tilt=0):
    gold_dk  = (160, 110,  10, 255)
    gold_md  = (210, 160,  30, 255)
    gold_lt  = (255, 215,  70, 255)
    gold_sh  = (255, 245, 160, 255)
    brown    = ( 75,  38,   6, 255)
    choc_dk  = ( 45,  18,   2, 245)
    choc_hi  = ( 95,  52,  16, 200)

    ox = int(math.sin(math.radians(tilt))*5)

    # 底部陰影
    draw.ellipse([cx-22+ox, cy+14, cx+22+ox, cy+22], fill=(0,0,0,55))

    # 盒身
    bx1, by1 = cx-24+ox, cy-10
    bx2, by2 = cx+24+ox, cy+20
    draw.rectangle([bx1, by1, bx2, by2], fill=brown, outline=gold_dk, width=2)

    # 巧克力格子 3×2，加金色鑲邊和光澤
    for col in range(3):
        for row in range(2):
            gx = bx1 + 5 + col*15
            gy = by1 + 5 + row*13
            draw.rectangle([gx, gy, gx+12, gy+10], fill=choc_dk, outline=gold_lt, width=1)
            draw.ellipse([gx+2, gy+1, gx+9, gy+6], fill=choc_hi)
            draw.ellipse([gx+4, gy+2, gx+8, gy+5], fill=(200,155,30,160))

    # 橫緞帶
    rib_y = (by1+by2)//2
    draw.rectangle([bx1, rib_y-2, bx2, rib_y+2], fill=gold_md)

    # 盒蓋
    lid1, lid2 = by1-16, by1
    draw.rectangle([bx1, lid1, bx2, lid2], fill=gold_md, outline=gold_dk, width=2)
    # 蓋面漸層光澤
    draw.rectangle([bx1+3, lid1+3, bx2-3, lid1+8], fill=gold_lt)
    draw.rectangle([bx1+7, lid1+2, bx2-7, lid1+5], fill=gold_sh)

    # 縱緞帶
    rib_x = cx+ox
    draw.rectangle([rib_x-2, lid1, rib_x+2, lid2], fill=gold_dk)
    draw.rectangle([rib_x-2, by1, rib_x+2, by2], fill=gold_dk)

    # 蝴蝶結
    bow_cx, bow_cy = cx+ox, lid1-1
    for sign in [-1, 1]:
        draw.polygon([(bow_cx, bow_cy),
                      (bow_cx+sign*13, bow_cy-8),
                      (bow_cx+sign*11, bow_cy+4)], fill=gold_dk)
        draw.polygon([(bow_cx, bow_cy),
                      (bow_cx+sign*11, bow_cy-6),
                      (bow_cx+sign*9,  bow_cy+3)], fill=gold_lt)
    draw.ellipse([bow_cx-5, bow_cy-6, bow_cx+5, bow_cy+4], fill=gold_sh)

def make_chocolate():
    n = 24; frames = []
    sparks = [(14,8),(66,10),(7,44),(73,38),(36,4),(56,72),(18,66),(62,18),
              (30,58),(50,14),(20,30),(60,50)]
    for i in range(n):
        t   = i/n
        tilt= math.sin(t*2*math.pi)*7
        bob = int(math.sin(t*2*math.pi)*2)
        f   = new_frame()
        d   = ImageDraw.Draw(f)
        draw_gold_choco(d, W//2, H//2+bob, tilt=tilt)
        for j,(sx,sy) in enumerate(sparks):
            phase = (t + j/len(sparks)) % 1.0
            alpha = int(abs(math.sin(phase*math.pi))*255)
            size  = 2 + int(abs(math.sin(phase*math.pi))*4)
            col   = (255,215,50) if j%2==0 else (255,248,200)
            draw_sparkle(d, sx, sy, size, alpha, col)
        frames.append(f)
    save_gif(frames, os.path.join(OUT, "chocolate.gif"), duration=72)

# ══════════════════════════════════════════
# 生日蛋糕 cake_birthday.gif
# 多層彩色 + 彩色蠟燭 + 飄浮彩色碎紙屑
# ══════════════════════════════════════════
def make_birthday_cake():
    n = 20; frames = []
    candle_cols = [(255,80,80),(255,210,40),(80,210,80),(80,140,255),(210,80,220)]
    flame_cols  = [(255,180,50),(255,230,80),(150,255,100),(120,200,255),(255,140,255)]
    # 碎紙屑 (相對偏移, 顏色)
    confetti_def = [
        (-28,-28,(255,70,70)),  (20,-30,(70,200,70)),  (-20,-20,(70,70,255)),
        (18,-22,(255,200,0)),   (-5,-32,(200,70,200)), (28,-18,(70,220,220)),
        (-32,10,(255,150,0)),   (30,20,(255,70,150)),   (-10,26,(70,180,255)),
        (24,28,(100,255,100)),
    ]
    for i in range(n):
        t  = i/n
        f  = new_frame()
        d  = ImageDraw.Draw(f)
        cx, cy = W//2, H//2+8

        # 盤子
        d.ellipse([cx-27,cy+18,cx+27,cy+26], fill=(245,245,245,220))

        # 底層蛋糕 (最寬)
        d.rectangle([cx-24,cy+0,cx+24,cy+20], fill=(255,220,180,255))
        d.rectangle([cx-24,cy+7,cx+24,cy+12], fill=(255,120,180,255))  # 粉夾心
        d.rectangle([cx-24,cy+14,cx+24,cy+19], fill=(120,200,255,255))  # 藍夾心
        # 奶油邊 底
        for bx in range(cx-22, cx+20, 6):
            d.ellipse([bx,cy+17,bx+8,cy+23], fill=(255,255,255,230))
        # 奶油邊 頂
        for bx in range(cx-22, cx+20, 6):
            d.ellipse([bx,cy-2,bx+8,cy+4], fill=(255,255,255,230))

        # 中層
        d.rectangle([cx-17,cy-16,cx+17,cy+0], fill=(255,240,200,255))
        d.rectangle([cx-17,cy-10,cx+17,cy-6], fill=(255,160,80,255))
        for bx in range(cx-15, cx+14, 6):
            d.ellipse([bx,cy-18,bx+8,cy-12], fill=(255,255,255,220))

        # 頂層
        d.rectangle([cx-10,cy-28,cx+10,cy-16], fill=(255,230,180,255))
        d.rectangle([cx-10,cy-24,cx+10,cy-21], fill=(200,100,220,255))

        # 5根彩色蠟燭
        candle_xs = [cx-16, cx-8, cx, cx+8, cx+16]
        for ci,(cndx,cc,fc) in enumerate(zip(candle_xs,candle_cols,flame_cols)):
            d.rectangle([cndx-2,cy-40,cndx+2,cy-28], fill=cc+(255,))
            # 蠟燭條紋
            d.line([(cndx-2,cy-36),(cndx+2,cy-36)], fill=(255,255,255,180), width=1)
            d.line([(cndx-2,cy-32),(cndx+2,cy-32)], fill=(255,255,255,180), width=1)
            flicker = int(abs(math.sin((t+ci*0.2)*2*math.pi*2))*2)
            draw_flame(d, cndx, cy-42+flicker, flicker, fc)

        # 浮動彩色碎紙屑
        for (dx,dy,col) in confetti_def:
            bob = int(math.sin((t + (dx+32)*0.04)*2*math.pi)*4)
            r2,g2,b2 = col
            d.rectangle([cx+dx-2,cy+dy+bob-2,cx+dx+2,cy+dy+bob+2],fill=(r2,g2,b2,200))

        frames.append(f)
    save_gif(frames, os.path.join(OUT, "cake_birthday.gif"), duration=85)

# ══════════════════════════════════════════
# 草莓蛋糕 cake_strawberry.gif
# 粉白多層 + 草莓 + 奶油花 + 粉色光暈
# ══════════════════════════════════════════
def make_strawberry_cake():
    n = 20; frames = []
    # 草莓位置 (相對 cx, cy_top)
    strawb_offsets = [(-10,-4),(0,-7),(10,-4),(-5,-2),(5,-2)]
    for i in range(n):
        t  = i/n
        f  = new_frame()
        d  = ImageDraw.Draw(f)
        cx, cy = W//2, H//2+6

        # 粉色光暈
        for rr in range(30,20,-2):
            alpha = int((30-rr)/10*50)
            d.ellipse([cx-rr,cy-rr-6,cx+rr,cy+rr-6], fill=(255,160,180,alpha))

        # 盤子
        d.ellipse([cx-26,cy+20,cx+26,cy+28], fill=(255,248,248,220))

        # 蛋糕底層
        d.rectangle([cx-22,cy+2,cx+22,cy+22], fill=(255,240,240,255))
        # 草莓醬夾心
        d.rectangle([cx-22,cy+8,cx+22,cy+14], fill=(255,100,120,255))
        # 鮮奶油夾心
        d.rectangle([cx-22,cy+6,cx+22,cy+9], fill=(255,255,255,240))
        d.rectangle([cx-22,cy+14,cx+22,cy+17], fill=(255,255,255,240))
        # 奶油邊 底
        for bx in range(cx-20,cx+18,7):
            d.ellipse([bx,cy+19,bx+9,cy+26], fill=(255,255,255,240))
        # 奶油邊 頂
        for bx in range(cx-20,cx+18,7):
            d.ellipse([bx,cy+0,bx+9,cy+6], fill=(255,255,255,240))

        # 頂層
        d.rectangle([cx-15,cy-14,cx+15,cy+2], fill=(255,245,245,255))
        d.rectangle([cx-15,cy-8,cx+15,cy-5], fill=(255,120,140,255))
        d.rectangle([cx-15,cy-5,cx+15,cy-3], fill=(255,255,255,240))

        # 頂部奶油鮮奶油圓頂
        d.ellipse([cx-14,cy-22,cx+14,cy-4], fill=(255,255,255,255))
        d.ellipse([cx-12,cy-20,cx+12,cy-6], fill=(255,248,248,255))

        # 旋轉奶油花
        for j in range(6):
            ang = math.radians(j*60 + t*30)
            rx = cx + int(math.cos(ang)*9)
            ry = cy - 12 + int(math.sin(ang)*5)
            d.ellipse([rx-4,ry-3,rx+4,ry+3], fill=(255,200,215,220))

        # 草莓裝飾
        top_y = cy - 22
        for dx, dy in strawb_offsets:
            sx, sy = cx+dx, top_y+dy
            d.ellipse([sx-5,sy-4,sx+5,sy+5], fill=(210,35,55,255))
            d.ellipse([sx-4,sy-5,sx+4,sy-2], fill=(235,55,75,255))
            # 白點
            d.ellipse([sx-2,sy-2,sx-1,sy-1], fill=(255,220,220,200))
            d.ellipse([sx+1,sy+0,sx+2,sy+1], fill=(255,220,220,200))
            # 葉子
            d.polygon([(sx,sy-5),(sx-3,sy-9),(sx+3,sy-9)], fill=(35,155,35,230))

        # 粉色閃爍光點
        for j in range(6):
            ang = (t+j/6)*2*math.pi
            sx2 = cx + int(math.cos(ang)*30)
            sy2 = cy - 8 + int(math.sin(ang)*24)
            alpha = int(abs(math.sin((t+j/6)*math.pi))*200)
            draw_sparkle(d, sx2, sy2, 2, alpha, (255,140,180))

        frames.append(f)
    save_gif(frames, os.path.join(OUT, "cake_strawberry.gif"), duration=88)

# ══════════════════════════════════════════
# 檸檬蛋糕 cake_lemon.gif
# 亮黃色系 + 檸檬片 + 白色糖霜滴 + 陽光閃爍
# ══════════════════════════════════════════
def make_lemon_cake():
    n = 20; frames = []
    drip_xs_rel = [-14,-7,0,7,14]  # 相對 cx
    for i in range(n):
        t  = i/n
        f  = new_frame()
        d  = ImageDraw.Draw(f)
        cx, cy = W//2, H//2+6

        # 陽光光暈
        for rr in range(32,20,-2):
            alpha = int((32-rr)/12*55)
            d.ellipse([cx-rr,cy-rr-10,cx+rr,cy+rr-10], fill=(255,240,50,alpha))

        # 盤子
        d.ellipse([cx-26,cy+20,cx+26,cy+28], fill=(255,255,240,220))

        # 底層蛋糕 (鮮黃)
        d.rectangle([cx-22,cy+2,cx+22,cy+22], fill=(255,228,60,255))
        d.rectangle([cx-22,cy+9,cx+22,cy+14], fill=(255,200,20,255))  # 檸檬醬夾心
        d.rectangle([cx-22,cy+7,cx+22,cy+9],  fill=(255,255,220,230))
        d.rectangle([cx-22,cy+14,cx+22,cy+16], fill=(255,255,220,230))
        # 奶油邊
        for bx in range(cx-20,cx+18,7):
            d.ellipse([bx,cy+19,bx+9,cy+26], fill=(255,255,240,240))
        for bx in range(cx-20,cx+18,7):
            d.ellipse([bx,cy+0,bx+9,cy+6], fill=(255,255,240,240))

        # 上層
        d.rectangle([cx-15,cy-14,cx+15,cy+2], fill=(255,232,80,255))
        d.rectangle([cx-15,cy-8,cx+15,cy-5], fill=(255,210,30,255))
        d.rectangle([cx-15,cy-5,cx+15,cy-3], fill=(255,255,220,230))
        for bx in range(cx-13,cx+12,7):
            d.ellipse([bx,cy-16,bx+9,cy-10], fill=(255,255,240,220))

        # 白色糖霜滴落 (動畫)
        for di,dx in enumerate(drip_xs_rel):
            phase = (t + di*0.2) % 1.0
            drip_len = 5 + int(abs(math.sin(phase*math.pi))*9)
            sx2 = cx+dx
            d.rectangle([sx2-2,cy-14,sx2+2,cy-14+drip_len], fill=(255,255,245,235))
            d.ellipse([sx2-3,cy-14+drip_len-3,sx2+3,cy-14+drip_len+4], fill=(255,255,245,230))

        # 頂部白色奶油
        d.ellipse([cx-13,cy-26,cx+13,cy-12], fill=(255,255,250,255))
        d.ellipse([cx-11,cy-25,cx+11,cy-15], fill=(255,255,240,255))

        # 檸檬片
        lx, ly = cx, cy-20
        d.ellipse([lx-9,ly-9,lx+9,ly+9], fill=(255,218,30,240))
        d.ellipse([lx-7,ly-7,lx+7,ly+7], fill=(255,240,80,240))
        for seg in range(6):
            ang = math.radians(seg*60)
            d.line([(lx,ly),(lx+int(math.cos(ang)*7),ly+int(math.sin(ang)*7))],
                   fill=(255,195,15,200), width=1)
        d.ellipse([lx-2,ly-2,lx+2,ly+2], fill=(255,255,200,255))

        # 陽光閃爍
        for j in range(8):
            ang = (t*0.5 + j/8)*2*math.pi
            sx3 = cx + int(math.cos(ang)*32)
            sy3 = cy - 10 + int(math.sin(ang)*28)
            alpha = int(abs(math.sin((t+j/8)*2*math.pi))*230)
            draw_sparkle(d, sx3, sy3, 2, alpha, (255,230,50))

        frames.append(f)
    save_gif(frames, os.path.join(OUT, "cake_lemon.gif"), duration=88)

# ══════════════════════════════════════════
# 巧克力蛋糕 cake_chocolate.gif
# 深棕多層 + 動態巧克力醬滴 + 金箔閃爍 + 頂部圓頂
# ══════════════════════════════════════════
def make_chocolate_cake():
    n = 20; frames = []
    drip_xs_rel = [-12,-5,2,9]
    gold_pos_rel = [(-8,-10),(0,-12),(8,-10),(5,-6),(-5,-6),(0,-8)]
    shaving_rel  = [(-6,0),(8,2),(-10,7),(4,10)]
    for i in range(n):
        t  = i/n
        f  = new_frame()
        d  = ImageDraw.Draw(f)
        cx, cy = W//2, H//2+6

        # 盤子
        d.ellipse([cx-26,cy+20,cx+26,cy+28], fill=(220,200,175,220))

        # 底層 (深棕)
        d.rectangle([cx-22,cy+2,cx+22,cy+22], fill=(76,32,6,255))
        d.rectangle([cx-22,cy+9,cx+22,cy+14], fill=(46,18,2,255))  # 超深夾心
        # 奶油邊 (焦糖色)
        for bx in range(cx-20,cx+18,7):
            d.ellipse([bx,cy+19,bx+9,cy+26], fill=(215,175,130,240))
        for bx in range(cx-20,cx+18,7):
            d.ellipse([bx,cy+0,bx+9,cy+6], fill=(215,175,130,240))

        # 中層
        d.rectangle([cx-16,cy-14,cx+16,cy+2], fill=(88,38,8,255))
        d.rectangle([cx-16,cy-8,cx+16,cy-5], fill=(55,22,3,255))
        d.rectangle([cx-16,cy-5,cx+16,cy-3], fill=(200,155,110,220))
        for bx in range(cx-14,cx+13,7):
            d.ellipse([bx,cy-16,bx+9,cy-10], fill=(200,155,110,220))

        # 巧克力醬滴 (動畫)
        for di,dx in enumerate(drip_xs_rel):
            phase = (t + di*0.25) % 1.0
            drip_len = int(abs(math.sin(phase*math.pi))*11)
            sx2 = cx+dx
            d.rectangle([sx2-2,cy-14,sx2+2,cy-14+drip_len], fill=(38,14,1,245))
            if drip_len > 4:
                d.ellipse([sx2-3,cy-14+drip_len-3,sx2+3,cy-14+drip_len+4], fill=(38,14,1,230))

        # 頂部巧克力圓頂
        d.ellipse([cx-14,cy-27,cx+14,cy-11], fill=(65,26,4,255))
        d.ellipse([cx-11,cy-26,cx+11,cy-14], fill=(96,44,12,255))
        d.ellipse([cx-6,cy-24,cx+6,cy-17], fill=(120,60,20,200))

        # 金箔閃爍
        for j,(gx,gy) in enumerate(gold_pos_rel):
            alpha = int(abs(math.sin((t+j*0.18)*2*math.pi))*200+55)
            d.ellipse([cx+gx-2,cy+gy-2,cx+gx+2,cy+gy+2], fill=(255,215,0,alpha))

        # 巧克力屑
        for (sx3,sy3) in shaving_rel:
            d.line([(cx+sx3-3,cy+sy3),(cx+sx3+3,cy+sy3+1)], fill=(115,55,18,210), width=2)

        # 金色閃爍光點
        for j in range(5):
            ang = (t*0.6+j/5)*2*math.pi
            sx4 = cx + int(math.cos(ang)*30)
            sy4 = cy - 8 + int(math.sin(ang)*26)
            alpha = int(abs(math.sin((t+j/5)*1.5*math.pi))*200)
            draw_sparkle(d, sx4, sy4, 2, alpha, (255,200,50))

        frames.append(f)
    save_gif(frames, os.path.join(OUT, "cake_chocolate.gif"), duration=85)

# ══════════════════════════════════════════
# 杯子蛋糕 cake_cupcake.gif
# 紙杯 + 彩色旋渦奶油 + 撒糖 + 彈跳櫻桃
# ══════════════════════════════════════════
def make_cupcake():
    n = 20; frames = []
    sprinkle_cols = [
        (255,70,70),(70,210,70),(70,70,255),
        (255,205,0),(205,70,205),(70,210,210),
        (255,150,50),(150,255,80),
    ]
    # 撒糖固定相對位置 (dx, dy, color_idx)
    sprinkle_def = [
        (-8,-30,0),(2,-34,1),(10,-30,2),(-4,-37,3),
        (6,-38,4),(-12,-26,5),(14,-27,6),(0,-40,7),
        (-6,-22,1),(8,-24,3),(2,-20,5),
    ]
    for i in range(n):
        t  = i/n
        f  = new_frame()
        d  = ImageDraw.Draw(f)
        cx, cy = W//2, H//2+10

        # 紙杯 (梯形，帶條紋)
        cup_col    = (210,175,255,255)
        cup_stripe = (175,135,230,255)
        cup_light  = (235,215,255,255)
        d.polygon([
            (cx-18,cy+18),(cx+18,cy+18),
            (cx+14,cy+28),(cx-14,cy+28)
        ], fill=cup_col)
        # 條紋
        for s in range(4):
            x_top = cx - 18 + s*9
            x_bot = cx - 14 + int(s*28/4)
            d.line([(x_top,cy+18),(x_bot,cy+28)], fill=cup_stripe, width=2)
        # 杯頂折邊
        d.rectangle([cx-18,cy+18,cx+18,cy+20], fill=cup_light)
        # 杯底高光
        d.ellipse([cx-5,cy+24,cx+5,cy+27], fill=(240,230,255,150))

        # 蛋糕體
        d.ellipse([cx-18,cy+8,cx+18,cy+20], fill=(255,230,190,255))
        d.rectangle([cx-18,cy+12,cx+18,cy+20], fill=(255,230,190,255))
        d.ellipse([cx-12,cy+8,cx+12,cy+16], fill=(255,240,210,255))

        # 奶油圓頂 (多層)
        frost_layers = [
            (20,(255,90,160,255)),
            (17,(255,130,190,255)),
            (13,(255,175,215,255)),
            (9, (255,215,235,255)),
            (5, (255,245,250,255)),
        ]
        for fr_size, fr_col in frost_layers:
            d.ellipse([cx-fr_size, cy-fr_size//2-8,
                       cx+fr_size, cy+fr_size//2-2], fill=fr_col)

        # 旋渦線條 (3圈螺旋)
        for spiral_i in range(3):
            ang_base = t*2*math.pi + spiral_i*(2*math.pi/3)
            for step in range(8):
                ang = ang_base + step*0.3
                r   = 4 + step*1.5
                if r > 18: break
                sx2 = cx + int(math.cos(ang)*r)
                sy2 = cy - 10 + int(math.sin(ang)*(r*0.5))
                d.ellipse([sx2-2,sy2-2,sx2+2,sy2+2], fill=(255,60,140,180))

        # 撒糖
        for (dx,dy,ci) in sprinkle_def:
            bob = int(math.sin((t+(dx+20)*0.05)*2*math.pi)*2)
            r2,g2,b2 = sprinkle_cols[ci%len(sprinkle_cols)]
            angle_d = (i*18 + ci*40) % 180
            rad = math.radians(angle_d)
            d.line([
                (int(cx+dx - math.cos(rad)*3), int(cy+dy+bob - math.sin(rad))),
                (int(cx+dx + math.cos(rad)*3), int(cy+dy+bob + math.sin(rad)))
            ], fill=(r2,g2,b2,230), width=2)

        # 頂部彈跳櫻桃
        cherry_bob = int(math.sin(t*2*math.pi)*3)
        ch_y = cy - 30 + cherry_bob
        d.ellipse([cx-5,ch_y-5,cx+5,ch_y+5], fill=(195,25,35,255))
        d.ellipse([cx-4,ch_y-6,cx+2,ch_y-2], fill=(225,55,65,255))
        d.line([(cx,ch_y-5),(cx+4,ch_y-12)], fill=(35,140,35,220), width=1)

        # 外圍閃光
        for j in range(5):
            ang = (t*0.7+j/5)*2*math.pi
            sx3 = cx + int(math.cos(ang)*28)
            sy3 = cy - 10 + int(math.sin(ang)*22)
            alpha = int(abs(math.sin((t+j/5)*2*math.pi))*180)
            draw_sparkle(d, sx3, sy3, 2, alpha, (255,190,255))

        frames.append(f)
    save_gif(frames, os.path.join(OUT, "cake_cupcake.gif"), duration=85)

# ══════════════════════════════════════════
# 原版蛋糕 cake.gif (保留)
# ══════════════════════════════════════════
def draw_cake(draw, cx, cy, flicker=0):
    cake_col   = (255, 200, 150, 255)
    pink       = (255, 150, 180, 255)
    plate_col  = (240, 240, 240, 220)
    candle_col = (250, 220, 240, 255)
    candle_w   = (200, 150, 200, 255)
    draw.ellipse([cx-26, cy+22, cx+26, cy+30], fill=plate_col)
    draw.rectangle([cx-22, cy+4, cx+22, cy+24], fill=cake_col)
    draw.rectangle([cx-22, cy+4, cx+22, cy+10], fill=pink)
    draw.rectangle([cx-22, cy+16, cx+22, cy+22], fill=pink)
    draw.rectangle([cx-15, cy-12, cx+15, cy+4], fill=cake_col)
    draw.rectangle([cx-15, cy-12, cx+15, cy-6], fill=pink)
    for bx in range(cx-20, cx+22, 7):
        draw.ellipse([bx, cy+22, bx+6, cy+28], fill=(255,255,255,200))
    for bx in range(cx-13, cx+15, 7):
        draw.ellipse([bx, cy+2, bx+6, cy+8], fill=(255,255,255,200))
    candle_xs = [cx-6, cx+6]
    for cndx in candle_xs:
        draw.rectangle([cndx-2, cy-24, cndx+2, cy-12], fill=candle_col, outline=candle_w)
        draw_flame(draw, cndx, cy-26, flicker)
    draw.ellipse([cx-4, cy+2, cx+4, cy+10], fill=(220, 40, 40, 240))
    draw.polygon([(cx, cy+2),(cx-2, cy-1),(cx+2, cy-1)], fill=(60,160,40,220))

def make_cake():
    n = 16; frames = []
    for i in range(n):
        t       = i/n
        flicker = int(abs(math.sin(t*2*math.pi*2))*2 + abs(math.sin(t*2*math.pi*3+1))*1.5)
        f = new_frame()
        draw_cake(ImageDraw.Draw(f), W//2, H//2+6, flicker=flicker)
        frames.append(f)
    save_gif(frames, os.path.join(OUT, "cake.gif"), duration=90)

# ══════════════════════════════════════════
if __name__ == "__main__":
    make_rose()
    make_chocolate()
    make_cake()
    make_birthday_cake()
    make_strawberry_cake()
    make_lemon_cake()
    make_chocolate_cake()
    make_cupcake()
    print("All done!")
