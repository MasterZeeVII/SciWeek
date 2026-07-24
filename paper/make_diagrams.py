# -*- coding: utf-8 -*-
"""Render Chapter 3 diagrams (PNG) for the SciWeek project paper.

Outputs into paper/diagrams/:
  fig_3_1_decomposition.png  - Functional Decomposition Diagram
  fig_3_2_context.png        - Context Diagram (DFD Level 0)
  fig_3_3_dfd1.png           - Data Flow Diagram Level 1
  fig_3_4_er.png             - ER Diagram (crow's-foot-ish with 1/M labels)

Style follows the sample in ref/context_diagram_and_dfd: plain black boxes,
straight arrows, white background.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "diagrams")
os.makedirs(OUT, exist_ok=True)

FONT_REG = r"C:\Windows\Fonts\leelawad.ttf"
FONT_BOLD = r"C:\Windows\Fonts\leelawdb.ttf"

try:
    LAYOUT = ImageFont.Layout.RAQM
    ImageFont.truetype(FONT_REG, 20, layout_engine=LAYOUT)
except Exception:
    LAYOUT = ImageFont.Layout.BASIC


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size, layout_engine=LAYOUT)


BLACK = (20, 20, 20)
WHITE = (255, 255, 255)
LINE_W = 3


def text_size(d, s, f):
    box = d.textbbox((0, 0), s, font=f)
    return box[2] - box[0], box[3] - box[1]


def center_text(d, cx, cy, lines, f, fill=BLACK, line_gap=6):
    """Draw lines of text centered on (cx, cy)."""
    if isinstance(lines, str):
        lines = [lines]
    heights = []
    for s in lines:
        _, h = text_size(d, s, f)
        heights.append(h)
    # use font metrics for stable line height
    asc, desc = f.getmetrics()
    lh = asc + desc + line_gap
    total = lh * len(lines) - line_gap
    y = cy - total / 2
    for s in lines:
        w, _ = text_size(d, s, f)
        d.text((cx - w / 2, y), s, font=f, fill=fill)
        y += lh


def entity_box(d, x, y, w, h, lines, f):
    """External entity: rectangle with a doubled bottom-left edge (sample style)."""
    d.rectangle([x, y, x + w, y + h], outline=BLACK, width=LINE_W, fill=WHITE)
    off = 7
    d.line([x + off, y + h, x + off, y + h + off], fill=BLACK, width=LINE_W)
    d.line([x + off, y + h + off, x + w + off, y + h + off], fill=BLACK, width=LINE_W)
    d.line([x + w + off, y + off, x + w + off, y + h + off], fill=BLACK, width=LINE_W)
    d.line([x + w, y + off, x + w + off, y + off], fill=BLACK, width=LINE_W)
    center_text(d, x + w / 2, y + h / 2, lines, f)


def process_box(d, x, y, w, h, number, lines, f, fnum=None):
    """Process: rectangle with a numbered header strip."""
    strip = 40
    d.rectangle([x, y, x + w, y + h], outline=BLACK, width=LINE_W, fill=WHITE)
    d.line([x, y + strip, x + w, y + strip], fill=BLACK, width=LINE_W)
    center_text(d, x + w / 2, y + strip / 2, str(number), fnum or f)
    center_text(d, x + w / 2, y + strip + (h - strip) / 2, lines, f)


def datastore(d, x, y, w, h, dnum, label, f):
    """Data store: open-right rectangle with D# cell."""
    d.line([x, y, x + w, y], fill=BLACK, width=LINE_W)
    d.line([x, y + h, x + w, y + h], fill=BLACK, width=LINE_W)
    d.line([x, y, x, y + h], fill=BLACK, width=LINE_W)
    cell = 56
    d.line([x + cell, y, x + cell, y + h], fill=BLACK, width=LINE_W)
    center_text(d, x + cell / 2, y + h / 2, dnum, f)
    center_text(d, x + cell + (w - cell) / 2, y + h / 2, label, f)


def arrow_head(d, x, y, angle, size=14):
    a1 = angle + math.radians(152)
    a2 = angle - math.radians(152)
    p1 = (x + size * math.cos(a1), y + size * math.sin(a1))
    p2 = (x + size * math.cos(a2), y + size * math.sin(a2))
    d.polygon([(x, y), p1, p2], fill=BLACK)


def arrow(d, pts, label=None, f=None, label_dy=-14, label_at=0.5, label_dx=0):
    """Polyline arrow through pts with head at the end; optional label."""
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=BLACK, width=LINE_W)
    (x1, y1), (x2, y2) = pts[-2], pts[-1]
    arrow_head(d, x2, y2, math.atan2(y2 - y1, x2 - x1))
    if label:
        # place label on the longest segment
        seg = max(range(len(pts) - 1), key=lambda i: (pts[i + 1][0] - pts[i][0]) ** 2 + (pts[i + 1][1] - pts[i][1]) ** 2)
        (ax, ay), (bx, by) = pts[seg], pts[seg + 1]
        lx = ax + (bx - ax) * label_at + label_dx
        ly = ay + (by - ay) * label_at + label_dy
        w, h = text_size(d, label, f)
        d.text((lx - w / 2, ly - h / 2), label, font=f, fill=BLACK)


def new_canvas(w, h):
    img = Image.new("RGB", (w, h), WHITE)
    return img, ImageDraw.Draw(img)


def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path)
    print("wrote", path)


