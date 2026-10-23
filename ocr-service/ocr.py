import cv2
import numpy as np
import pytesseract

from bill_parser import parse_bill, validate, to_dict

# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

LANG = "eng"

def preprocess_variants(image_bytes):
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not read the image")
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (3, 3), 0)
    return {
        "adaptive": cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                          cv2.THRESH_BINARY, 31, 10),
        "otsu": cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
        "gray": gray,
    }

def read_bill(image_bytes):
    """Try several preprocessing/layout settings and keep the one that validates best."""
    best = None
    for name, im in preprocess_variants(image_bytes).items():
        for psm in (4, 6):
            text = pytesseract.image_to_string(im, lang=LANG, config=f"--psm {psm}")
            bill = parse_bill(text)
            report = validate(bill)
            score = (report["ok"], len(bill.items), -len(report["issues"]))
            if best is None or score > best[0]:
                best = (score, name, psm, text, bill, report)
    _, name, psm, text, bill, report = best
    return {
        "bill": to_dict(bill),
        "validation": report,
        "debug": {"preprocess": name, "psm": psm, "raw_text": text},
    }