"""
50-Year Annuity Cashflow Model Generator
Produces a fully-formatted Excel workbook with:
  - Inputs & Summary dashboard
  - Annual cashflow schedule (50 years)
  - Sensitivity analysis (rate vs PV)
  - Embedded charts
"""

import math
import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.series import DataPoint


# ── Colour palette ──────────────────────────────────────────────────────────
NAVY      = "1B3A6B"
STEEL     = "2E6DA4"
LIGHT_BLU = "D6E4F0"
TEAL      = "1ABC9C"
ORANGE    = "E67E22"
LIGHT_GRY = "F2F4F5"
MID_GRY   = "BDC3C7"
WHITE     = "FFFFFF"
DARK_TXT  = "1C2833"
RED       = "C0392B"
GREEN     = "27AE60"


def hex_fill(hex_colour):
    return PatternFill("solid", fgColor=hex_colour)


def bold_font(size=10, colour=WHITE, italic=False):
    return Font(name="Calibri", size=size, bold=True,
                color=colour, italic=italic)


def reg_font(size=10, colour=DARK_TXT, bold=False, italic=False):
    return Font(name="Calibri", size=size, color=colour, bold=bold,
                italic=italic)


def thin_border(sides=("left", "right", "top", "bottom")):
    s = Side(style="thin", color=MID_GRY)
    kw = {k: s for k in sides}
    return Border(**kw)


def med_border(sides=("left", "right", "top", "bottom")):
    s = Side(style="medium", color=NAVY)
    kw = {k: s for k in sides}
    return Border(**kw)


def center(ws, cell):
    ws[cell].alignment = Alignment(horizontal="center", vertical="center")


# ── Helper: write a labelled input row ──────────────────────────────────────
def input_row(ws, row, label, value, fmt="general", note=""):
    lbl = ws.cell(row=row, column=2, value=label)
    lbl.font = reg_font(size=10)
    lbl.alignment = Alignment(horizontal="left", vertical="center",
                               indent=1)

    val = ws.cell(row=row, column=4, value=value)
    val.font = reg_font(size=10, bold=True, colour=NAVY)
    val.alignment = Alignment(horizontal="center", vertical="center")
    if fmt == "pct":
        val.number_format = "0.00%"
    elif fmt == "usd":
        val.number_format = '$#,##0.00'
    elif fmt == "int":
        val.number_format = "0"

    if note:
        nt = ws.cell(row=row, column=5, value=note)
        nt.font = reg_font(size=9, colour="7F8C8D", italic=True)
        nt.alignment = Alignment(horizontal="left", vertical="center",
                                  indent=1)

    for col in range(2, 6):
        c = ws.cell(row=row, column=col)
        c.border = thin_border(("bottom",))
        if row % 2 == 0:
            c.fill = hex_fill(LIGHT_GRY)


# ── Helper: write a labelled result/summary row ──────────────────────────────
def result_row(ws, row, label, value, fmt="usd", highlight=False):
    bg = LIGHT_BLU if not highlight else TEAL
    txt_c = DARK_TXT if not highlight else WHITE

    for col in range(7, 11):
        ws.cell(row=row, column=col).fill = hex_fill(bg)

    lbl = ws.cell(row=row, column=7, value=label)
    lbl.font = reg_font(size=10, colour=txt_c, bold=highlight)
    lbl.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    val = ws.cell(row=row, column=10, value=value)
    val.font = reg_font(size=10, colour=txt_c, bold=True)
    val.alignment = Alignment(horizontal="center", vertical="center")
    if fmt == "pct":
        val.number_format = "0.00%"
    elif fmt == "usd":
        val.number_format = '$#,##0.00'
    elif fmt == "int":
        val.number_format = "0"
    elif fmt == "x":
        val.number_format = '0.00"x"'

    for col in range(7, 11):
        ws.cell(row=row, column=col).border = thin_border(("bottom",))