# ----------------------------------------------------------------------------
# Fig 3.1 Functional Decomposition Diagram
# ----------------------------------------------------------------------------
def fig_decomposition():
    W, H = 2600, 1030
    img, d = new_canvas(W, H)
    f_title = font(40, bold=True)
    f_root = font(30, bold=True)
    f_child = font(26, bold=True)
    f_leaf = font(24)

    center_text(d, W / 2, 55, "Functional Decomposition Diagram", f_title)

    root_w, root_h = 620, 90
    rx, ry = W / 2 - root_w / 2, 120
    d.rectangle([rx, ry, rx + root_w, ry + root_h], outline=BLACK, width=LINE_W)
    center_text(d, W / 2, ry + root_h / 2,
                ["ระบบจัดการผลการแข่งขันกีฬาอีสปอร์ต", "งานสัปดาห์วิทยาศาสตร์แห่งชาติ"], f_root)

    children = [
        ("1.0", "จัดการผู้ใช้งาน\nและสิทธิ์",
         ["1.1 เพิ่ม/แก้ไข/\nปิดใช้งานบัญชี", "1.2 กำหนดบทบาท\n(ADMIN/MONITOR/\nFIELD STAFF)", "1.3 เข้าสู่ระบบ/\nออกจากระบบ"]),
        ("2.0", "จัดการการแข่งขัน\nประจำปี",
         ["2.1 สร้างการแข่งขัน\nตามปี พ.ศ.", "2.2 เปิดใช้งาน\nการแข่งขัน", "2.3 กำหนดรุ่น\nมัธยมต้น/มัธยมปลาย"]),
        ("3.0", "จัดการทีม\nผู้เข้าแข่งขัน",
         ["3.1 จัดการข้อมูล\nโรงเรียน", "3.2 ลงทะเบียน/แก้ไข/\nลบทีม", "3.3 บันทึกรายชื่อ\nผู้เล่น (5 คน/ทีม)"]),
        ("4.0", "จัดสาย\nการแข่งขัน",
         ["4.1 กำหนดรอบและ\nรูปแบบ Best of", "4.2 สุ่มจับสายแบบ\nSingle Elimination", "4.3 กำหนดคู่ชิง\nอันดับที่ 3", "4.4 รีเซ็ตสาย\nการแข่งขัน"]),
        ("5.0", "บันทึกผล\nการแข่งขัน",
         ["5.1 ถ่ายภาพ/อัปโหลด\nหน้าจอสรุปผล", "5.2 กำหนดพื้นที่\nคะแนน (ROI)", "5.3 สกัดคะแนน\nด้วย OCR"]),
        ("6.0", "ตรวจสอบและ\nยืนยันผล",
         ["6.1 เทียบคะแนน OCR\nกับภาพหลักฐาน", "6.2 ยืนยัน/ปฏิเสธ/\nแก้ไขคะแนน", "6.3 เลื่อนทีมชนะ\nเข้ารอบถัดไป", "6.4 ล้างผลรอบถัดไป\nเมื่อผลถูกแก้ไข"]),
        ("7.0", "แสดงผลการแข่งขัน\nสาธารณะ",
         ["7.1 แสดงสาย\nการแข่งขันสด", "7.2 แสดงผลคะแนน\nที่ยืนยันแล้ว", "7.3 เรียกดูผล\nย้อนหลังรายปี", "7.4 สรุปสถิติภาพรวม\n(Dashboard)"]),
    ]

    n = len(children)
    cw, ch = 320, 100
    gap = (W - 120 - n * cw) / (n - 1)
    top_y = 300
    bus_y = ry + root_h + 40
    d.line([W / 2, ry + root_h, W / 2, bus_y], fill=BLACK, width=LINE_W)

    first_cx = 60 + cw / 2
    last_cx = 60 + (n - 1) * (cw + gap) + cw / 2
    d.line([first_cx, bus_y, last_cx, bus_y], fill=BLACK, width=LINE_W)

    f_num = font(24, bold=True)
    for i, (num, name, leaves) in enumerate(children):
        x = 60 + i * (cw + gap)
        cx = x + cw / 2
        d.line([cx, bus_y, cx, top_y], fill=BLACK, width=LINE_W)
        d.rectangle([x, top_y, x + cw, top_y + ch], outline=BLACK, width=LINE_W)
        center_text(d, cx, top_y + ch / 2, [num + " " + s for s in [name.split("\n")[0]]] + name.split("\n")[1:], f_child)
        ly = top_y + ch + 36
        for leaf in leaves:
            lines = leaf.split("\n")
            lh = 34 + 30 * len(lines)
            d.line([cx, ly - 36 if leaf == leaves[0] else ly - 30, cx, ly + lh / 2], fill=BLACK, width=LINE_W)
            # connect via left spine instead: simple vertical spine down the column
            d.rectangle([x + 14, ly, x + cw - 14, ly + lh], outline=BLACK, width=2, fill=WHITE)
            center_text(d, cx, ly + lh / 2, lines, f_leaf, line_gap=2)
            ly += lh + 26
    save(img, "fig_3_1_decomposition.png")


