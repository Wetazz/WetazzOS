"""Branded PDF generation for WETAZZ OS — quotes, invoices, vehicle release forms.

All documents share one branded layout (logo, workshop/customer/vehicle blocks,
line items, GST totals, standard terms & conditions) so branding never diverges.
"""
import io
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    Image as RLImage, HRFlowable,
)

LOGO_PATH = str(Path(__file__).parent / "assets" / "wetazz-logo-print.png")

GREEN = colors.HexColor("#3F9E12")
INK = colors.HexColor("#141414")
MUTED = colors.HexColor("#6b7280")
LINE = colors.HexColor("#d4d4d8")
LIGHT = colors.HexColor("#f4f4f5")

TITLES = {"QUOTE": "QUOTE", "INVOICE": "TAX INVOICE", "RELEASE": "VEHICLE RELEASE AUTHORISATION"}

DEFAULT_AUTHORISATION = (
    "I, the undersigned, authorise Wetazz Paint Panel & Mechanical to carry out the works described "
    "above and confirm the vehicle details are correct. I acknowledge the workshop's statutory right "
    "to retain the vehicle until all accounts are paid in full, and I accept the vehicle is being "
    "released to me in satisfactory condition."
)


def _money(v):
    try:
        return f"A${float(v or 0):,.2f}"
    except Exception:
        return "A$0.00"


def _fmt_date(iso):
    if not iso:
        return datetime.now().strftime("%d %b %Y")
    try:
        return datetime.fromisoformat(str(iso).replace("Z", "+00:00")).strftime("%d %b %Y")
    except Exception:
        return str(iso)


def _styles():
    ss = getSampleStyleSheet()
    return {
        "biz": ParagraphStyle("biz", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=13, textColor=INK, leading=15),
        "bizsub": ParagraphStyle("bizsub", parent=ss["Normal"], fontSize=8.5, textColor=MUTED, leading=12),
        "label": ParagraphStyle("label", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=7.5, textColor=GREEN, leading=11),
        "body": ParagraphStyle("body", parent=ss["Normal"], fontSize=9, textColor=INK, leading=13),
        "small": ParagraphStyle("small", parent=ss["Normal"], fontSize=7.5, textColor=MUTED, leading=11),
        "cell": ParagraphStyle("cell", parent=ss["Normal"], fontSize=9, textColor=INK, leading=12),
        "cellr": ParagraphStyle("cellr", parent=ss["Normal"], fontSize=9, textColor=INK, leading=12, alignment=TA_RIGHT),
        "th": ParagraphStyle("th", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=8, textColor=colors.white, leading=11),
        "thr": ParagraphStyle("thr", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=8, textColor=colors.white, leading=11, alignment=TA_RIGHT),
        "terms": ParagraphStyle("terms", parent=ss["Normal"], fontSize=7, textColor=MUTED, leading=10),
        "amount": ParagraphStyle("amount", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=11, textColor=INK, alignment=TA_RIGHT),
    }


def _logo(width=78):
    try:
        img = RLImage(LOGO_PATH)
        ratio = img.imageHeight / float(img.imageWidth)
        img.drawWidth = width
        img.drawHeight = width * ratio
        return img
    except Exception:
        return Paragraph("WETAZZ", getSampleStyleSheet()["Title"])


def _header(st, business, kind, doc):
    biz_lines = [Paragraph(business.get("business_name", "Wetazz Paint Panel & Mechanical"), st["biz"])]
    for key in ("address", "phone", "email", "website"):
        v = business.get(key)
        if v:
            biz_lines.append(Paragraph(v, st["bizsub"]))
    if business.get("abn"):
        biz_lines.append(Paragraph(f"ABN {business['abn']}", st["bizsub"]))
    header = Table([[_logo(), biz_lines]], colWidths=[95, None])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return header


