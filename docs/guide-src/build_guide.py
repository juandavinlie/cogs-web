"""Builds the Church of God Singapore website guide (A4 PDF)."""
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, CondPageBreak, Flowable, Frame, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

HERE = Path(__file__).parent
IMG = HERE / "img"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "guide.pdf"
SITE = "https://cogs-web.vercel.app"
QR = HERE.parent / "qr"

# ── Fonts & colours (match the website) ───────────────────────────────────────
FONTS = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("Serif", FONTS / "Georgia.ttf"))
pdfmetrics.registerFont(TTFont("Serif-Bold", FONTS / "Georgia Bold.ttf"))
pdfmetrics.registerFont(TTFont("Sans", FONTS / "Arial.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Bold", FONTS / "Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Italic", FONTS / "Arial Italic.ttf"))
pdfmetrics.registerFont(TTFont("Sym", FONTS / "Arial Unicode.ttf"))
pdfmetrics.registerFontFamily("Sans", normal="Sans", bold="Sans-Bold", italic="Sans-Italic", boldItalic="Sans-Bold")

BRAND = colors.HexColor("#234e52")
BRAND_DARK = colors.HexColor("#1a3b3e")
BRAND_SOFT = colors.HexColor("#e6efee")
ACCENT = colors.HexColor("#b7791f")
ACCENT_SOFT = colors.HexColor("#fbf3e6")
INK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#6b7280")
LINE = colors.HexColor("#e7e1d7")
PAPER = colors.HexColor("#faf7f2")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# ── Text styles ───────────────────────────────────────────────────────────────
body = ParagraphStyle("body", fontName="Sans", fontSize=10.5, leading=15, textColor=INK, spaceAfter=5)
small = ParagraphStyle("small", parent=body, fontSize=9, leading=13, textColor=MUTED, spaceAfter=0)
h1 = ParagraphStyle("h1", fontName="Serif-Bold", fontSize=20, leading=25, textColor=INK, spaceBefore=4, spaceAfter=8)
h2 = ParagraphStyle("h2", fontName="Serif-Bold", fontSize=14.5, leading=19, textColor=BRAND, spaceBefore=10, spaceAfter=6)
h3 = ParagraphStyle("h3", fontName="Sans-Bold", fontSize=10.5, leading=14, textColor=INK, spaceBefore=6, spaceAfter=3)
bullet = ParagraphStyle("bullet", parent=body, leftIndent=12, bulletIndent=0, spaceAfter=3)
cell = ParagraphStyle("cell", parent=body, fontSize=9.5, leading=13, spaceAfter=0)
cell_b = ParagraphStyle("cell_b", parent=cell, fontName="Sans-Bold")
cell_head = ParagraphStyle("cell_head", parent=cell, fontName="Sans-Bold", textColor=colors.white)
caption = ParagraphStyle("caption", parent=small, alignment=TA_CENTER, fontSize=8.5, spaceBefore=3)


def P(text, style=body):
    return Paragraph(text, style)


def bullets(items, style=bullet):
    return [Paragraph(t, style, bulletText="•") for t in items]


def b(text):
    """Bold UI label, e.g. a button name."""
    return f"<b>{text}</b>"


def link(text):
    return f'<font name="Sans-Bold" color="#234e52">{text}</font>'


def sym(ch, color="#234e52"):
    return f'<font name="Sym" color="{color}">{ch}</font>'


# ── Custom flowables ──────────────────────────────────────────────────────────
class Screenshot(Flowable):
    """Phone screenshot with rounded corners, a thin border and an optional caption."""

    def __init__(self, name, width, caption_text=None, radius=4 * mm):
        super().__init__()
        from PIL import Image as PILImage

        self.path = str(IMG / f"{name}.png")
        w, h = PILImage.open(self.path).size
        self.img_w = width
        self.img_h = width * h / w
        self.radius = radius
        self.caption = Paragraph(caption_text, caption) if caption_text else None
        self.cap_h = 0

    def wrap(self, aw, ah):
        if self.caption:
            _, self.cap_h = self.caption.wrap(self.img_w, ah)
            self.cap_h += 4
        return self.img_w, self.img_h + self.cap_h

    def draw(self):
        c = self.canv
        y = self.cap_h
        c.saveState()
        p = c.beginPath()
        p.roundRect(0, y, self.img_w, self.img_h, self.radius)
        c.clipPath(p, stroke=0)
        c.drawImage(self.path, 0, y, self.img_w, self.img_h)
        c.restoreState()
        c.setStrokeColor(LINE)
        c.setLineWidth(1)
        c.roundRect(0, y, self.img_w, self.img_h, self.radius, stroke=1, fill=0)
        if self.caption:
            self.caption.drawOn(c, 0, 0)