# ── Sheet 1: Dashboard ───────────────────────────────────────────────────────
def build_dashboard(wb, params):
    ws = wb.create_sheet("Dashboard", 0)
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 95

    # Column widths
    col_widths = {1: 2, 2: 28, 3: 3, 4: 18, 5: 22,
                  6: 3, 7: 28, 8: 3, 9: 3, 10: 18, 11: 2}
    for col, w in col_widths.items():
        ws.column_dimensions[get_column_letter(col)].width = w

    # Row heights
    for r in range(1, 60):
        ws.row_dimensions[r].height = 18
    ws.row_dimensions[1].height = 6
    ws.row_dimensions[2].height = 40

    # ── Title bar ──────────────────────────────────────────────────────────
    ws.merge_cells("B2:K2")
    title = ws["B2"]
    title.value = "50-YEAR ANNUITY  |  CASHFLOW MODEL"
    title.font = Font(name="Calibri", size=20, bold=True, color=WHITE)
    title.fill = hex_fill(NAVY)
    title.alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("B3:K3")
    sub = ws["B3"]
    sub.value = (
        f"Model Date: 2026-02-19     "
        f"Annuity Type: {'Annuity-Due (Begin)' if params['annuity_due'] else 'Ordinary Annuity (End)'}"
    )
    sub.font = bold_font(size=10, colour=WHITE)
    sub.fill = hex_fill(STEEL)
    sub.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[3].height = 20

    # ── Section headers ────────────────────────────────────────────────────
    def section_header(ws, row, col_start, col_end, text):
        ws.merge_cells(
            start_row=row, start_column=col_start,
            end_row=row, end_column=col_end
        )
        c = ws.cell(row=row, column=col_start, value=text)
        c.font = bold_font(size=11, colour=WHITE)
        c.fill = hex_fill(STEEL)
        c.alignment = Alignment(horizontal="left", vertical="center",
                                 indent=1)
        ws.row_dimensions[row].height = 22

    section_header(ws, 5, 2, 5, "  INPUT PARAMETERS")
    section_header(ws, 5, 7, 10, "  MODEL SUMMARY")

    # ── Inputs ─────────────────────────────────────────────────────────────
    r = 6
    input_row(ws, r, "Present Value (Loan / Investment)",
              params["pv"], "usd", "Initial lump-sum amount")
    r += 1
    input_row(ws, r, "Annual Interest / Discount Rate",
              params["rate"], "pct", "Nominal, per annum")
    r += 1
    input_row(ws, r, "Payment Frequency (per year)",
              params["freq"], "int",
              "1=Annual  4=Quarterly  12=Monthly")
    r += 1
    input_row(ws, r, "Term (years)",
              params["years"], "int", "Fixed 50-year horizon")
    r += 1
    input_row(ws, r, "Annuity Type",
              "Due (Beginning)" if params["annuity_due"] else "Ordinary (End)",
              "general", "Timing of each payment")
    r += 1
    input_row(ws, r, "Growth Rate (escalation)",
              params["growth"], "pct",
              "Annual payment step-up; 0 = level annuity")

    # ── Summary metrics ────────────────────────────────────────────────────
    n      = params["years"] * params["freq"]
    i      = params["rate"] / params["freq"]
    pv     = params["pv"]
    g      = params["growth"] / params["freq"]   # periodic growth
    due    = params["annuity_due"]

    # Periodic payment (growing annuity if g != 0)
    if abs(g - i) < 1e-12:
        # Edge case: g == i
        pmt_0 = (pv * i) / (n * (1 + i) ** (-1 if due else 0))
    elif g == 0:
        # Level annuity PMT formula
        pmt_0 = (pv * i) / (1 - (1 + i) ** -n)
        if due:
            pmt_0 /= (1 + i)
    else:
        # Growing annuity PMT formula
        pmt_0 = (pv * (i - g)) / (1 - ((1 + g) / (1 + i)) ** n)
        if due:
            pmt_0 /= (1 + i)

    # Rebuild full cashflow schedule
    schedule = []
    balance  = pv
    total_pmt = 0
    total_int = 0
    total_prin = 0

    for period in range(1, n + 1):
        pmt = pmt_0 * ((1 + g) ** (period - 1))
        if due:
            principal = pmt
            interest  = (balance - principal) * i
        else:
            interest  = balance * i
            principal = pmt - interest

        end_bal = balance - principal
        if abs(end_bal) < 0.01:
            end_bal = 0.0

        pv_factor = (1 + i) ** -period
        pv_pmt    = pmt * pv_factor

        schedule.append({
            "period":    period,
            "year":      math.ceil(period / params["freq"]),
            "beg_bal":   balance,
            "payment":   pmt,
            "interest":  interest,
            "principal": principal,
            "end_bal":   end_bal,
            "pv_factor": pv_factor,
            "pv_pmt":    pv_pmt,
        })

        balance    = end_bal
        total_pmt  += pmt
        total_int  += interest
        total_prin += principal

    npv_payments = sum(r["pv_pmt"] for r in schedule)
    irr_approx   = params["rate"]   # by definition for level annuity

    r2 = 6
    result_row(ws, r2, "First Payment Amount",      pmt_0)
    r2 += 1
    result_row(ws, r2, "Total Number of Payments",  n,            "int")
    r2 += 1
    result_row(ws, r2, "Total Payments (undiscounted)", total_pmt)
    r2 += 1
    result_row(ws, r2, "Total Interest Paid",       total_int)
    r2 += 1
    result_row(ws, r2, "Total Principal Repaid",    total_prin)
    r2 += 1
    result_row(ws, r2, "NPV of All Payments",       npv_payments)
    r2 += 1
    result_row(ws, r2, "Interest / Principal Ratio",
               total_int / total_prin if total_prin else 0, "x")
    r2 += 1
    result_row(ws, r2, "Payment Multiplier (x PV)",
               total_pmt / pv if pv else 0, "x", highlight=True)

    # ── Divider column ──────────────────────────────────────────────────────
    for row in range(5, r2 + 2):
        ws.cell(row=row, column=6).fill = hex_fill(NAVY)

    # ── Footnote ────────────────────────────────────────────────────────────
    ws.merge_cells(f"B{r2+3}:K{r2+3}")
    fn = ws[f"B{r2+3}"]
    fn.value = (
        "Note: Cashflow schedule and sensitivity analysis are on separate "
        "tabs.  All figures in USD.  Interest compounded at payment frequency."
    )
    fn.font = reg_font(size=9, colour="7F8C8D")
    fn.alignment = Alignment(horizontal="left", vertical="center")

    return schedule, pmt_0, params


