"""
生成玫瑰、金沙巧克力、蛋糕的去背動畫 GIF
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))
W, H = 80, 80   # 每張 frame 尺寸

# ─────────────────────────────────────────────
# 工具
# ─────────────────────────────────────────────
def new_frame():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def save_gif(frames, path, duration=80):
    # 轉 P mode 保留透明
    palettes = []
    for f in frames:
        p = f.convert("P", palette=Image.ADAPTIVE, colors=255)
        palettes.append(p)
    palettes[0].save(
        path, save_all=True, append_images=palettes[1:],
        duration=duration, loop=0, transparency=0, disposal=2
    )
    print(f"Saved {path}")

def lerp(a, b, t): return a + (b - a) * t

# ─────────────────────────────────────────────
# 玫瑰 (rose.gif)  — 花瓣旋轉 + 上下飄
# ─────────────────────────────────────────────
def draw_rose(draw, cx, cy, scale=1.0, angle_offset=0):
    # 花瓣
    petal_color   = (220, 30, 60, 230)
    petal_dark    = (160, 10, 40, 200)
    stem_color    = (40, 140, 40, 220)
    leaf_color    = (50, 160, 50, 200)

    # 莖
    draw.line([(cx, cy + int(18*scale)), (cx, cy + int(34*scale))],
              fill=stem_color, width=max(1, int(3*scale)))
    # 葉
    lx = cx - int(8*scale)
    ly = cy + int(26*scale)
    draw.ellipse([lx, ly, lx+int(10*scale), ly+int(6*scale)], fill=leaf_color)

    # 外層花瓣（5 片）
    for i in range(5):
        a = math.radians(angle_offset + i * 72)
        px = cx + int(math.cos(a) * 11 * scale)
        py = cy + int(math.sin(a) * 11 * scale) - int(4*scale)
        r  = int(10 * scale)
        draw.ellipse([px-r, py-r, px+r, py+r], fill=petal_color)

    # 內層花瓣（5 片，錯開 36 度）
    for i in range(5):
        a = math.radians(angle_offset + 36 + i * 72)
        px = cx + int(math.cos(a) * 7 * scale)
        py = cy + int(math.sin(a) * 7 * scale) - int(4*scale)
        r  = int(7 * scale)
        draw.ellipse([px-r, py-r, px+r, py+r], fill=petal_dark)

    # 花心
    draw.ellipse([cx-int(5*scale), cy-int(5*scale)-int(4*scale),
                  cx+int(5*scale), cy+int(5*scale)-int(4*scale)],
                 fill=(255, 180, 0, 240))

def make_rose():
    n = 18
    frames = []
    for i in range(n):
        t   = i / n
        bob = int(math.sin(t * 2 * math.pi) * 3)   # 上下飄 ±3px
        ang = t * 12                                  # 慢慢旋轉
        f   = new_frame()
        cx, cy = W//2, H//2 + bob
        draw_rose(ImageDraw.Draw(f), cx, cy, scale=1.0, angle_offset=ang)
        frames.append(f)
    save_gif(frames, os.path.join(OUT, "rose.gif"), duration=70)

# ─────────────────────────────────────────────
# 金沙巧克力 (chocolate.gif) — 金光閃爍 + 輕搖
# ─────────────────────────────────────────────
def draw_sparkle(draw, x, y, size, alpha):
    c = (255, 220, 50, alpha)
    draw.line([(x-size, y), (x+size, y)], fill=c, width=1)
    draw.line([(x, y-size), (x, y+size)], fill=c, width=1)
    draw.line([(x-size//2, y-size//2), (x+size//2, y+size//2)], fill=c, width=1)
    draw.line([(x+size//2, y-size//2), (x-size//2, y+size//2)], fill=c, width=1)

def draw_chocolate(draw, cx, cy, tilt=0):
    # 盒子
    box_w, box_h = 44, 30
    gold_dark  = (180, 130, 20, 240)
    gold_mid   = (220, 170, 40, 255)
    gold_light = (255, 210, 80, 255)
    brown      = (90, 45, 10, 255)
    choc       = (60, 30, 5, 240)

    # 輕微傾斜偏移
    ox = int(math.sin(math.radians(tilt)) * 4)

    # 盒蓋頂面
    bx1, by1 = cx - box_w//2 + ox, cy - box_h//2 - 4
    bx2, by2 = cx + box_w//2 + ox, cy + box_h//2 - 4
    draw.rectangle([bx1, by1, bx2, by2], fill=gold_mid, outline=gold_dark, width=2)

    # 蝴蝶結
    bow_cx = cx + ox
    bow_cy = by1 - 3
    draw.polygon([
        (bow_cx-10, bow_cy), (bow_cx, bow_cy-6), (bow_cx, bow_cy+1)
    ], fill=gold_dark)
    draw.polygon([
        (bow_cx+10, bow_cy), (bow_cx, bow_cy-6), (bow_cx, bow_cy+1)
    ], fill=gold_dark)
    draw.ellipse([bow_cx-3, bow_cy-4, bow_cx+3, bow_cy+2], fill=gold_light)

    # 盒身（立體感）
    bx1b, by1b = cx - box_w//2 + ox, cy - box_h//2 + 4
    bx2b, by2b = cx + box_w//2 + ox, cy + box_h//2 + 6
    draw.rectangle([bx1b, by1b, bx2b, by2b], fill=brown, outline=gold_dark, width=2)

    # 盒內巧克力格紋
    for col in range(3):
        for row in range(2):
            gx = bx1b + 5 + col * 13
            gy = by1b + 4 + row * 11
            draw.rectangle([gx, gy, gx+10, gy+8], fill=choc, outline=gold_dark, width=1)
            draw.ellipse([gx+2, gy+1, gx+8, gy+6], fill=(80, 40, 8, 200))

def make_chocolate():
    n = 20
    frames = []
    sparkle_positions = [(22,14),(58,18),(12,52),(66,48),(40,8),(70,30)]
    for i in range(n):
        t    = i / n
        tilt = math.sin(t * 2 * math.pi) * 6   # ±6 度搖擺
        bob  = int(math.sin(t * 2 * math.pi) * 2)
        f    = new_frame()
        d    = ImageDraw.Draw(f)
        draw_chocolate(d, W//2, H//2 + bob, tilt=tilt)

        # 金光閃爍
        for j, (sx, sy) in enumerate(sparkle_positions):
            phase = (t + j / len(sparkle_positions)) % 1.0
            alpha = int(abs(math.sin(phase * math.pi)) * 255)
            size  = 3 + int(abs(math.sin(phase * math.pi)) * 3)
            draw_sparkle(d, sx, sy, size, alpha)

        frames.append(f)
    save_gif(frames, os.path.join(OUT, "chocolate.gif"), duration=80)

# ─────────────────────────────────────────────
# 蛋糕 (cake.gif)  — 蠟燭火焰跳動
# ─────────────────────────────────────────────
def draw_flame(draw, cx, cy, flicker):
    # 外焰
    r_w = 4 + flicker
    r_h = 7 + flicker
    draw.ellipse([cx-r_w, cy-r_h, cx+r_w, cy+2], fill=(255, 140, 0, 220))
    # 內焰
    draw.ellipse([cx-2, cy-r_h+1, cx+2, cy+1], fill=(255, 240, 100, 240))

def draw_cake(draw, cx, cy, flicker=0):
    # 蛋糕底層
    cake_col  = (255, 200, 150, 255)  # 奶油色
    pink      = (255, 150, 180, 255)
    dark_line = (200, 100, 100, 200)
    plate_col = (240, 240, 240, 220)
    candle_col= (250, 220, 240, 255)
    candle_w  = (200, 150, 200, 255)

    # 盤子
    draw.ellipse([cx-26, cy+22, cx+26, cy+30], fill=plate_col)

    # 下層蛋糕
    draw.rectangle([cx-22, cy+4, cx+22, cy+24], fill=cake_col)
    draw.rectangle([cx-22, cy+4, cx+22, cy+10], fill=pink)  # 夾心
    draw.rectangle([cx-22, cy+16, cx+22, cy+22], fill=pink)

    # 上層蛋糕（略小）
    draw.rectangle([cx-15, cy-12, cx+15, cy+4], fill=cake_col)
    draw.rectangle([cx-15, cy-12, cx+15, cy-6], fill=pink)

    # 奶油波浪邊（簡化：橢圓點點）
    for bx in range(cx-20, cx+22, 7):
        draw.ellipse([bx, cy+22, bx+6, cy+28], fill=(255,255,255,200))
    for bx in range(cx-13, cx+15, 7):
        draw.ellipse([bx, cy+2, bx+6, cy+8], fill=(255,255,255,200))

    # 蠟燭（兩根）
    candle_xs = [cx-6, cx+6]
    for cndx in candle_xs:
        draw.rectangle([cndx-2, cy-24, cndx+2, cy-12], fill=candle_col, outline=candle_w)
        draw_flame(draw, cndx, cy-26, flicker)

    # 裝飾草莓
    draw.ellipse([cx-4, cy+2, cx+4, cy+10], fill=(220, 40, 40, 240))
    draw.polygon([(cx, cy+2), (cx-2, cy-1), (cx+2, cy-1)], fill=(60,160,40,220))

def make_cake():
    n = 16
    frames = []
    for i in range(n):
        t       = i / n
        # 火焰跳動：兩個頻率疊加
        flicker = int(abs(math.sin(t * 2 * math.pi * 2)) * 2
                    + abs(math.sin(t * 2 * math.pi * 3 + 1)) * 1.5)
        f = new_frame()
        draw_cake(ImageDraw.Draw(f), W//2, H//2 + 6, flicker=flicker)
        frames.append(f)
    save_gif(frames, os.path.join(OUT, "cake.gif"), duration=90)

# ─────────────────────────────────────────────
if __name__ == "__main__":
    make_rose()
    make_chocolate()
    make_cake()
    print("All done!")
