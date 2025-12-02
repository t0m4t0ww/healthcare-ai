# app/routes/xray.py
from pathlib import Path
from datetime import datetime
from uuid import uuid4
import mimetypes
import math

from flask import Blueprint, request, send_file, current_app, url_for, g
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from app.config import get_settings
from app.utils.responses import ok, fail
from app.utils.image_utils import safe_filename, ensure_dir, resize_inplace
from app.services.yolo_service import infer
from app.extensions import mongo_db

xray_bp = Blueprint("xray_bp", __name__)
_settings = get_settings()

# …/backend/app
APP_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = APP_DIR / "upload" / "xray"
RESULT_DIR = APP_DIR / "static" / "xray_results"

ALLOWED_EXTS = {"png", "jpg", "jpeg"}
ALLOWED_MIMES = {"image/png", "image/jpeg"}


def _allowed(filename: str, mimetype: str | None = None) -> bool:
    ext_ok = ("." in filename) and (filename.rsplit(".", 1)[-1].lower() in ALLOWED_EXTS)
    if ext_ok:
        return True
    return (mimetype in ALLOWED_MIMES)


def _num(v, cast, default):
    try:
        return cast(v)
    except Exception:
        return default


def _coerce_prob(x: float) -> float:
    """Ép xác suất về [0..1], chống NaN/%."""
    try:
        v = float(x)
    except Exception:
        return 0.0
    if not math.isfinite(v):
        return 0.0
    if 1.0 < v <= 100.0:  # nếu model trả 0..100 (%)
        v = v / 100.0
    return max(0.0, min(1.0, v))


def _box_from_pred(p, W: int, H: int):
    """
    Trả (x1,y1,x2,y2) theo pixel.
    Hỗ trợ các format phổ biến: {box:[x1,y1,x2,y2]}, {bbox:...},
    {xyxy:[...]}, {xywh:[cx,cy,w,h]} normalized.
    """
    # 1) XYXY dạng list/tuple
    for k in ("box", "bbox", "xyxy"):
        if isinstance(p.get(k), (list, tuple)) and len(p[k]) == 4:
            x1, y1, x2, y2 = [float(v) for v in p[k]]
            return max(0, x1), max(0, y1), min(W, x2), min(H, y2)

    # 2) Dict có x1,y1,x2,y2
    if isinstance(p.get("box"), dict):
        b = p["box"]
        if all(k in b for k in ("x1", "y1", "x2", "y2")):
            return (
                max(0, float(b["x1"])),
                max(0, float(b["y1"])),
                min(W, float(b["x2"])),
                min(H, float(b["y2"])),
            )

    # 3) YOLO xywh (center, size) – hỗn hợp pixel/normalized
    for k in ("xywh", "box", "bbox"):
        v = p.get(k)
        if isinstance(v, (list, tuple)) and len(v) == 4:
            cx, cy, ww, hh = [float(x) for x in v]
            # nếu có vẻ normalized → scale theo W,H
            if ww <= 1.0 and hh <= 1.0:
                cx, cy, ww, hh = cx * W, cy * H, ww * W, hh * H
            x1 = cx - ww / 2.0
            y1 = cy - hh / 2.0
            x2 = cx + ww / 2.0
            y2 = cy + hh / 2.0
            return max(0, x1), max(0, y1), min(W, x2), min(H, y2)

    return None


def _sanitize_preds(preds):
    """Chuẩn hoá label/prob; giữ lại thông tin box để vẽ."""
    out = []
    for p in preds or []:
        label = p.get("label") or p.get("name") or p.get("class") or "Unknown"
        raw = p.get("prob", p.get("confidence", p.get("score", p.get("conf"))))
        out.append(
            {
                "label": label,
                "prob": _coerce_prob(raw),
                "box": p.get("box") or p.get("bbox") or p.get("xyxy") or p.get("xywh"),
            }
        )
    return out


def _color_for(label: str):
    """Sinh màu ổn định theo label."""
    import random

    rnd = random.Random(hash(label) & 0xFFFFFFFF)
    return (50 + rnd.randint(0, 205), 50 + rnd.randint(0, 205), 50 + rnd.randint(0, 205))


def _to_pil(img_like):
    """Chuyển annotated (np.ndarray / PIL / path str) -> PIL.Image RGB."""
    if isinstance(img_like, Image.Image):
        return img_like.convert("RGB")
    if isinstance(img_like, np.ndarray):
        arr = img_like
        if arr.ndim == 2:  # grayscale
            return Image.fromarray(arr).convert("RGB")
        if arr.ndim == 3 and arr.shape[2] == 3:
            # đoán từ OpenCV (BGR) → RGB
            arr = arr[:, :, ::-1]
            return Image.fromarray(arr).convert("RGB")
        return Image.fromarray(arr).convert("RGB")
    if isinstance(img_like, (str, Path)):
        return Image.open(str(img_like)).convert("RGB")
    return None


