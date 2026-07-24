import base64
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError


DEFAULT_ROI_SCORE_LEFT = {"x": 0.26, "y": 0.12, "width": 0.15, "height": 0.08}
DEFAULT_ROI_SCORE_RIGHT = {"x": 0.56, "y": 0.12, "width": 0.15, "height": 0.08}
DEFAULT_ROI_FULL = {"x": 0.00, "y": 0.12, "width": 1.00, "height": 0.40}

_reader = None
_last_score = None


@dataclass
class ScanResult:
    victory: int | None
    lose: int | None
    evidence_score_left: str
    evidence_score_right: str
    evidence_full: str
    saved_file: str | None
    raw: dict


def _load_ocr_dependencies():
    try:
        import cv2
        import easyocr
        import numpy as np
    except ImportError as exc:
        raise ValidationError(
            "OCR dependencies are not installed. Run: pip install -r requirements-ocr.txt"
        ) from exc
    return cv2, easyocr, np


def _get_reader():
    global _reader
    _cv2, easyocr, _np = _load_ocr_dependencies()
    if _reader is None:
        _reader = easyocr.Reader(["en"], gpu=True)
    return _reader


def _validated_roi(value, default):
    roi = value or default
    required = {"x", "y", "width", "height"}
    if not required.issubset(roi):
        raise ValidationError("ROI must include x, y, width, and height.")
    normalized = {}
    for key in required:
        try:
            number = float(roi[key])
        except (TypeError, ValueError):
            raise ValidationError("ROI values must be numbers.")
        if key in {"x", "y"} and not 0 <= number <= 1:
            raise ValidationError("ROI x/y must be between 0 and 1.")
        if key in {"width", "height"} and not 0 < number <= 1:
            raise ValidationError("ROI width/height must be between 0 and 1.")
        normalized[key] = number
    return normalized


def _relative(path):
    return str(path.relative_to(settings.MEDIA_ROOT)).replace("\\", "/")


def scan_score_image(image_data, roi_score_left=None, roi_score_right=None, roi_full=None):
    global _last_score
    cv2, _easyocr, np = _load_ocr_dependencies()
    reader = _get_reader()

    if not image_data or "," not in image_data:
        raise ValidationError("Image must be a data URL.")

    encoded = image_data.split(",", 1)[1]
    try:
        image_bytes = base64.b64decode(encoded)
    except (ValueError, TypeError) as exc:
        raise ValidationError("Invalid image data.") from exc

    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValidationError("Invalid image.")

    roi_score_left = _validated_roi(roi_score_left, DEFAULT_ROI_SCORE_LEFT)
    roi_score_right = _validated_roi(roi_score_right, DEFAULT_ROI_SCORE_RIGHT)
    roi_full = _validated_roi(roi_full, DEFAULT_ROI_FULL)

    height, width = image.shape[:2]

    def crop(roi):
        x = int(width * roi["x"])
        y = int(height * roi["y"])
        w = int(width * roi["width"])
        h = int(height * roi["height"])
        return image[y : y + h, x : x + w]

    cropped_left = crop(roi_score_left)
    cropped_right = crop(roi_score_right)
    cropped_full = crop(roi_full)

    def read_number(cropped):
        gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
        enhanced = cv2.convertScaleAbs(gray, alpha=1.6, beta=30)
        results = reader.readtext(enhanced)
        text = " ".join([text for (_bbox, text, _confidence) in results])
        nums = re.findall(r"\d+", text)
        return int(nums[0]) if nums else None, text, results

    victory, text_left, results_left = read_number(cropped_left)
    lose, text_right, results_right = read_number(cropped_right)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    folder = Path(settings.MEDIA_ROOT) / "evidence" / "ocr"
    folder.mkdir(parents=True, exist_ok=True)

    score_left_path = folder / f"score_left_{timestamp}.jpg"
    score_right_path = folder / f"score_right_{timestamp}.jpg"
    full_path = folder / f"full_{timestamp}.jpg"

    cv2.imwrite(str(score_left_path), cropped_left)
    cv2.imwrite(str(score_right_path), cropped_right)
    cv2.imwrite(str(full_path), cropped_full)

    current_score = (victory, lose)
    saved_file = None
    if current_score != _last_score:
        _last_score = current_score
        json_path = folder / f"score_{timestamp}.json"
        json_payload = {"Score": {"Victory": victory, "Lose": lose}}
        json_path.write_text(
            json.dumps(json_payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        saved_file = _relative(json_path)

    raw = {
        "Score": {"Victory": victory, "Lose": lose},
        "roi_score_left": roi_score_left,
        "roi_score_right": roi_score_right,
        "roi_full": roi_full,
        "text_left": text_left,
        "text_right": text_right,
        "results_left": str(results_left),
        "results_right": str(results_right),
        "evidence_score_left": _relative(score_left_path),
        "evidence_score_right": _relative(score_right_path),
        "evidence_full": _relative(full_path),
    }

    return ScanResult(
        victory=victory,
        lose=lose,
        evidence_score_left=_relative(score_left_path),
        evidence_score_right=_relative(score_right_path),
        evidence_full=_relative(full_path),
        saved_file=saved_file,
        raw=raw,
    )