# ----------------------------------------------------------------------------
# Fig 3.2 Context Diagram
# ----------------------------------------------------------------------------
def fig_context():
    W, H = 2200, 1330
    img, d = new_canvas(W, H)
    f_title = font(40, bold=True)
    f_box = font(28, bold=True)
    f_lbl = font(24)
    f_num = font(30, bold=True)

    center_text(d, W / 2, 55, "Context Diagram (DFD Level 0)", f_title)

    # central process
    pw, ph = 460, 280
    px, py = W / 2 - pw / 2, 525
    process_box(d, px, py, pw, ph, "0",
                ["ระบบจัดการผลการแข่งขัน", "กีฬาอีสปอร์ต", "งานสัปดาห์วิทยาศาสตร์แห่งชาติ"],
                f_box, f_num)

    ew, eh = 300, 110
    # entity positions
    admin = (140, 200)
    field = (W - 140 - ew, 200)
    monitor = (W - 140 - ew, 1020)
    guest = (140, 1020)

    entity_box(d, *admin, ew, eh, ["ผู้ดูแลระบบ", "(Admin)"], f_box)
    entity_box(d, *field, ew, eh, ["เจ้าหน้าที่สนาม", "(Field Staff)"], f_box)
    entity_box(d, *monitor, ew, eh, ["ผู้ตรวจสอบผล", "(Monitor)"], f_box)
    entity_box(d, *guest, ew, eh, ["ผู้ใช้งานทั่วไป", "(Guest)"], f_box)

    # four horizontal attachment lanes on each side of the process box
    y_a = py + 35            # top lane (in)
    y_b = py + 100           # second lane (out)
    y_c = py + ph - 100      # third lane (out)
    y_d = py + ph - 35       # bottom lane (in)

    # Admin (top-left): in on lane A (label above), out on lane B (label below)
    arrow(d, [(admin[0] + ew / 2 - 60, admin[1] + eh), (admin[0] + ew / 2 - 60, y_a), (px, y_a)],
          "ข้อมูลการแข่งขัน ทีม และสายการแข่งขัน", f_lbl, label_at=0.5, label_dy=-18)
    arrow(d, [(px, y_b), (admin[0] + ew / 2 + 60, y_b), (admin[0] + ew / 2 + 60, admin[1] + eh)],
          "สายการแข่งขันและสถานะการแข่งขัน", f_lbl, label_at=0.45, label_dy=22)

    # Field staff (top-right)
    arrow(d, [(field[0] + ew / 2 + 60, field[1] + eh), (field[0] + ew / 2 + 60, y_a), (px + pw, y_a)],
          "ภาพถ่ายหน้าจอผลพร้อมระบุทีมชนะ", f_lbl, label_at=0.5, label_dy=-18)
    arrow(d, [(px + pw, y_b), (field[0] + ew / 2 - 60, y_b), (field[0] + ew / 2 - 60, field[1] + eh)],
          "รายการคู่แข่งขันและผลการสแกน", f_lbl, label_at=0.55, label_dy=22)

    # Monitor (bottom-right): out on lane C (label above), in on lane D (label below)
    arrow(d, [(px + pw, y_c), (monitor[0] + ew / 2 - 60, y_c), (monitor[0] + ew / 2 - 60, monitor[1])],
          "คะแนน OCR พร้อมภาพหลักฐาน", f_lbl, label_at=0.55, label_dy=-18)
    arrow(d, [(monitor[0] + ew / 2 + 60, monitor[1]), (monitor[0] + ew / 2 + 60, y_d), (px + pw, y_d)],
          "ผลการตรวจสอบ (ยืนยัน/ปฏิเสธ/แก้ไข)", f_lbl, label_at=0.5, label_dy=22)

    # Guest (bottom-left)
    arrow(d, [(px, y_c), (guest[0] + ew / 2 + 60, y_c), (guest[0] + ew / 2 + 60, guest[1])],
          "ผลการแข่งขันที่ยืนยันแล้วและอันดับ", f_lbl, label_at=0.45, label_dy=-18)
    arrow(d, [(guest[0] + ew / 2 - 60, guest[1]), (guest[0] + ew / 2 - 60, y_d), (px, y_d)],
          "คำขอเรียกดูผลการแข่งขัน", f_lbl, label_at=0.5, label_dy=22)

    save(img, "fig_3_2_context.png")