# ── Sheet 2: Cashflow Schedule ───────────────────────────────────────────────
def build_schedule(wb, schedule, params):
    ws = wb.create_sheet("Cashflow Schedule")
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A4"

    col_labels = [
        ("A", 6,  "Period"),
        ("B", 8,  "Year"),
        ("C", 16, "Beginning Balance"),
        ("D", 16, "Payment"),
        ("E", 16, "Interest"),
        ("F", 16, "Principal"),
        ("G", 16, "Ending Balance"),
        ("H", 12, "PV Factor"),
        ("I", 16, "PV of Payment"),
        ("J", 20, "Cumulative Payments"),
        ("K", 20, "Cumulative Interest"),
    ]

    # column widths
    for col_ltr, width, _ in col_labels:
        ws.column_dimensions[col_ltr].width = width

    # ── Title ──────────────────────────────────────────────────────────────
    ws.merge_cells("A1:K1")
    t = ws["A1"]
    t.value = "50-YEAR ANNUITY  —  CASHFLOW SCHEDULE"
    t.font = bold_font(size=14, colour=WHITE)
    t.fill = hex_fill(NAVY)
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    ws.merge_cells("A2:K2")
    s = ws["A2"]
    freq_map = {1: "Annual", 4: "Quarterly", 12: "Monthly"}
    s.value = (
        f"PV: ${params['pv']:,.0f}   |   "
        f"Rate: {params['rate']:.2%}   |   "
        f"Frequency: {freq_map.get(params['freq'], str(params['freq']))}   |   "
        f"Growth: {params['growth']:.2%}   |   "
        f"Type: {'Due' if params['annuity_due'] else 'Ordinary'}"
    )
    s.font = bold_font(size=10, colour=WHITE)
    s.fill = hex_fill(STEEL)
    s.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    # ── Column headers ─────────────────────────────────────────────────────
    for idx, (col_ltr, _, label) in enumerate(col_labels, start=1):
        c = ws.cell(row=3, column=idx, value=label)
        c.font = bold_font(size=10, colour=WHITE)
        c.fill = hex_fill(STEEL)
        c.alignment = Alignment(horizontal="center", vertical="center",
                                 wrap_text=True)
        c.border = thin_border()
    ws.row_dimensions[3].height = 30

    # ── Data rows ──────────────────────────────────────────────────────────
    USD   = '$#,##0.00'
    PCT4  = '0.0000'
    cum_pmt = 0
    cum_int = 0

    for i, row in enumerate(schedule, start=1):
        r = i + 3
        cum_pmt += row["payment"]
        cum_int += row["interest"]

        # Alternating row background
        bg = WHITE if i % 2 == 1 else LIGHT_GRY

        # Highlight year-end rows
        is_year_end = (row["period"] % params["freq"] == 0)

        values = [
            row["period"],
            row["year"],
            row["beg_bal"],
            row["payment"],
            row["interest"],
            row["principal"],
            row["end_bal"],
            row["pv_factor"],
            row["pv_pmt"],
            cum_pmt,
            cum_int,
        ]
        fmts = ["0", "0", USD, USD, USD, USD, USD, PCT4, USD, USD, USD]

        for col_idx, (val, fmt) in enumerate(zip(values, fmts), start=1):
            c = ws.cell(row=r, column=col_idx, value=val)
            c.number_format = fmt
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = thin_border(("bottom", "left", "right"))

            if is_year_end:
                c.fill = hex_fill(LIGHT_BLU)
                c.font = reg_font(size=9, bold=True, colour=NAVY)
                c.border = thin_border()
            else:
                c.fill = hex_fill(bg)
                c.font = reg_font(size=9)

        ws.row_dimensions[r].height = 16

    # ── Totals row ─────────────────────────────────────────────────────────
    tot_row = len(schedule) + 4
    ws.row_dimensions[tot_row].height = 22
    totals = {
        1: ("TOTAL", "0"),
        3: ("",      USD),
        4: (sum(r["payment"]   for r in schedule), USD),
        5: (sum(r["interest"]  for r in schedule), USD),
        6: (sum(r["principal"] for r in schedule), USD),
        7: ("",      USD),
        8: ("",      PCT4),
        9: (sum(r["pv_pmt"]   for r in schedule), USD),
    }
    for col_idx in range(1, 12):
        c = ws.cell(row=tot_row, column=col_idx)
        if col_idx in totals:
            c.value = totals[col_idx][0]
            c.number_format = totals[col_idx][1]
        c.font = bold_font(size=10, colour=WHITE)
        c.fill = hex_fill(NAVY)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = med_border()

    return ws