def _title_band(st, kind, doc):
    title = TITLES.get(kind, kind)
    meta = []
    num_label = {"QUOTE": "Quote No.", "INVOICE": "Invoice No.", "RELEASE": "Release No."}[kind]
    meta.append(f"{num_label}  {doc.get('number', '—')}")
    meta.append(f"Date  {_fmt_date(doc.get('date'))}")
    if kind == "QUOTE" and doc.get("expiry"):
        meta.append(f"Valid until  {_fmt_date(doc.get('expiry'))}")
    if kind == "INVOICE" and doc.get("due_date"):
        meta.append(f"Due  {_fmt_date(doc.get('due_date'))}")
    left = Paragraph(f'<font color="white"><b>{title}</b></font>',
                     ParagraphStyle("t", fontSize=15, leading=18))
    right = Paragraph("<br/>".join(f'<font color="white" size="8">{m}</font>' for m in meta),
                      ParagraphStyle("m", fontSize=8, leading=12, alignment=TA_RIGHT))
    band = Table([[left, right]], colWidths=[None, 190])
    band.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 12), ("RIGHTPADDING", (1, 0), (1, 0), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return band


def _info_blocks(st, customer, vehicle, location):
    def para(label, lines):
        out = [Paragraph(label, st["label"]), Spacer(1, 3)]
        for ln in lines:
            if ln:
                out.append(Paragraph(str(ln), st["body"]))
        return out

    cust_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or "—"
    cust_lines = [cust_name, customer.get("business_name"), customer.get("phone"),
                  customer.get("email"), customer.get("address")]
    v = vehicle or {}
    veh_top = " ".join(str(x) for x in [v.get("year") or "", v.get("make") or "", v.get("model") or ""] if x).strip() or "—"
    veh_lines = [veh_top]
    if v.get("registration"):
        veh_lines.append(f"Rego: {v['registration']}" + (f" ({v['registration_state']})" if v.get("registration_state") else ""))
    if v.get("vin"):
        veh_lines.append(f"VIN: {v['vin']}")
    extra = " · ".join(str(x) for x in [v.get("colour"), (f"{v.get('odometer')} km" if v.get("odometer") else None)] if x)
    if extra:
        veh_lines.append(extra)

    loc = location or {}
    loc_lines = [loc.get("name"), loc.get("address"),
                 " ".join(str(x) for x in [loc.get("suburb"), loc.get("state"), loc.get("postcode")] if x).strip(),
                 loc.get("phone")]

    tbl = Table([[para("PREPARED FOR", cust_lines), para("VEHICLE", veh_lines), para("WORKSHOP LOCATION", loc_lines)]],
                colWidths=[None, None, None])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, 0), 0), ("RIGHTPADDING", (-1, 0), (-1, 0), 0),
        ("LEFTPADDING", (1, 0), (-1, 0), 14),
    ]))
    return tbl