def _draw_boxes(base_img: Image.Image, preds_sanitized):
    """Vẽ bbox + label lên ảnh PIL rồi trả PIL.Image."""
    img = base_img.convert("RGB")
    W, H = img.size
    draw = ImageDraw.Draw(img)

    # font: ưu tiên truetype nếu có, fallback default
    try:
        font = ImageFont.truetype("arial.ttf", max(12, int(min(W, H) * 0.025)))
    except Exception:
        font = ImageFont.load_default()

    thickness = max(2, int(min(W, H) * 0.004))  # scale theo ảnh

    for p in preds_sanitized:
        box = _box_from_pred(p, W, H)
        if not box:
            continue
        x1, y1, x2, y2 = box
        color = _color_for(p["label"])

        # rectangle (viền dày)
        for t in range(thickness):
            draw.rectangle([x1 - t, y1 - t, x2 + t, y2 + t], outline=color)

        # nhãn
        text = f"{p['label']} {p['prob'] * 100:.1f}%"
        pad = 2
        try:
            tw, th = draw.textsize(text, font=font)  # PIL <10
        except Exception:
            # PIL>=10 khuyến nghị textbbox
            bbox = draw.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        # nền label
        draw.rectangle([x1, y1 - th - 2 * pad, x1 + tw + 2 * pad, y1], fill=color)
        # chữ trắng
        draw.text((x1 + pad, y1 - th - pad), text, fill=(255, 255, 255), font=font)

    return img


# Cho phép gọi theo 2 kiểu:
#  - Nếu blueprint mount ở /api/xray  -> POST /api/xray/predict
#  - Nếu blueprint mount ở /api       -> POST /api/predict-xray
@xray_bp.post("/predict")
@xray_bp.post("/predict-xray")
def predict_xray():
    f = request.files.get("file") or request.files.get("image")
    if not f or not f.filename:
        return fail("Thiếu file ảnh.", 400)
    if not _allowed(f.filename, f.mimetype):
        return fail("Định dạng không hỗ trợ.", 400)

    ensure_dir(UPLOAD_DIR)
    ensure_dir(RESULT_DIR)

    # Lưu input
    in_name = safe_filename(f.filename)
    inp_path = UPLOAD_DIR / in_name
    f.save(str(inp_path))
    try:
        resize_inplace(inp_path, _settings.MAX_IMAGE_SIZE)
    except Exception as e:
        current_app.logger.warning(f"[XRay] resize warn: {e}")

    # Params
    conf  = _num(request.form.get("conf")  or request.args.get("conf"),  float, 0.25)
    iou   = _num(request.form.get("iou")   or request.args.get("iou"),   float, 0.45)
    imgsz = _num(request.form.get("imgsz") or request.args.get("imgsz"), int,   640)
    device = request.form.get("device") or request.args.get("device") or None

    try:
        current_app.logger.info(
            f"[XRay] start conf={conf} iou={iou} imgsz={imgsz} device={device or 'cpu'} inp={inp_path}"
        )

        # ---- RUN MODEL
        preds_raw, annotated = infer(inp_path, conf=conf, iou=iou, imgsz=imgsz, device=device)

        # ---- Chuẩn hoá dự đoán & tính top (🔧 FIX: luôn define top)
        preds = _sanitize_preds(preds_raw)
        top = (max(preds, key=lambda x: x["prob"]) if preds else None)

        # ---- Tạo annotated (có bbox)
        out_name = f"{uuid4().hex}_{Path(in_name).stem}.jpg"
        out_path = RESULT_DIR / out_name
        try:
            base_from_model = _to_pil(annotated)           # r.plot() -> ndarray BGR -> PIL
            if any(p.get("box") for p in preds) and base_from_model:
                vis = base_from_model                      # model đã vẽ box
            else:
                base = base_from_model or Image.open(str(inp_path)).convert("RGB")
                vis = _draw_boxes(base, preds)             # tự vẽ (nếu cần)
            vis.save(out_path, format="JPEG", quality=90)
        except Exception as e:
            current_app.logger.exception(f"[XRay] draw/save annotated failed: {e}")
            return fail("Không thể tạo ảnh annotated trên server.", 500)

        current_app.logger.info(f"[XRay] ok -> {out_path}")

        # ---- Lưu DB (best-effort)
        try:
            mongo_db.xray_results.insert_one({
                "patient_name": request.form.get("patient_name", "Unknown"),
                "doctor_id": getattr(g, "user_id", None) or request.form.get("doctor_id"),
                "annotated_path": f"static/xray_results/{out_name}",
                "ai_result": (top or {}),
                "created_at": datetime.utcnow()
            })
        except Exception as dbe:
            current_app.logger.warning(f"[XRay] DB insert warn: {dbe}")

        img_url = url_for("xray_bp.get_xray_image", filename=out_name, _external=True)

        return ok({
            "predictions": preds,
            "top": top,
            "annotated_image_url": img_url,
            "params": {"conf": conf, "iou": iou, "imgsz": imgsz, "device": device or "cpu"},
        })

    except FileNotFoundError as e:
        current_app.logger.exception("[XRay] Model or file not found")
        return fail(f"Không tìm thấy tài nguyên: {e}", 500)
    except ModuleNotFoundError as e:
        current_app.logger.exception("[XRay] Missing dependency")
        return fail(f"Thiếu thư viện backend: {e}. Cài đặt: pip install ultralytics pillow torch", 500)
    except Exception as e:
        current_app.logger.exception("[XRay] Predict failed (unknown)")
        return fail(f"Lỗi xử lý ảnh: {e}", 500)


@xray_bp.get("/xray-results/<filename>")
def get_xray_image(filename: str):
    path = RESULT_DIR / filename
    if not path.exists():
        current_app.logger.warning(f"[XRay] Not found: {path}")
        try:
            files = [p.name for p in RESULT_DIR.glob("*")]
            current_app.logger.info(f"[XRay] Existing files: {files[:30]}")
        except Exception:
            pass
    mtype, _ = mimetypes.guess_type(str(path))
    return send_file(str(path), mimetype=mtype or "image/jpeg", conditional=True)