# ── Sheet 3: Sensitivity Analysis ───────────────────────────────────────────
def build_sensitivity(wb, params):
    ws = wb.create_sheet("Sensitivity Analysis")
    ws.sheet_view.showGridLines = False

    ws.merge_cells("A1:L1")
    t = ws["A1"]
    t.value = "SENSITIVITY ANALYSIS  —  Present Value vs Interest Rate & Term"
    t.font = bold_font(size=13, colour=WHITE)
    t.fill = hex_fill(NAVY)
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    # ── Table 1: PV sensitivity to rate ─────────────────────────────────
    ws.merge_cells("A3:F3")
    h1 = ws["A3"]
    h1.value = f"Table 1: First Payment vs Discount Rate  (PV={params['pv']:,.0f}, 50yr)"
    h1.font = bold_font(size=11, colour=WHITE)
    h1.fill = hex_fill(STEEL)
    h1.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    rates = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07,
             0.08, 0.09, 0.10, 0.11, 0.12]
    headers = ["Rate", "First Pmt (Annual)", "First Pmt (Quarterly)",
               "First Pmt (Monthly)", "Total Paid (Annual)",
               "NPV Check"]
    for col, h in enumerate(headers, start=1):
        c = ws.cell(row=4, column=col, value=h)
        c.font = bold_font(size=10, colour=WHITE)
        c.fill = hex_fill(STEEL)
        c.alignment = Alignment(horizontal="center", vertical="center")
        ws.column_dimensions[get_column_letter(col)].width = 20

    for r_idx, rate in enumerate(rates, start=5):
        def pmt_calc(freq, r=rate):
            n = 50 * freq
            i = r / freq
            if i == 0:
                return params["pv"] / n
            return (params["pv"] * i) / (1 - (1 + i) ** -n)

        pmt_a = pmt_calc(1)
        pmt_q = pmt_calc(4)
        pmt_m = pmt_calc(12)
        total_a = pmt_a * 50
        npv_check = sum(
            pmt_a * (1 + rate) ** -yr for yr in range(1, 51)
        )

        row_vals = [rate, pmt_a, pmt_q, pmt_m, total_a, npv_check]
        row_fmts = ["0.00%", "$#,##0.00", "$#,##0.00",
                    "$#,##0.00", "$#,##0.00", "$#,##0.00"]
        bg = WHITE if r_idx % 2 == 1 else LIGHT_GRY

        # Highlight selected rate
        if abs(rate - params["rate"]) < 1e-9:
            bg = LIGHT_BLU

        for col_idx, (val, fmt) in enumerate(zip(row_vals, row_fmts), 1):
            c = ws.cell(row=r_idx, column=col_idx, value=val)
            c.number_format = fmt
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.fill = hex_fill(bg)
            c.font = reg_font(size=10,
                              bold=(abs(rate - params["rate"]) < 1e-9))
            c.border = thin_border(("bottom",))

    # ── Table 2: PV sensitivity to term ─────────────────────────────────
    ws.merge_cells("A19:F19")
    h2 = ws["A19"]
    h2.value = (
        f"Table 2: First Payment vs Term  "
        f"(PV={params['pv']:,.0f}, Rate={params['rate']:.2%})"
    )
    h2.font = bold_font(size=11, colour=WHITE)
    h2.fill = hex_fill(STEEL)
    h2.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    term_headers = ["Term (yrs)", "Annual PMT", "Quarterly PMT",
                    "Monthly PMT", "Total Paid", "Interest Paid"]
    for col, h in enumerate(term_headers, start=1):
        c = ws.cell(row=20, column=col, value=h)
        c.font = bold_font(size=10, colour=WHITE)
        c.fill = hex_fill(STEEL)
        c.alignment = Alignment(horizontal="center", vertical="center")

    terms = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    for t_idx, term in enumerate(terms, start=21):
        def pmt_t(freq, t=term):
            n = t * freq
            i = params["rate"] / freq
            if i == 0:
                return params["pv"] / n
            return (params["pv"] * i) / (1 - (1 + i) ** -n)

        pmt_a = pmt_t(1)
        pmt_q = pmt_t(4)
        pmt_m = pmt_t(12)
        total = pmt_a * term
        interest = total - params["pv"]
        bg = WHITE if t_idx % 2 == 1 else LIGHT_GRY
        if term == params["years"]:
            bg = LIGHT_BLU

        vals = [term, pmt_a, pmt_q, pmt_m, total, interest]
        fmts = ["0", "$#,##0.00", "$#,##0.00",
                "$#,##0.00", "$#,##0.00", "$#,##0.00"]
        for col_idx, (val, fmt) in enumerate(zip(vals, fmts), 1):
            c = ws.cell(row=t_idx, column=col_idx, value=val)
            c.number_format = fmt
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.fill = hex_fill(bg)
            c.font = reg_font(size=10, bold=(term == params["years"]))
            c.border = thin_border(("bottom",))

    return ws