class NumberBadge(Flowable):
    def __init__(self, n, size=6.5 * mm, fill=BRAND):
        super().__init__()
        self.n, self.size, self.fill = str(n), size, fill

    def wrap(self, aw, ah):
        return self.size, self.size

    def draw(self):
        c, r = self.canv, self.size / 2
        c.setFillColor(self.fill)
        c.circle(r, r, r, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Sans-Bold", 10)
        c.drawCentredString(r, r - 3.5, self.n)


class PartBanner(Flowable):
    """Full-width coloured band that opens Part 1 / Part 2."""

    def __init__(self, kicker, title, subtitle, fill=BRAND):
        super().__init__()
        self.kicker, self.title, self.subtitle, self.fill = kicker, title, subtitle, fill
        self.h = 34 * mm

    def wrap(self, aw, ah):
        self.w = aw
        return aw, self.h

    def draw(self):
        c = self.canv
        c.setFillColor(self.fill)
        c.roundRect(0, 0, self.w, self.h, 4 * mm, stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#f3d9a8"))
        c.setFont("Sans-Bold", 9)
        c.drawString(8 * mm, self.h - 10 * mm, self.kicker.upper())
        c.setFillColor(colors.white)
        c.setFont("Serif-Bold", 22)
        c.drawString(8 * mm, self.h - 19.5 * mm, self.title)
        c.setFont("Sans", 10.5)
        c.setFillColor(colors.HexColor("#d7e5e3"))
        c.drawString(8 * mm, self.h - 27 * mm, self.subtitle)


def steps(items, num_fill=BRAND):
    """Numbered steps: [(title_or_None, text), ...]"""
    rows = []
    for i, text in enumerate(items, 1):
        rows.append([NumberBadge(i, fill=num_fill), P(text, ParagraphStyle("st", parent=body, spaceAfter=0))])
    t = Table(rows, colWidths=[10 * mm, None])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (1, 0), (1, -1), 1.5),
    ]))
    return t


def callout(title, lines, fill=BRAND_SOFT, edge=BRAND, width=None):
    content = [P(f"<b>{title}</b>", ParagraphStyle("ct", parent=body, textColor=edge, spaceAfter=3))]
    content += bullets(lines, ParagraphStyle("cb", parent=bullet, fontSize=9.5, leading=13.5, spaceAfter=2))
    t = Table([[content]], colWidths=[width or CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("LINEBEFORE", (0, 0), (0, -1), 3, edge),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def side_by_side(left, right, left_w, gap=8 * mm):
    """Two columns of flowables (e.g. text + screenshot)."""
    t = Table([[left, right]], colWidths=[left_w, CONTENT_W - left_w])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (0, -1), gap),
        ("RIGHTPADDING", (1, 0), (1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def data_table(header, rows, col_widths, zebra=True, bold_first_col=True):
    data = [[P(h, cell_head) for h in header]]
    for r in rows:
        data.append([P(v, cell_b if (i == 0 and bold_first_col) else cell) for i, v in enumerate(r)])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, LINE),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
    ]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), PAPER))
    t.setStyle(TableStyle(style))
    return t