# ----------------------------------------------------------------------------
# Fig 3.3 DFD Level 1
# ----------------------------------------------------------------------------
def fig_dfd1():
    rows = [
        # (entity lines, in-label, out-label|None, process num, process lines, [(D#, store, direction)], extra)
        (["ผู้ดูแลระบบ", "(Admin)"], "ข้อมูลบัญชีผู้ใช้งานและบทบาท", "รายการบัญชีผู้ใช้งาน",
         "1", ["จัดการผู้ใช้งาน", "และสิทธิ์"], [("D1", "ข้อมูลผู้ใช้งาน (users)", "w")]),
        (["ผู้ดูแลระบบ", "(Admin)"], "ข้อมูลการแข่งขันประจำปีและรุ่น", "สถานะการแข่งขันที่เปิดใช้งาน",
         "2", ["จัดการการแข่งขัน", "ประจำปี"], [("D2", "ข้อมูลการแข่งขัน (tournaments)", "w"),
                                                ("D3", "ข้อมูลรุ่นการแข่งขัน (divisions)", "w")]),
        (["ผู้ดูแลระบบ", "(Admin)"], "ข้อมูลโรงเรียน ทีม และผู้เล่น", "ทะเบียนทีมผู้เข้าแข่งขัน",
         "3", ["จัดการทีม", "ผู้เข้าแข่งขัน"], [("D4", "ข้อมูลโรงเรียน (schools)", "w"),
                                                ("D5", "ข้อมูลทีม (teams)", "w"),
                                                ("D6", "ข้อมูลสมาชิกทีม (team_members)", "w")]),
        (["ผู้ดูแลระบบ", "(Admin)"], "กำหนดรอบ รูปแบบ Best of และสุ่มสาย", "สายการแข่งขันที่สร้างแล้ว",
         "4", ["จัดสาย", "การแข่งขัน"], [("D5", "ข้อมูลทีม (teams)", "r"),
                                          ("D7", "ข้อมูลรอบการแข่งขัน (rounds)", "w"),
                                          ("D8", "ข้อมูลคู่แข่งขัน (matches)", "w")]),
        (["เจ้าหน้าที่สนาม", "(Field Staff)"], "ภาพถ่ายหน้าจอผล ทีมชนะ และ ROI", "ผลการสแกนและหลักฐานที่บันทึก",
         "5", ["บันทึกผลการแข่งขัน", "ด้วย OCR"], [("D8", "ข้อมูลคู่แข่งขัน (matches)", "r"),
                                                     ("D9", "ข้อมูลเกมการแข่งขัน (match_games)", "w")]),
        (["ผู้ตรวจสอบผล", "(Monitor)"], "ผลการตรวจสอบ (ยืนยัน/ปฏิเสธ/แก้ไข)", "รายการเกมที่รอตรวจสอบ",
         "6", ["ตรวจสอบและ", "ยืนยันผล"], [("D9", "ข้อมูลเกมการแข่งขัน (match_games)", "w"),
                                             ("D8", "ข้อมูลคู่แข่งขัน (matches)", "w")]),
        (["ผู้ใช้งานทั่วไป", "(Guest)"], "คำขอเรียกดูผลการแข่งขัน", "สายการแข่งขัน ผล และสถิติที่ยืนยันแล้ว",
         "7", ["แสดงผลการแข่งขัน", "สาธารณะ"], [("D2", "ข้อมูลการแข่งขัน (tournaments)", "r"),
                                                  ("D5", "ข้อมูลทีม (teams)", "r"),
                                                  ("D8", "ข้อมูลคู่แข่งขัน (matches)", "r"),
                                                  ("D9", "ข้อมูลเกมการแข่งขัน (match_games)", "r")]),
    ]

    row_h = 300
    W, H = 2200, 120 + row_h * len(rows) + 40
    img, d = new_canvas(W, H)
    f_title = font(40, bold=True)
    f_box = font(26, bold=True)
    f_lbl = font(23)
    f_num = font(28, bold=True)
    f_store = font(23)

    center_text(d, W / 2, 55, "Data Flow Diagram Level 1", f_title)

    ew, eh = 300, 100
    pw, ph = 360, 150
    ex = 80
    px = 980
    sx = 1580
    sw, sh = 540, 52

    for i, (ent, in_lbl, out_lbl, num, pname, stores) in enumerate(rows):
        top = 130 + i * row_h
        ecy = top + row_h / 2 - eh / 2
        pcy = top + row_h / 2 - ph / 2
        entity_box(d, ex, ecy, ew, eh, ent, f_box)
        process_box(d, px, pcy, pw, ph, num, pname, f_box, f_num)

        # entity -> process arrow (upper), process -> entity (lower)
        y_in = top + row_h / 2 - 28
        y_out = top + row_h / 2 + 28
        arrow(d, [(ex + ew, y_in), (px, y_in)], in_lbl, f_lbl, label_dy=-16)
        if out_lbl:
            arrow(d, [(px, y_out), (ex + ew, y_out)], out_lbl, f_lbl, label_dy=18)

        # data stores stacked on the right; writes and reads use separate
        # trunks so no line ends up double-headed
        n = len(stores)
        total = n * sh + (n - 1) * 26
        sy = top + row_h / 2 - total / 2
        has_read = any(m == "r" for _, _, m in stores)
        y_write = pcy + (ph * 0.35 if has_read else ph * 0.5)
        y_read = pcy + ph * 0.72
        for j, (dn, name, mode) in enumerate(stores):
            yy = sy + j * (sh + 26)
            datastore(d, sx, yy, sw, sh, dn, name, f_store)
            ay = yy + sh / 2
            if mode == "w":
                if abs(ay - y_write) > 4:
                    arrow(d, [(px + pw, y_write), (sx - 46, y_write), (sx - 46, ay), (sx, ay)])
                else:
                    arrow(d, [(px + pw, ay), (sx, ay)])
            else:  # read: store -> process
                if abs(ay - y_read) > 4:
                    arrow(d, [(sx, ay), (sx - 86, ay), (sx - 86, y_read), (px + pw, y_read)])
                else:
                    arrow(d, [(sx, ay), (px + pw, ay)])
    save(img, "fig_3_3_dfd1.png")