# ── Sheet 4: Annual Summary (year-end roll-up) ───────────────────────────────
def build_annual_summary(wb, schedule, params):
    ws = wb.create_sheet("Annual Summary")
    ws.sheet_view.showGridLines = False

    ws.merge_cells("A1:I1")
    t = ws["A1"]
    t.value = "ANNUAL CASHFLOW SUMMARY  —  50-YEAR HORIZON"
    t.font = bold_font(size=14, colour=WHITE)
    t.fill = hex_fill(NAVY)
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    headers = [
        "Year", "Beg Balance", "Total Payments",
        "Total Interest", "Total Principal",
        "End Balance", "Annual PV", "Cum. Payments", "Cum. Interest"
    ]
    col_widths = [8, 16, 16, 16, 16, 16, 14, 18, 18]
    for col, (h, w) in enumerate(zip(headers, col_widths), 1):
        c = ws.cell(row=2, column=col, value=h)
        c.font = bold_font(size=10, colour=WHITE)
        c.fill = hex_fill(STEEL)
        c.alignment = Alignment(horizontal="center", vertical="center",
                                 wrap_text=True)
        c.border = thin_border()
        ws.column_dimensions[get_column_letter(col)].width = w
    ws.row_dimensions[2].height = 30

    freq = params["freq"]
    cum_pmt = 0
    cum_int = 0

    for year in range(1, 51):
        year_rows = [r for r in schedule if r["year"] == year]
        if not year_rows:
            continue

        beg_bal   = year_rows[0]["beg_bal"]
        end_bal   = year_rows[-1]["end_bal"]
        yr_pmt    = sum(r["payment"]   for r in year_rows)
        yr_int    = sum(r["interest"]  for r in year_rows)
        yr_prin   = sum(r["principal"] for r in year_rows)
        yr_pv     = sum(r["pv_pmt"]    for r in year_rows)
        cum_pmt  += yr_pmt
        cum_int  += yr_int

        row_num = year + 2
        bg = WHITE if year % 2 == 1 else LIGHT_GRY

        vals = [year, beg_bal, yr_pmt, yr_int, yr_prin,
                end_bal, yr_pv, cum_pmt, cum_int]
        fmts = ["0", "$#,##0", "$#,##0", "$#,##0",
                "$#,##0", "$#,##0", "$#,##0", "$#,##0", "$#,##0"]

        for col_idx, (val, fmt) in enumerate(zip(vals, fmts), 1):
            c = ws.cell(row=row_num, column=col_idx, value=val)
            c.number_format = fmt
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.fill = hex_fill(bg)
            c.font = reg_font(size=9)
            c.border = thin_border(("bottom",))
        ws.row_dimensions[row_num].height = 16

    # Totals
    tot = 53
    ws.row_dimensions[tot].height = 22
    for col_idx in range(1, 10):
        c = ws.cell(row=tot, column=col_idx)
        c.font = bold_font(size=10, colour=WHITE)
        c.fill = hex_fill(NAVY)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = med_border()

    ws.cell(row=tot, column=1).value = "TOTAL"
    ws.cell(row=tot, column=3).value = sum(r["payment"]   for r in schedule)
    ws.cell(row=tot, column=4).value = sum(r["interest"]  for r in schedule)
    ws.cell(row=tot, column=5).value = sum(r["principal"] for r in schedule)
    ws.cell(row=tot, column=7).value = sum(r["pv_pmt"]    for r in schedule)
    for col_idx in [3, 4, 5, 7]:
        ws.cell(row=tot, column=col_idx).number_format = "$#,##0"

    # ── Bar chart: Annual payments breakdown ─────────────────────────────
    chart = BarChart()
    chart.type    = "bar"
    chart.grouping = "stacked"
    chart.title   = "Annual Interest vs Principal  (50-Year Annuity)"
    chart.y_axis.title = "USD"
    chart.x_axis.title = "Year"
    chart.style  = 10
    chart.width  = 28
    chart.height = 14

    int_data  = Reference(ws, min_col=4, min_row=2, max_row=52)
    prin_data = Reference(ws, min_col=5, min_row=2, max_row=52)
    cats      = Reference(ws, min_col=1, min_row=3, max_row=52)

    from openpyxl.chart import Series
    s1 = chart.series.append(Series(int_data,  title_from_data=True))
    s2 = chart.series.append(Series(prin_data, title_from_data=True))
    chart.set_categories(cats)

    ws.add_chart(chart, "A56")

    # ── Line chart: Ending balance rundown ───────────────────────────────
    lc = LineChart()
    lc.title   = "Ending Balance Rundown  (50-Year Annuity)"
    lc.y_axis.title = "Balance (USD)"
    lc.x_axis.title = "Year"
    lc.style  = 10
    lc.width  = 28
    lc.height = 14

    bal_data = Reference(ws, min_col=6, min_row=2, max_row=52)
    from openpyxl.chart import Series as Ser
    lc.series.append(Ser(bal_data, title_from_data=True))
    lc.set_categories(cats)

    ws.add_chart(lc, "K56")

    return ws


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    params = {
        "pv":          1_000_000,   # $1,000,000 initial amount
        "rate":        0.06,        # 6% annual rate
        "freq":        1,           # annual payments
        "years":       50,          # 50-year term
        "annuity_due": False,       # ordinary annuity (end of period)
        "growth":      0.00,        # 0% escalation (level annuity)
    }

    wb = openpyxl.Workbook()
    # Remove default sheet
    del wb["Sheet"]

    schedule, pmt_0, params = build_dashboard(wb, params)
    build_schedule(wb, schedule, params)
    build_annual_summary(wb, schedule, params)
    build_sensitivity(wb, params)

    # Set Dashboard as active sheet
    wb.active = wb["Dashboard"]

    output = "annuity_cashflow_model_50yr.xlsx"
    wb.save(output)
    print(f"Saved: {output}")
    print(f"  Periods:          {params['years'] * params['freq']}")
    print(f"  First payment:    ${pmt_0:,.2f}")
    print(f"  Total payments:   ${sum(r['payment'] for r in schedule):,.2f}")
    print(f"  Total interest:   ${sum(r['interest'] for r in schedule):,.2f}")
    print(f"  Sheets:           Dashboard, Cashflow Schedule, "
          f"Annual Summary, Sensitivity Analysis")


if __name__ == "__main__":
    main()