class FlowStrip(Flowable):
    """Scan → Log in → Choose event → Done, as four connected boxes."""

    STEPS = [
        ("Scan", "the QR code at\nyour location"),
        ("Log in", "if asked\n(first time only)"),
        ("Choose", "your event, then\ntap I'm here"),
        ("Done!", "Attendance\nrecorded"),
    ]

    def wrap(self, aw, ah):
        self.w = aw
        return aw, 25 * mm

    def draw(self):
        c = self.canv
        n, gap = len(self.STEPS), 6 * mm
        bw = (self.w - gap * (n - 1)) / n
        bh = 25 * mm
        for i, (title, text) in enumerate(self.STEPS):
            x = i * (bw + gap)
            last = i == n - 1
            c.setFillColor(BRAND if last else BRAND_SOFT)
            c.roundRect(x, 0, bw, bh, 3 * mm, stroke=0, fill=1)
            c.setFillColor(colors.white if last else BRAND)
            c.setFont("Serif-Bold", 13)
            c.drawCentredString(x + bw / 2, bh - 9 * mm, title)
            c.setFont("Sans", 8.5)
            c.setFillColor(colors.HexColor("#d7e5e3") if last else INK)
            for j, line in enumerate(text.split("\n")):
                c.drawCentredString(x + bw / 2, bh - 15 * mm - j * 4 * mm, line)
            if not last:
                c.setFillColor(ACCENT)
                ax, ay = x + bw + 1.2 * mm, bh / 2
                p = c.beginPath()
                p.moveTo(ax, ay + 2 * mm)
                p.lineTo(ax + 3.6 * mm, ay)
                p.lineTo(ax, ay - 2 * mm)
                p.close()
                c.drawPath(p, stroke=0, fill=1)


# ── Page decoration ───────────────────────────────────────────────────────────
def cover_page(c, doc):
    c.saveState()
    band_h = 78 * mm
    c.setFillColor(BRAND)
    c.rect(0, PAGE_H - band_h, PAGE_W, band_h, stroke=0, fill=1)
    c.setFillColor(BRAND_DARK)
    c.rect(0, PAGE_H - band_h, PAGE_W, 3 * mm, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#f3d9a8"))
    c.setFont("Sans-Bold", 10)
    c.drawString(MARGIN, PAGE_H - 26 * mm, "CHURCH OF GOD SINGAPORE")
    c.setFillColor(colors.white)
    c.setFont("Serif-Bold", 34)
    c.drawString(MARGIN, PAGE_H - 42 * mm, "Website Guide")
    c.setFont("Sans", 12)
    c.setFillColor(colors.HexColor("#d7e5e3"))
    c.drawString(MARGIN, PAGE_H - 52 * mm, "How to use the church website, for members and admins.")
    c.restoreState()
    footer(c, doc)


def footer(c, doc):
    c.saveState()
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(MARGIN, 13 * mm, PAGE_W - MARGIN, 13 * mm)
    c.setFont("Sans", 8)
    c.setFillColor(MUTED)
    c.drawString(MARGIN, 9 * mm, "Church of God Singapore · Website Guide")
    c.drawRightString(PAGE_W - MARGIN, 9 * mm, f"Page {doc.page}")
    c.restoreState()


# ── Content ───────────────────────────────────────────────────────────────────
story = []

# Cover page body (below the band)
story.append(Spacer(1, 66 * mm))
story.append(P("What's inside", h2))


def toc_card(part, title, desc, items, _fill, edge):
    content = [
        P(part.upper(), ParagraphStyle("k", parent=small, fontName="Sans-Bold", textColor=edge, spaceAfter=2)),
        P(title, ParagraphStyle("t", parent=h2, spaceBefore=0, spaceAfter=3, textColor=INK)),
        P(desc, ParagraphStyle("d", parent=small, spaceAfter=6)),
    ] + bullets(items, ParagraphStyle("tb", parent=bullet, fontSize=9.5, leading=13.5, spaceAfter=1.5))
    return content


card_w = (CONTENT_W - 6 * mm) / 2
cards = Table([[
    toc_card("Part 1", "For members", "Everyone, with or without an account.",
             ["What's on the website", "Creating your account", "Taking attendance with a QR code"], BRAND_SOFT, BRAND),
    "",
    toc_card("Part 2", "For admins", "Church staff and volunteers who manage the site.",
             ["Managing events", "Attendance records and members", "Managing announcements",
              "Attendance links and QR codes", "Which events appear for check-in"], ACCENT_SOFT, ACCENT),
]], colWidths=[card_w, 6 * mm, card_w])
cards.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 0), (0, 0), BRAND_SOFT),
    ("BACKGROUND", (2, 0), (2, 0), ACCENT_SOFT),
    ("LINEABOVE", (0, 0), (0, 0), 3, BRAND),
    ("LINEABOVE", (2, 0), (2, 0), 3, ACCENT),
    ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ("LEFTPADDING", (1, 0), (1, 0), 0),
    ("RIGHTPADDING", (1, 0), (1, 0), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 11),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
]))
story.append(cards)
story.append(Spacer(1, 10 * mm))
story.append(callout("Good to know", [
    "The website works on any phone, tablet or computer. No app to install.",
    "All dates and times on the website are in Singapore time.",
    f"The website address is {link(SITE.removeprefix('https://'))}.",
]))