# ----------------------------------------------------------------------------
# Fig 3.4-3.10: per-process DFD Level 1 (explodes one top-level FDD process
# into its numbered sub-processes, e.g. 1.1/1.2/1.3, with real data flows
# to/from the D1-D9 stores used by that part of the backend)
# ----------------------------------------------------------------------------
def fig_child_dfd(title, steps, connector_labels, out_name):
    """steps: list of dicts with keys:
        num: "1.1"
        title: list[str]
        entity: list[str] | None   (external entity box for this row)
        in_label: str | None       (entity -> process)
        out_label: str | None      (process -> entity)
        stores: [(dnum, label, mode)]   mode "w" or "r"
    connector_labels: list[str] of length len(steps)-1, one label per
    vertical arrow between consecutive sub-process boxes.
    """
    row_h = 300
    W, H = 2200, 130 + row_h * len(steps) + 60
    img, d = new_canvas(W, H)
    f_title = font(40, bold=True)
    f_box = font(26, bold=True)
    f_lbl = font(23)
    f_num = font(28, bold=True)
    f_store = font(23)
    f_conn = font(22)

    center_text(d, W / 2, 55, title, f_title)

    ew, eh = 300, 100
    pw, ph = 380, 150
    ex = 80
    px = 940
    sx = 1620
    sw, sh = 500, 52

    centers = []
    for i, step in enumerate(steps):
        top = 130 + i * row_h
        pcy = top + row_h / 2 - ph / 2
        centers.append(pcy)
        process_box(d, px, pcy, pw, ph, step["num"], step["title"], f_box, f_num)

        if step.get("entity"):
            ecy = top + row_h / 2 - eh / 2
            entity_box(d, ex, ecy, ew, eh, step["entity"], f_box)
            y_in = top + row_h / 2 - 28
            y_out = top + row_h / 2 + 28
            if step.get("in_label"):
                arrow(d, [(ex + ew, y_in), (px, y_in)], step["in_label"], f_lbl, label_dy=-16)
            if step.get("out_label"):
                arrow(d, [(px, y_out), (ex + ew, y_out)], step["out_label"], f_lbl, label_dy=18)

        stores = step.get("stores") or []
        n = len(stores)
        total = n * sh + (n - 1) * 26
        sy = top + row_h / 2 - total / 2
        has_read = any(m == "r" for _, _, m in stores)
        y_write = pcy + (ph * 0.35 if has_read else ph * 0.5)
        y_read = pcy + ph * 0.72
        for j, (dn, name, mode) in enumerate(stores):
            yy = sy + j * (sh + 26)
            datastore(d, sx, yy, sw, sh, dn, name, f_store)
            ay = yy + sh / 2
            if mode == "w":
                if abs(ay - y_write) > 4:
                    arrow(d, [(px + pw, y_write), (sx - 46, y_write), (sx - 46, ay), (sx, ay)])
                else:
                    arrow(d, [(px + pw, ay), (sx, ay)])
            else:
                if abs(ay - y_read) > 4:
                    arrow(d, [(sx, ay), (sx - 86, ay), (sx - 86, y_read), (px + pw, y_read)])
                else:
                    arrow(d, [(sx, ay), (px + pw, ay)])

    cx = px + pw / 2
    for i in range(len(steps) - 1):
        y1 = centers[i] + ph
        y2 = centers[i + 1]
        arrow(d, [(cx, y1), (cx, y2)], connector_labels[i] if i < len(connector_labels) else None,
              f_conn, label_dy=0, label_dx=170)

    save(img, out_name)