def _items_table(st, items):
    head = [Paragraph("DESCRIPTION", st["th"]), Paragraph("TYPE", st["th"]),
            Paragraph("QTY", st["thr"]), Paragraph("UNIT", st["thr"]), Paragraph("AMOUNT", st["thr"])]
    data = [head]
    for it in items:
        data.append([
            Paragraph(it.get("description", ""), st["cell"]),
            Paragraph((it.get("kind") or "").title(), st["cell"]),
            Paragraph(f"{float(it.get('quantity', 0) or 0):g}", st["cellr"]),
            Paragraph(_money(it.get("unit_price")), st["cellr"]),
            Paragraph(_money(it.get("total")), st["cellr"]),
        ])
    tbl = Table(data, colWidths=[None, 62, 40, 66, 74], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    for r in range(1, len(data)):
        if r % 2 == 0:
            style.append(("BACKGROUND", (0, r), (-1, r), LIGHT))
    tbl.setStyle(TableStyle(style))
    return tbl


def _totals(st, doc, kind):
    rows = [["Subtotal", _money(doc.get("subtotal"))]]
    if doc.get("discount"):
        rows.append(["Discount", "-" + _money(doc.get("discount"))])
    rows.append(["GST (10%)", _money(doc.get("gst"))])
    rows.append(["TOTAL (incl. GST)", _money(doc.get("total"))])
    if kind == "QUOTE" and doc.get("deposit_required"):
        rows.append(["Deposit required", _money(doc.get("deposit_required"))])
    if kind == "INVOICE":
        rows.append(["Amount paid", _money(doc.get("amount_paid"))])
        rows.append(["BALANCE DUE", _money(doc.get("balance"))])
    body = []
    for i, (lbl, val) in enumerate(rows):
        strong = lbl.startswith("TOTAL") or lbl.startswith("BALANCE")
        body.append([
            Paragraph(lbl, ParagraphStyle("x", fontSize=9, alignment=TA_RIGHT,
                       fontName="Helvetica-Bold" if strong else "Helvetica",
                       textColor=INK if strong else MUTED)),
            Paragraph(val, st["amount"] if strong else st["cellr"]),
        ])
    tbl = Table(body, colWidths=[120, 90])
    tstyle = [("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
              ("RIGHTPADDING", (-1, 0), (-1, -1), 0)]
    for i, (lbl, _v) in enumerate(rows):
        if lbl.startswith("TOTAL") or lbl.startswith("BALANCE"):
            tstyle.append(("LINEABOVE", (0, i), (-1, i), 1, INK))
            tstyle.append(("TOPPADDING", (0, i), (-1, i), 6))
    tbl.setStyle(TableStyle(tstyle))
    wrap = Table([[tbl]], colWidths=[None])
    wrap.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "RIGHT"), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    return wrap


def _signature_block(st):
    def line(label):
        return [Paragraph("&nbsp;", st["body"]),
                Table([[""]], colWidths=[None], style=TableStyle([("LINEABOVE", (0, 0), (-1, -1), 0.7, INK)])),
                Paragraph(label, st["small"])]
    tbl = Table([[line("Customer signature"), "", line("Date")],
                 ["", "", ""],
                 [line("Workshop representative"), "", line("Date")]],
                colWidths=[None, 24, 150])
    tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                             ("TOPPADDING", (0, 0), (-1, -1), 10),
                             ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    return tbl


def generate_pdf(kind, business, customer, vehicle=None, doc=None, location=None, terms=""):
    doc = doc or {}
    st = _styles()
    buf = io.BytesIO()
    pdf = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title=f"{TITLES.get(kind, kind)} {doc.get('number', '')}")
    flow = [_header(st, business, kind, doc), Spacer(1, 10),
            HRFlowable(width="100%", thickness=0.8, color=LINE), Spacer(1, 10),
            _title_band(st, kind, doc), Spacer(1, 14),
            _info_blocks(st, customer, vehicle, location), Spacer(1, 16)]

    if kind in ("QUOTE", "INVOICE"):
        flow += [_items_table(st, doc.get("items", [])), Spacer(1, 12), _totals(st, doc, kind)]
        if doc.get("notes"):
            flow += [Spacer(1, 12), Paragraph("NOTES", st["label"]), Spacer(1, 3), Paragraph(doc["notes"], st["body"])]
    else:  # RELEASE
        if doc.get("work_summary"):
            flow += [Paragraph("WORK CARRIED OUT", st["label"]), Spacer(1, 3),
                     Paragraph(doc["work_summary"], st["body"]), Spacer(1, 10)]
        rel_rows = []
        if doc.get("job_number"):
            rel_rows.append(["Job", doc["job_number"]])
        if doc.get("odometer"):
            rel_rows.append(["Odometer", f"{doc['odometer']} km"])
        if doc.get("amount_due") not in (None, "", 0, 0.0):
            rel_rows.append(["Amount due on collection", _money(doc.get("amount_due"))])
        if rel_rows:
            rt = Table([[Paragraph(a, st["small"]), Paragraph(str(b), st["body"])] for a, b in rel_rows], colWidths=[150, None])
            rt.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
            flow += [rt, Spacer(1, 10)]
        flow += [Paragraph("AUTHORISATION", st["label"]), Spacer(1, 3),
                 Paragraph(doc.get("authorisation_text") or DEFAULT_AUTHORISATION, st["body"]),
                 Spacer(1, 6), _signature_block(st)]

    if terms:
        flow += [Spacer(1, 16), HRFlowable(width="100%", thickness=0.6, color=LINE), Spacer(1, 6),
                 Paragraph("TERMS &amp; CONDITIONS", st["label"]), Spacer(1, 3)]
        for para in str(terms).split("\n"):
            para = para.strip()
            if para:
                flow.append(Paragraph(para.replace("&", "&amp;"), st["terms"]))

    def _footer(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, 10 * mm, business.get("business_name", "Wetazz Paint Panel & Mechanical"))
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm,
                               f"Generated {datetime.now().strftime('%d %b %Y %H:%M')}")
        canvas.restoreState()

    pdf.build(flow, onFirstPage=_footer, onLaterPages=_footer)
    buf.seek(0)
    return buf.read()