story.append(NextPageTemplate("normal"))
story.append(PageBreak())

# ── PART 1 — MEMBERS ──────────────────────────────────────────────────────────
story.append(PartBanner("Part 1", "For members", "Seeing what's on, creating your account, and taking attendance."))
story.append(Spacer(1, 6 * mm))

story.append(P("1. What's on the website", h2))
left = [
    P("Anyone can open the website. You don't need an account to see what's happening."),
    P("Announcements", h3),
    P(f"Upcoming church news. If there's a {b('Register')} button, tap it to sign up. "
      "It disappears after the registration deadline."),
    P("Upcoming events", h3),
    P("Everything happening in the next two weeks, grouped by day, with the time and location of each event."),
    P("Find us", h3),
    P("Our address, with a link that opens Google Maps."),
    Spacer(1, 4 * mm),
    Screenshot("home_events", 62 * mm, "Upcoming events, grouped by day"),
]
story.append(side_by_side(left, [Screenshot("home", 72 * mm, "The home page")], CONTENT_W - 72 * mm))

story.append(PageBreak())
story.append(P("2. Create your account", h2))
story.append(P("You only need to do this once. You need an account to take attendance.", small))
story.append(Spacer(1, 4 * mm))
left = [
    steps([
        f"Tap {b('Log in')} at the top right, then {b('Create account')}.",
        f"Enter your {b('full name')}, {b('email')}, {b('location')} (your usual congregation) "
        f"and a {b('password')} of at least 8 characters.",
        f"Check your email and tap the {b('verification link')}.",
        f"Log in with your email and password. You're all set!",
    ]),
    Spacer(1, 3 * mm),
    callout("If something goes wrong", [
        "<b>No email?</b> Check your spam folder. You can also ask for a new link on the "
        "<i>Check your email</i> page.",
        "<b>“Link expired or already used”?</b> Each email link works only once. "
        "If you already tapped it, just log in.",
        f"<b>Forgot your password?</b> On the Log in page, tap {b('Forgot password?')} "
        "and we'll email you a link to set a new one.",
    ], width=CONTENT_W - 50 * mm - 8 * mm),
]
story.append(side_by_side(left, [Screenshot("signup", 50 * mm, "The sign-up form")], CONTENT_W - 50 * mm))

story.append(Spacer(1, 4 * mm))
story.append(P("3. Taking attendance", h2))
story.append(P("Each location has its own QR code, usually placed near the entrance. Scanning it takes you "
               "straight to that location's check-in page."))
story.append(Spacer(1, 3 * mm))
story.append(FlowStrip())
story.append(Spacer(1, 7 * mm))
story.append(steps([
    "Open your phone's camera and point it at the QR code. Tap the link that appears.",
    f"If you're asked to, log in. <i>First time?</i> Tap {b('Create account')}. Your location is filled in for you.",
    f"Choose the event you're attending and tap {b('I’m here')}.",
    f"You'll see {b('Attendance recorded')}. That's it!",
]))
story.append(Spacer(1, 3 * mm))
story.append(callout("Good to know", [
    "You can check in from <b>30 minutes before</b> an event starts until it <b>ends</b>.",
    "Only events that take attendance are listed. <b>Combined</b> events appear at every location.",
    "You can check in once per event. Scanning again shows <i>“You're already checked in”</i>.",
    "<i>“No events open for check-in right now”</i> means it's too early, the event has ended, "
    "or the event doesn't take attendance.",
]))