DFD_CHILDREN = [
    (
        "DFD Level 1 กระบวนการที่ 1 จัดการผู้ใช้งานและสิทธิ์",
        [
            dict(num="1.1", title=["เพิ่ม/แก้ไข/", "ปิดใช้งานบัญชี"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="ข้อมูลบัญชีผู้ใช้งานใหม่/ที่แก้ไข", out_label="รายการบัญชีผู้ใช้งาน",
                 stores=[("D1", "ข้อมูลผู้ใช้งาน (users)", "w")]),
            dict(num="1.2", title=["กำหนดบทบาท", "(ADMIN/MONITOR/", "FIELD STAFF)"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="การกำหนด/แก้ไขบทบาทผู้ใช้งาน", out_label=None,
                 stores=[("D1", "ข้อมูลผู้ใช้งาน (users)", "w")]),
            dict(num="1.3", title=["เข้าสู่ระบบ/", "ออกจากระบบ"],
                 entity=["ผู้ใช้งานระบบ", "(Admin/Monitor/", "Field Staff)"],
                 in_label="ชื่อผู้ใช้และรหัสผ่าน", out_label="สิทธิ์เข้าใช้งานตามบทบาท (Session)",
                 stores=[("D1", "ข้อมูลผู้ใช้งาน (users)", "r")]),
        ],
        ["ข้อมูลบัญชีที่บันทึกแล้ว", "บทบาทที่กำหนดแล้ว"],
        "fig_3_4_dfd_p1.png",
    ),
    (
        "DFD Level 1 กระบวนการที่ 2 จัดการการแข่งขันประจำปี",
        [
            dict(num="2.1", title=["สร้างการแข่งขัน", "ตามปี พ.ศ."],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="ชื่อและปี พ.ศ. ของการแข่งขัน", out_label=None,
                 stores=[("D2", "ข้อมูลการแข่งขัน (tournaments)", "w")]),
            dict(num="2.2", title=["เปิดใช้งาน", "การแข่งขัน"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="คำสั่งเปิดใช้งานการแข่งขัน", out_label="สถานะการแข่งขันที่เปิดใช้งาน",
                 stores=[("D2", "ข้อมูลการแข่งขัน (tournaments)", "w")]),
            dict(num="2.3", title=["กำหนดรุ่น", "มัธยมต้น/มัธยมปลาย"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label=None, out_label="รุ่นการแข่งขันเริ่มต้น (Junior/Senior)",
                 stores=[("D3", "ข้อมูลรุ่นการแข่งขัน (divisions)", "w")]),
        ],
        ["การแข่งขันที่สร้างแล้ว", "การแข่งขันที่เปิดใช้งานแล้ว"],
        "fig_3_5_dfd_p2.png",
    ),
    (
        "DFD Level 1 กระบวนการที่ 3 จัดการทีมผู้เข้าแข่งขัน",
        [
            dict(num="3.1", title=["จัดการข้อมูล", "โรงเรียน"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="ชื่อโรงเรียน", out_label="รายชื่อโรงเรียน",
                 stores=[("D4", "ข้อมูลโรงเรียน (schools)", "w")]),
            dict(num="3.2", title=["ลงทะเบียน/แก้ไข/", "ลบทีม"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="ข้อมูลทีมและโรงเรียนต้นสังกัด", out_label="ทะเบียนทีมผู้เข้าแข่งขัน",
                 stores=[("D4", "ข้อมูลโรงเรียน (schools)", "r"),
                         ("D5", "ข้อมูลทีม (teams)", "w")]),
            dict(num="3.3", title=["บันทึกรายชื่อ", "ผู้เล่น (5 คน/ทีม)"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="รายชื่อผู้เล่นในทีม", out_label="รายชื่อผู้เล่นที่บันทึกแล้ว",
                 stores=[("D6", "ข้อมูลสมาชิกทีม (team_members)", "w")]),
        ],
        ["ข้อมูลโรงเรียนที่มีอยู่แล้ว", "ทีมที่ลงทะเบียนแล้ว"],
        "fig_3_6_dfd_p3.png",
    ),
    (
        "DFD Level 1 กระบวนการที่ 4 จัดสายการแข่งขัน",
        [
            dict(num="4.1", title=["กำหนดรอบและ", "รูปแบบ Best of"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="จำนวนรอบ ชื่อรอบ และ Best of แต่ละรอบ", out_label=None,
                 stores=[("D7", "ข้อมูลรอบการแข่งขัน (rounds)", "w")]),
            dict(num="4.2", title=["สุ่มจับสายแบบ", "Single Elimination"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="คำสั่งสุ่ม/จัดลำดับทีมเข้าสาย", out_label=None,
                 stores=[("D5", "ข้อมูลทีม (teams)", "r"),
                         ("D8", "ข้อมูลคู่แข่งขัน (matches)", "w")]),
            dict(num="4.3", title=["กำหนดคู่ชิง", "อันดับที่ 3"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="ตัวเลือกเปิดใช้คู่ชิงอันดับ 3", out_label=None,
                 stores=[("D8", "ข้อมูลคู่แข่งขัน (matches)", "w")]),
            dict(num="4.4", title=["รีเซ็ตสาย", "การแข่งขัน"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="คำสั่งรีเซ็ตสายการแข่งขัน", out_label="สายการแข่งขันที่สร้าง/รีเซ็ตแล้ว",
                 stores=[("D7", "ข้อมูลรอบการแข่งขัน (rounds)", "w"),
                         ("D8", "ข้อมูลคู่แข่งขัน (matches)", "w")]),
        ],
        ["รอบที่กำหนดแล้ว", "สายการแข่งขันที่สุ่มแล้ว", "คู่ชิงอันดับ 3 ที่กำหนดแล้ว"],
        "fig_3_7_dfd_p4.png",
    ),
    (
        "DFD Level 1 กระบวนการที่ 5 บันทึกผลการแข่งขันด้วย OCR",
        [
            dict(num="5.1", title=["ถ่ายภาพ/อัปโหลด", "หน้าจอสรุปผล"],
                 entity=["เจ้าหน้าที่สนาม", "(Field Staff)"],
                 in_label="ภาพถ่ายหน้าจอผลและทีมชนะที่ระบุ", out_label=None,
                 stores=[("D8", "ข้อมูลคู่แข่งขัน (matches)", "r")]),
            dict(num="5.2", title=["กำหนดพื้นที่", "คะแนน (ROI)"],
                 entity=["เจ้าหน้าที่สนาม", "(Field Staff)"],
                 in_label="ตำแหน่งกรอบคะแนนบนภาพ", out_label=None,
                 stores=[]),
            dict(num="5.3", title=["สกัดคะแนน", "ด้วย OCR"],
                 entity=["เจ้าหน้าที่สนาม", "(Field Staff)"],
                 in_label=None, out_label="ผลการสแกนและหลักฐานที่บันทึก",
                 stores=[("D9", "ข้อมูลเกมการแข่งขัน (match_games)", "w")]),
        ],
        ["ภาพที่รอกำหนดพื้นที่คะแนน", "พื้นที่คะแนนที่กำหนดแล้ว"],
        "fig_3_8_dfd_p5.png",
    ),
    (
        "DFD Level 1 กระบวนการที่ 6 ตรวจสอบและยืนยันผล",
        [
            dict(num="6.1", title=["เทียบคะแนน OCR", "กับภาพหลักฐาน"],
                 entity=["ผู้ตรวจสอบผล", "(Monitor)"],
                 in_label=None, out_label="รายการเกมที่รอตรวจสอบ",
                 stores=[("D9", "ข้อมูลเกมการแข่งขัน (match_games)", "r")]),
            dict(num="6.2", title=["ยืนยัน/ปฏิเสธ/", "แก้ไขคะแนน"],
                 entity=["ผู้ตรวจสอบผล", "(Monitor)"],
                 in_label="ผลการตรวจสอบ (ยืนยัน/ปฏิเสธ/แก้ไข)", out_label=None,
                 stores=[("D9", "ข้อมูลเกมการแข่งขัน (match_games)", "w")]),
            dict(num="6.3", title=["เลื่อนทีมชนะ", "เข้ารอบถัดไป"],
                 entity=None, in_label=None, out_label=None,
                 stores=[("D8", "ข้อมูลคู่แข่งขัน (matches)", "w")]),
            dict(num="6.4", title=["ล้างผลรอบถัดไป", "เมื่อผลถูกแก้ไข"],
                 entity=None, in_label=None, out_label=None,
                 stores=[("D9", "ข้อมูลเกมการแข่งขัน (match_games)", "w"),
                         ("D8", "ข้อมูลคู่แข่งขัน (matches)", "w")]),
        ],
        ["ผลเปรียบเทียบคะแนน", "ผลที่ยืนยันแล้ว", "กรณีผลเดิมถูกเปลี่ยนแปลง"],
        "fig_3_9_dfd_p6.png",
    ),
    (
        "DFD Level 1 กระบวนการที่ 7 แสดงผลการแข่งขันสาธารณะ",
        [
            dict(num="7.1", title=["แสดงสาย", "การแข่งขันสด"],
                 entity=["ผู้ใช้งานทั่วไป", "(Guest)"],
                 in_label="คำขอเรียกดูสายการแข่งขัน", out_label="สายการแข่งขันปัจจุบัน",
                 stores=[("D8", "ข้อมูลคู่แข่งขัน (matches)", "r")]),
            dict(num="7.2", title=["แสดงผลคะแนน", "ที่ยืนยันแล้ว"],
                 entity=["ผู้ใช้งานทั่วไป", "(Guest)"],
                 in_label="คำขอเรียกดูผลคะแนน", out_label="ผลคะแนนที่ยืนยันแล้ว",
                 stores=[("D9", "ข้อมูลเกมการแข่งขัน (match_games)", "r")]),
            dict(num="7.3", title=["เรียกดูผลย้อนหลัง", "รายปี"],
                 entity=["ผู้ใช้งานทั่วไป", "(Guest)"],
                 in_label="ปีการแข่งขันที่ต้องการ", out_label="ผลการแข่งขันย้อนหลัง",
                 stores=[("D2", "ข้อมูลการแข่งขัน (tournaments)", "r")]),
            dict(num="7.4", title=["สรุปสถิติภาพรวม", "(Dashboard)"],
                 entity=["ผู้ดูแลระบบ", "(Admin)"],
                 in_label="คำขอเรียกดูสถิติภาพรวม", out_label="สถิติภาพรวมของระบบ",
                 stores=[("D5", "ข้อมูลทีม (teams)", "r")]),
        ],
        ["สายการแข่งขันที่แสดงแล้ว", "ผลคะแนนที่แสดงแล้ว", "ผลย้อนหลังที่เรียกดูแล้ว"],
        "fig_3_10_dfd_p7.png",
    ),
]


def fig_all_children():
    for title, steps, conns, out_name in DFD_CHILDREN:
        fig_child_dfd(title, steps, conns, out_name)


# ----------------------------------------------------------------------------
# Fig 3.4 ER Diagram
# ----------------------------------------------------------------------------
ENTITIES = {
    "tournaments": ["PK  id", "     name", "     year", "     is_active", "     created_at"],
    "divisions": ["PK  id", "FK  tournament_id", "     level", "     max_teams", "     default_best_of"],
    "rounds": ["PK  id", "FK  division_id", "     round_number", "     round_name", "     best_of"],
    "matches": ["PK  id", "FK  round_id", "     match_number", "FK  next_match_id", "     status", "     scheduled_time"],
    "schools": ["PK  id", "     name"],
    "teams": ["PK  id", "FK  division_id", "FK  school_id", "     team_number"],
    "team_members": ["PK  id", "FK  team_id", "     full_name", "     in_game_name"],
    "users": ["PK  id", "     username", "     password_hash", "     role", "     is_active", "     created_at"],
    "match_games": ["PK  id", "FK  match_id", "FK  team1_id", "FK  team2_id", "     game_number",
                     "FK  winner_team_id", "     kill_team1", "     kill_team2", "     image_path",
                     "FK  uploaded_by_id", "     uploaded_at", "     ocr_kill_team1", "     ocr_kill_team2",
                     "     raw_ocr_json", "     ocr_status", "FK  verified_by_id", "     verified_at",
                     "     reject_reason"],
}


def er_entity(d, x, y, w, name, attrs, f_head, f_attr):
    head_h = 46
    line_h = 30
    h = head_h + line_h * len(attrs) + 12
    d.rectangle([x, y, x + w, y + head_h], outline=BLACK, width=LINE_W, fill=(235, 235, 235))
    d.rectangle([x, y, x + w, y + h], outline=BLACK, width=LINE_W)
    center_text(d, x + w / 2, y + head_h / 2, name, f_head)
    yy = y + head_h + 6
    for a in attrs:
        d.text((x + 12, yy), a, font=f_attr, fill=BLACK)
        yy += line_h
    return h


def rel(d, p1, p2, lbl, f, m1="1", m2="M", label_dy=-18, label_at=0.5, label_dx=0, elbow=None):
    pts = [p1, p2] if elbow is None else [p1] + elbow + [p2]
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=BLACK, width=LINE_W)

    # cardinality labels: step along the segment, then offset perpendicular
    # to it so the text never sits on the line
    def near(a, b, dist=30, perp=20):
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        x = a[0] + dist * math.cos(ang)
        y = a[1] + dist * math.sin(ang)
        return x + perp * math.cos(ang - math.pi / 2), y + perp * math.sin(ang - math.pi / 2)

    for m, a, b in ((m1, pts[0], pts[1]), (m2, pts[-1], pts[-2])):
        w, h = text_size(d, m, f)
        x, y = near(a, b)
        d.text((x - w / 2, y - h / 2), m, font=f, fill=BLACK)
    if lbl:
        seg = max(range(len(pts) - 1), key=lambda i: (pts[i + 1][0] - pts[i][0]) ** 2 + (pts[i + 1][1] - pts[i][1]) ** 2)
        (ax, ay), (bx, by) = pts[seg], pts[seg + 1]
        lx = ax + (bx - ax) * label_at + label_dx
        ly = ay + (by - ay) * label_at + label_dy
        w, h = text_size(d, lbl, f)
        d.text((lx - w / 2, ly - h / 2), lbl, font=f, fill=BLACK)


def fig_er():
    W, H = 2600, 1500
    img, d = new_canvas(W, H)
    f_title = font(40, bold=True)
    f_head = font(26, bold=True)
    f_attr = font(22)
    f_rel = font(22)

    center_text(d, W / 2, 55, "ER Diagram", f_title)

    ew = 330
    pos = {
        "tournaments": (70, 160),
        "divisions": (530, 160),
        "rounds": (990, 160),
        "matches": (1450, 160),
        "match_games": (2000, 160),
        "schools": (70, 700),
        "teams": (530, 640),
        "team_members": (530, 1030),
        "users": (1450, 1000),
    }
    heights = {}
    for name, (x, y) in pos.items():
        heights[name] = er_entity(d, x, y, ew, name, ENTITIES[name], f_head, f_attr)

    def edge_pt(name, side, frac=0.5):
        x, y = pos[name]
        h = heights[name]
        if side == "r":
            return (x + ew, y + h * frac)
        if side == "l":
            return (x, y + h * frac)
        if side == "b":
            return (x + ew * frac, y + h)
        if side == "t":
            return (x + ew * frac, y)

    rel(d, edge_pt("tournaments", "r", 0.3), edge_pt("divisions", "l", 0.3), "มี", f_rel)
    rel(d, edge_pt("divisions", "r", 0.3), edge_pt("rounds", "l", 0.3), "ประกอบด้วย", f_rel, label_dy=-42)
    rel(d, edge_pt("rounds", "r", 0.3), edge_pt("matches", "l", 0.3), "มี", f_rel)
    rel(d, edge_pt("matches", "r", 0.3), edge_pt("match_games", "l", 0.15), "ประกอบด้วย", f_rel, label_dy=-42)
    rel(d, edge_pt("divisions", "b", 0.5), edge_pt("teams", "t", 0.5), "มีทีม", f_rel, label_dy=0, label_dx=64, label_at=0.4)
    rel(d, edge_pt("schools", "r", 0.5), edge_pt("teams", "l", 0.5), "ส่งทีม", f_rel, label_dy=-42)
    rel(d, edge_pt("teams", "b", 0.5), edge_pt("team_members", "t", 0.5), "มีสมาชิก", f_rel, label_dy=0, label_dx=84, label_at=0.4)
    rel(d, edge_pt("teams", "r", 0.5), edge_pt("match_games", "b", 0.25), "แข่งขันใน (team1/team2/ผู้ชนะ)", f_rel,
        elbow=[(1240, pos["teams"][1] + heights["teams"] * 0.5), (1240, 1420), (pos["match_games"][0] + ew * 0.25, 1420)],
        label_at=0.5, label_dy=-18)
    rel(d, edge_pt("users", "r", 0.5), edge_pt("match_games", "b", 0.6), "อัปโหลด/ยืนยัน", f_rel,
        elbow=[(pos["match_games"][0] + ew * 0.6, pos["users"][1] + heights["users"] * 0.5)])
    # matches self reference next_match
    mx, my = pos["matches"]
    mh = heights["matches"]
    d.line([mx + ew * 0.5, my + mh, mx + ew * 0.5, my + mh + 46], fill=BLACK, width=LINE_W)
    d.line([mx + ew * 0.5, my + mh + 46, mx + ew * 0.9, my + mh + 46], fill=BLACK, width=LINE_W)
    d.line([mx + ew * 0.9, my + mh + 46, mx + ew * 0.9, my + mh], fill=BLACK, width=LINE_W)
    arrow_head(d, mx + ew * 0.9, my + mh, math.radians(-90))
    d.text((mx + ew * 0.5 + 14, my + mh + 52), "เลื่อนสู่คู่ถัดไป (next_match)", font=f_rel, fill=BLACK)

    save(img, "fig_3_4_er.png")


if __name__ == "__main__":
    import sys

    fig_decomposition()
    fig_context()
    fig_dfd1()
    fig_all_children()
    # fig_3_4_er.png is normally exported by hand from
    # ref/_docx/erdiagram_fixed.drawio (the ER source of truth) — only
    # regenerate the Pillow fallback when explicitly asked
    if "--er" in sys.argv:
        fig_er()
