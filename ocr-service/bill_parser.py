import re
import difflib
from dataclasses import dataclass, field
from itertools import product

# ---------- number handling ----------
NUM = r"\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?"

def to_number(s):
    s = s.strip()
    m = re.search(r"[.,](\d{1,2})$", s)          # trailing 1-2 digits = decimals
    if m and not re.search(r"[.,]\d{3}$", s):
        return float(re.sub(r"[.,]", "", s[:m.start()]) + "." + m.group(1))
    return float(re.sub(r"[.,]", "", s))         # otherwise separators are thousands

# ---------- label vocabulary (extend freely) ----------
KINDS = [  # order matters: first match wins
    ("subtotal", r"sub\s*-?\s*total"),
    ("total",    r"^((grand\s*)?total(\s*(bayar|due|amount|payment|tagihan))?|amount\s*due|jumlah)$"),
    ("discount", r"disc|diskon|promo|voucher|potongan"),
    ("rounding", r"round|pembulatan"),
    ("charge",   r"service|tax|pb\s*[1il]|ppn|vat|pajak|fee|charge|biaya"),
]

# long keywords only: short ones ("tax", "total") would match ordinary words like "tea"
FUZZY = {"subtotal": "subtotal", "service": "charge", "discount": "discount",
         "diskon": "discount", "charge": "charge"}

def fuzzy_kind(label):
    for word in re.findall(r"[a-z]{6,}", label):
        for kw, kind in FUZZY.items():
            if difflib.SequenceMatcher(None, word, kw).ratio() >= 0.8:
                return kind
    return None

@dataclass
class Item:
    qty: int
    name: str
    price: float                       # line total
    unit: float = None                 # unit price, when the receipt prints one
    notes: list = field(default_factory=list)

@dataclass
class Adjustment:
    label: str
    kind: str                          # charge | discount | rounding
    amount: float                      # signed

@dataclass
class Bill:
    items: list = field(default_factory=list)
    adjustments: list = field(default_factory=list)
    subtotal: float = None
    total: float = None

# ---------- parsing ----------
ITEM_RE    = re.compile(rf"^\s*(?:(\d+)\s*[xX]?\s+)?(.+?)\s+({NUM})\s*$")
SUMMARY_RE = re.compile(rf"^\s*([A-Za-z][A-Za-z0-9 .%/&()\-]*?)\s*[:=]?\s*(-?\(?(?:{NUM})\)?)\s*$")
# lines with a label + amount that are never items (category totals, payment lines)
IGNORE_RE  = re.compile(r"^\s*(?:(?:sub\s*-?\s*)?total\b|cash\b|tunai\b|change\b|kembali(?:an)?\b|bayar\b|payment\b|card\b|debit\b|credit\b|qris\b|tendered\b)", re.I)
EQ_TOTAL   = re.compile(rf"^=\s*({NUM})\s*$")          # "= 55.000" on its own line

def clean(raw):
    line = re.sub(r"[|_~\u2014\u2013]+|-{2,}|={2,}", " ", raw)      # scan noise
    line = re.sub(r"\b(?:Rp|IDR)\.?\s*", "", line, flags=re.I)       # currency prefix
    line = re.sub(r"(\d)\s+([.,]\d{3})(?!\d)", r"\1\2", line)          # "95 .000" -> "95.000"
    line = re.sub(r"(\d[.,])\s+(\d{3})(?!\d)", r"\1\2", line)          # "35, 000" -> "35,000"
    line = re.sub(r"[;'`]+(?=\d)", " ", line)                          # stray punctuation glued to a price
    line = re.sub(r"(\d[.,]\d{3})\s+[^\d\s]{1,3}(?:\s+[^\d\s]{1,3})*\s*$", r"\1", line)  # junk after price
    return line.strip()

def classify(label):
    l = label.lower().strip()
    for kind, pat in KINDS:
        if re.search(pat, l):
            return kind
    return fuzzy_kind(l)

def parse_bill(text):
    lines = [clean(r) for r in text.splitlines()]
    lines = [l for l in lines if l]
    bill, last_item, i = Bill(), None, 0
    while i < len(lines):
        line = lines[i]
        i += 1
        m = SUMMARY_RE.match(line)
        kind = None
        if m:
            kind = classify(m[1])
            # unknown label with a colon after the subtotal = probably a misread charge ("fax:" for "Tax:")
            if (kind is None and bill.subtotal is not None and ":" in line
                    and not IGNORE_RE.match(m[1])
                    and to_number(re.sub(r"[()\-]", "", m[2])) <= bill.subtotal):
                kind = "charge"
        if m and (kind is not None or IGNORE_RE.match(m[1])):
            raw_amt = m[2]
            val = to_number(re.sub(r"[()\-]", "", raw_amt))
            if kind == "subtotal":
                bill.subtotal = val
            elif kind == "total":
                bill.total = val
            elif kind in ("charge", "discount", "rounding"):
                neg = kind == "discount" or "(" in raw_amt or raw_amt.startswith("-")
                bill.adjustments.append(Adjustment(m[1].strip(), kind, -val if neg else val))
            continue
        m = ITEM_RE.match(line)
        # a name ending with ":" or "=" is a label, not an item
        if m and not m[2].rstrip().endswith((":", "=")) and re.search(r"[.,]\d{3}$", m[3]):
            qty, name, amount = int(m[1] or 1), m[2], to_number(m[3])
            hit = None
            for j in range(i, min(i + 3, len(lines))):    # "= total" within the next 2 lines
                if EQ_TOTAL.match(lines[j]):
                    hit = j
                    break
                if re.search(r"[.,]\d{3}", lines[j]):     # another priced line: stop looking
                    break
            if hit is not None:                           # layout: "1 x Name @ unit" + "= total"
                name = re.sub(r"\s+[@8aA&]$", "", name)   # OCR often turns "@" into 8/a/A
                last_item = Item(qty, name, to_number(EQ_TOTAL.match(lines[hit])[1]), unit=amount)
                last_item.notes += lines[i:hit]           # e.g. ">Ice"
                i = hit + 1
            else:                                         # layout: "1 Name total"
                last_item = Item(qty, name, amount)
            bill.items.append(last_item)
            continue
        # a line with no price right after an item = modifier
        if (last_item and bill.subtotal is None and not bill.adjustments
                and not classify(line) and not re.match(r"^\d+\s*items?\b", line, re.I)
                and re.match(r"^[>0-9Il\-]?\s*[A-Za-z]", line)):
            last_item.notes.append(line)
    return bill