story.append(PageBreak())

# ── PART 2 — ADMINS ───────────────────────────────────────────────────────────
story.append(PartBanner("Part 2", "For admins", "Managing events, announcements, members, and attendance.", fill=BRAND_DARK))
story.append(Spacer(1, 6 * mm))

story.append(P("Getting started", h2))
story.append(P("Admin access is given by the website manager. You can't make yourself an admin from the website. "
               f"Once you're an admin, an {link('Admin')} link appears at the top of every page. It opens four tabs:"))
story.append(Spacer(1, 2 * mm))
story.append(data_table(
    ["Tab", "What it's for"],
    [
        ["Events", "See, add and delete events, and see how many checked in."],
        ["Announcements", "See, add and delete announcements on the home page."],
        ["Members", "Look up everyone who has an account."],
        ["Attendance", "See every check-in, filtered by location or event."],
    ],
    [38 * mm, CONTENT_W - 38 * mm],
))

story.append(Spacer(1, 4 * mm))
story.append(P("1. Managing events", h2))
left = [
    P("The events list", h3),
    *bullets([
        "Starts from <b>today</b>. Use the filters to pick a location or date range. "
        f"{b('All')} shows every event.",
        "<b>Greyed-out</b> events have already ended.",
        "Events that take attendance show an <b>Attendance</b> tag and how many people <b>checked in</b>.",
        f"{b('Delete')} removes an event. <b>Careful:</b> this also deletes its attendance records.",
    ]),
]
story.append(side_by_side(left, [Screenshot("admin_events", 50 * mm, "Events list")], CONTENT_W - 50 * mm))

story.append(CondPageBreak(120 * mm))
story.append(Spacer(1, 4 * mm))
left = [
    P("Adding an event", h3),
    P(f"Tap {b('+ Add event')} and fill in:"),
    *bullets([
        "<b>Name</b>, for example Sunday Worship.",
        "<b>Location</b>: Redhill English or Combined. Combined events appear for every location.",
        "<b>Date</b>, <b>start time</b> and <b>end time</b>, in Singapore time. Start and end must be on the same day.",
        "<b>Description</b> (optional).",
        "<b>Requires attendance</b>: tick this for services and meetings where members check in.",
    ]),
    Spacer(1, 3 * mm),
    callout("Tip: changing an event", [
        "Events can't be edited on the website yet. Delete the event and add it again, ideally before "
        "anyone checks in, or ask the website manager to change it.",
    ], fill=ACCENT_SOFT, edge=ACCENT, width=CONTENT_W - 56 * mm - 8 * mm),
]
story.append(side_by_side(left, [Screenshot("add_event", 56 * mm, "Add event form")], CONTENT_W - 56 * mm))

story.append(Spacer(1, 4 * mm))
story.append(KeepTogether([
    P("2. Attendance records", h2),
    P("Every check-in, newest first. Each row shows the member, the event and the time they checked in. "
      "Use the filters to narrow it down:"),
    data_table(
        ["Filter", "Shows check-ins…"],
        [
            ["Event location", "for events held at that location (e.g. all Combined events)."],
            ["Member's location", "by members who belong to that congregation."],
            ["Event", "for one specific event. Pick it from the list (e.g. last Sunday's worship)."],
        ],
        [40 * mm, CONTENT_W - 40 * mm],
    ),
    Spacer(1, 2 * mm),
    P("<b>Tip:</b> to count attendance for one service, choose it in the <b>Event</b> filter. The total "
      "appears at the bottom (e.g. <i>1–25 of 87</i>). The Events tab also shows a count for each event.", small),
]))

story.append(Spacer(1, 4 * mm))
story.append(KeepTogether([
    P("3. Members", h2),
    *bullets([
        "Lists everyone with an account: name, email, location and the date they joined. Admins are marked "
        "<b>Admin</b>.",
        "Search by <b>name</b> or <b>email</b> (part of it is enough), or filter by <b>location</b>. "
        "25 people per page.",
    ]),
]))

story.append(PageBreak())
story.append(P("4. Managing announcements", h2))
left = [
    P("What appears on the home page", h3),
    *bullets([
        "Announcements whose <b>date</b> or <b>register-by date</b> is today or later.",
        "The soonest ones come first, up to 6 at a time.",
    ]),
    P("Adding an announcement", h3),
    P(f"Under {link('Announcements')}, tap {b('+ Add announcement')} and fill in:"),
    *bullets([
        "<b>Title</b>, for example Church Camp 2026.",
        "<b>Details</b> (optional): a sentence or two.",
        "<b>Date</b>: the day the announcement is about. It stays on the home page until then.",
        "<b>Registration link</b> (optional): for example a Google Form. This adds a "
        f"{b('Register')} button.",
        "<b>Register by</b> (optional): the Register button is hidden after this date. "
        "It needs a registration link.",
    ]),
    P("The announcements list", h3),
    *bullets([
        "Filter by date. An announcement matches if its date <i>or</i> its register-by date is in the range.",
        f"Registrations past their deadline are marked <i>registration closed</i>. Use {b('Delete')} to remove an announcement.",
    ]),
]
story.append(side_by_side(left, [Screenshot("add_announcement", 60 * mm, "Add announcement form")], CONTENT_W - 60 * mm))

story.append(CondPageBreak(125 * mm))
story.append(Spacer(1, 6 * mm))
story.append(P("5. Attendance links and QR codes", h2))
story.append(P("Each location has its own check-in link. Turn it into a QR code so members can scan it. "
               "The link only shows that location's events (plus Combined events)."))
story.append(Spacer(1, 2 * mm))
story.append(data_table(
    ["Location", "Check-in link"],
    [
        ["Redhill English", f"{SITE}<b>/attendance?location=rhe</b>"],
        ["Combined", f"{SITE}<b>/attendance?location=combined</b>"],
        ["All locations", f"{SITE}<b>/attendance</b>"],
    ],
    [40 * mm, CONTENT_W - 40 * mm],
))
story.append(Spacer(1, 2 * mm))
story.append(P("The part after <b>location=</b> is the location's <b>code</b>. If the code is mistyped, the page "
               "simply shows events from all locations. <b>New location?</b> Ask the website manager. It will get "
               "its own code, link and QR code.", small))
story.append(P("Putting up a QR code", h3))
story.append(steps([
    "Print the <b>Check-in QR codes</b> page at the end of this guide. It has a ready-made code for each location.",
    "Cut out the code for your location and place it where people arrive, such as the entrance or welcome desk.",
    "<b>Test it:</b> scan the printed code with your phone before putting it up.",
]))


story.append(PageBreak())
story.append(P("6. Which events appear for check-in", h2))
story.append(P("When a member scans a QR code, an event appears in their list only if <b>all three</b> are true:"))
story.append(Spacer(1, 1 * mm))
checks = [
    f"{sym('✓')}  <b>Requires attendance</b> is ticked on the event.",
    f"{sym('✓')}  The event is at the <b>QR code's location</b>, or it's a <b>Combined</b> event.",
    f"{sym('✓')}  It's between <b>30 minutes before the start</b> and the <b>end time</b>.",
]
for line in checks:
    story.append(P(line, ParagraphStyle("chk", parent=body, leftIndent=4, spaceAfter=3)))