# ---------- validation ----------
RATES = [x / 2 for x in range(1, 41)]          # 0.5% .. 20%

def clean_rate(amount, bases, tol=0.02):
    for base in bases:
        if base:
            pct = amount / base * 100
            if any(abs(pct - r) <= tol for r in RATES):
                return True
    return False

def validate(bill, tol=1):
    rep = {"ok": True, "issues": [], "fixes": []}
    unresolved = False

    # 1) each line: qty x unit price vs printed line total
    bad = [i for i in bill.items if i.unit and abs(i.qty * i.unit - i.price) > tol]
    for i in bad:
        rep["issues"].append(f"{i.name}: {i.qty} x {i.unit:,.0f} != line total {i.price:,.0f}")
    if bad and bill.subtotal is not None:
        bad_ids = {id(i) for i in bad}
        fixed = sum(i.price for i in bill.items if id(i) not in bad_ids)
        options = [(i.price, i.qty * i.unit) for i in bad]
        sols = [c for c in product(*options) if abs(fixed + sum(c) - bill.subtotal) <= tol]
        if len(sols) == 1:                        # exactly one combination matches the subtotal
            for i, v in zip(bad, sols[0]):
                if v == i.price:                      # printed line total wins, unit price was misread
                    rep["fixes"].append(f"{i.name}: unit price {i.unit:,.0f} -> {v / i.qty:,.0f}")
                    i.unit = v / i.qty
                else:                                 # qty x unit wins, line total was misread
                    rep["fixes"].append(f"{i.name}: line total {i.price:,.0f} -> {v:,.0f}")
                    i.price = v
            bad = []
    if bad:
        unresolved = True
        rep["issues"].append("line totals need review")

    # 2) items vs subtotal
    items_sum = sum(i.price for i in bill.items)
    if bill.subtotal is None:
        bill.subtotal = items_sum
        rep["issues"].append("subtotal missing, derived from items")
    elif abs(items_sum - bill.subtotal) > tol:
        unresolved = True
        rep["issues"].append(f"items sum {items_sum:,.0f} != subtotal {bill.subtotal:,.0f}")

    # 3) subtotal + adjustments vs total
    if bill.total is None:
        rep["ok"] = False
        rep["issues"].append("total not found")
        return rep
    gap = bill.total - (bill.subtotal + sum(a.amount for a in bill.adjustments))
    if abs(gap) > tol:
        rep["issues"].append(f"subtotal + adjustments != total (off by {gap:,.0f})")
        cands = []
        for k, a in enumerate(bill.adjustments):
            if a.kind != "charge":
                continue
            new = a.amount + gap
            others = sum(x.amount for j, x in enumerate(bill.adjustments) if j != k and x.kind == "charge")
            bases = [bill.subtotal, bill.subtotal + others]
            if new > 0 and clean_rate(new, bases) and not clean_rate(a.amount, bases):
                cands.append((k, a.label, a.amount, new))
        if len(cands) == 1:
            k, label, old, new = cands[0]
            bill.adjustments[k].amount = new
            rep["fixes"].append(f"{label}: {old:,.0f} -> {new:,.0f} (auto-corrected)")
        else:
            rep["fixes"] += [f"{l}: {o:,.0f} -> {n:,.0f}?" for _, l, o, n in cands]
            if gap > tol:                         # total is bigger: a charge line may be missing
                base = bill.subtotal + sum(a.amount for a in bill.adjustments if a.kind == "charge")
                pct = gap / base * 100 if base else 0
                rep["issues"].append(f"a line of about {gap:,.0f} may be missing (~{pct:.1f}% of {base:,.0f})")
            rep["issues"].append("needs user review")
            unresolved = True

    rep["ok"] = not unresolved
    return rep

def to_dict(bill):
    return {
        "items": [{"qty": i.qty, "name": i.name, "line_total": i.price,
                   "unit_price": i.unit or i.price / i.qty, "notes": i.notes} for i in bill.items],
        "subtotal": bill.subtotal,
        "adjustments": [vars(a) for a in bill.adjustments],
        "total": bill.total,
    }