story.append(Spacer(1, 3 * mm))
story.append(P("Example: a Sunday at Redhill English", h3))
story.append(P("Say these events are set up for one Sunday:", small))
story.append(Spacer(1, 1.5 * mm))
story.append(data_table(
    ["Event", "Location", "Time", "Requires attendance"],
    [
        ["Sunday Worship", "Redhill English", "9:00 – 10:30 am", "Yes"],
        ["Lunch Fellowship", "Combined", "10:45 am – 12:00 pm", "Yes"],
        ["Youth Fellowship", "Redhill English", "3:00 – 5:00 pm", "No"],
    ],
    [42 * mm, 36 * mm, 42 * mm, CONTENT_W - 120 * mm],
))
story.append(Spacer(1, 3 * mm))
story.append(P("Here's what a member sees after scanning the <b>Redhill English</b> QR code:", small))
story.append(Spacer(1, 1.5 * mm))
story.append(data_table(
    ["Scanned at", "Events shown", "Why"],
    [
        ["8:15 am", "<i>None yet</i>", "Sunday Worship opens for check-in at 8:30 am."],
        ["9:30 am", "Sunday Worship", "Worship is on. Lunch doesn't open until 10:15 am."],
        ["10:20 am", "Sunday Worship <b>and</b> Lunch Fellowship",
         "Both are open, so the member picks the one they're attending."],
        ["11:00 am", "Lunch Fellowship", "Worship ended at 10:30 am. Lunch is Combined, so it shows here too."],
        ["3:30 pm", "<i>None</i>", "Youth Fellowship doesn't take attendance."],
    ],
    [24 * mm, 50 * mm, CONTENT_W - 74 * mm],
))
story.append(Spacer(1, 5 * mm))
story.append(callout("A member says their event isn't showing. Check that:", [
    f"{b('Requires attendance')} is ticked on the event.",
    "The event is at the location on their QR code, or it's a Combined event.",
    "The date and times are right (Singapore time).",
    "It isn't more than 30 minutes before the start, or after the end.",
], fill=ACCENT_SOFT, edge=ACCENT))


# ── Printable QR codes ────────────────────────────────────────────────────────
class QRCard(Flowable):
    def __init__(self, image, title, url, size):
        super().__init__()
        self.image, self.title, self.url, self.size = str(image), title, url, size

    def wrap(self, aw, ah):
        self.w = aw
        return aw, self.size + 30 * mm

    def draw(self):
        c, w = self.canv, self.w
        c.setStrokeColor(LINE)
        c.setDash(3, 3)
        c.roundRect(0, 0, w, self.size + 30 * mm, 4 * mm, stroke=1, fill=0)
        c.setDash()
        c.setFillColor(BRAND)
        c.setFont("Serif-Bold", 16)
        c.drawCentredString(w / 2, self.size + 21 * mm, self.title)
        c.drawImage(self.image, (w - self.size) / 2, 11 * mm, self.size, self.size)
        c.setFont("Sans-Bold", 9.5)
        c.setFillColor(INK)
        c.drawCentredString(w / 2, 7 * mm, "Scan to take attendance")
        c.setFont("Sans", 7.5)
        c.setFillColor(MUTED)
        c.drawCentredString(w / 2, 3 * mm, self.url.removeprefix("https://"))


story.append(PageBreak())
story.append(P("Check-in QR codes", h1))
story.append(P("Print this page, cut along the dashed lines, and place each code at its location. "
               "Members scan it with their phone camera to check in.", small))
story.append(Spacer(1, 6 * mm))
half = (CONTENT_W - 8 * mm) / 2
qr_row = Table([[
    QRCard(QR / "checkin-redhill-english.png", "Redhill English", f"{SITE}/attendance?location=rhe", 62 * mm),
    "",
    QRCard(QR / "checkin-combined.png", "Combined", f"{SITE}/attendance?location=combined", 62 * mm),
]], colWidths=[half, 8 * mm, half])
qr_row.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                            ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
story.append(qr_row)
story.append(Spacer(1, 8 * mm))
all_row = Table([["", QRCard(QR / "checkin-all-locations.png", "All locations", f"{SITE}/attendance", 62 * mm), ""]],
                colWidths=[(CONTENT_W - half) / 2, half, (CONTENT_W - half) / 2])
all_row.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                             ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
story.append(all_row)


# ── Build ─────────────────────────────────────────────────────────────────────
frame = Frame(MARGIN, 18 * mm, CONTENT_W, PAGE_H - MARGIN - 18 * mm, id="main", leftPadding=0, rightPadding=0,
              topPadding=0, bottomPadding=0)
doc = BaseDocTemplate(
    str(OUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=18 * mm,
    title="Church of God Singapore – Website Guide", author="Church of God Singapore",
    subject="How to use the church website, for members and admins",
)
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame], onPage=cover_page),
    PageTemplate(id="normal", frames=[frame], onPage=footer),
])
doc.build(story)
print("wrote", OUT)
