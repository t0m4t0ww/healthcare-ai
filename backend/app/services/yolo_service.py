# backend/app/services/yolo_service.py
from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional, Union

import numpy as np
from PIL import Image

from app.config import get_settings

# ===== Model cache =====
_MODEL = None
_MODEL_KIND: Optional[str] = None  # "ultralytics" | "yolov5"
_MODEL_PATH: Optional[Path] = None


def _resolve_model_path() -> Path:
    """
    Lấy đường dẫn tuyệt đối tới file model (best.pt).
    Ưu tiên config của bạn; fallback thư mục ai_models/yolo_model/best.pt.
    """
    global _MODEL_PATH
    if _MODEL_PATH is not None:
        return _MODEL_PATH

    settings = get_settings()
    try:
        # Nếu bạn đã có hàm này trong config, giữ lại:
        p = settings.model_abs_path()
        if isinstance(p, (str, Path)):
            p = Path(p)
            if p.exists():
                _MODEL_PATH = p
                return _MODEL_PATH
    except Exception:
        pass

    # Fallback mặc định
    p = Path(__file__).resolve().parents[2] / "ai_models" / "yolo_model" / "best.pt"
    if not p.exists():
        raise FileNotFoundError(f"YOLO model not found at: {p}")
    _MODEL_PATH = p
    return _MODEL_PATH


def _get_model():
    """Lazy-load model. Ưu tiên Ultralytics; fallback YOLOv5 (torch hub)."""
    global _MODEL, _MODEL_KIND
    if _MODEL is not None:
        return _MODEL

    model_path = str(_resolve_model_path())

    # Try Ultralytics
    try:
        from ultralytics import YOLO  # type: ignore
        _MODEL = YOLO(model_path)
        _MODEL_KIND = "ultralytics"
        print(f"[YOLO] Loaded Ultralytics model: {model_path}")
        return _MODEL
    except Exception as e:
        print(f"[YOLO] Ultralytics load failed: {e} → fallback YOLOv5 hub")

    # Fallback: YOLOv5 hub
    import torch  # type: ignore
    _MODEL = torch.hub.load("ultralytics/yolov5", "custom", path=model_path, trust_repo=True)
    _MODEL_KIND = "yolov5"
    print(f"[YOLO] Loaded YOLOv5 hub model: {model_path}")
    return _MODEL


def _bgr_ndarray_to_pil(bgr: np.ndarray) -> Image.Image:
    """Ultralytics trả r.plot() là BGR ndarray → chuyển về PIL RGB."""
    if not isinstance(bgr, np.ndarray):
        raise ValueError("annotated is not a numpy array")
    if bgr.ndim == 2:  # grayscale
        return Image.fromarray(bgr).convert("RGB")
    if bgr.ndim == 3 and bgr.shape[2] == 3:
        return Image.fromarray(bgr[:, :, ::-1]).convert("RGB")
    return Image.fromarray(bgr).convert("RGB")


def infer(
    image_path: Union[str, Path],
    conf: float = 0.25,
    iou: float = 0.45,
    imgsz: int = 640,
    device: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Image.Image]:
    """
    Chạy model và trả:
      - preds: List[ {label: str, prob: float(0..1), box?: [x1,y1,x2,y2]} ]
      - annotated: PIL.Image (ảnh đã vẽ nếu là detection)
    """
    p = Path(image_path)
    if not p.exists():
        raise FileNotFoundError(str(p))

    model = _get_model()
    kind = _MODEL_KIND or "ultralytics"
    preds: List[Dict[str, Any]] = []

    if kind == "ultralytics":
        from ultralytics.engine.results import Results  # type: ignore

        results = model.predict(
            source=str(p),
            conf=conf,
            iou=iou,
            imgsz=imgsz,
            device=device or "cpu",  # ép CPU nếu không chắc CUDA
            verbose=False,
        )
        r: Results = results[0]
        # tên lớp
        names = getattr(model, "names", None) or getattr(r, "names", None) or {}

        # ===== Detection: có boxes → LẤY BBOX =====
        if getattr(r, "boxes", None) is not None and len(r.boxes) > 0:
            xyxy = r.boxes.xyxy.cpu().numpy()       # (N,4)
            confs = r.boxes.conf.cpu().numpy()      # (N,)
            clses = r.boxes.cls.cpu().numpy()       # (N,)
            for box, cf, cls in zip(xyxy, confs, clses):
                x1, y1, x2, y2 = [float(v) for v in box.tolist()]
                cls_id = int(cls)
                if isinstance(names, dict):
                    label = names.get(cls_id, str(cls_id))
                else:
                    # names có thể là list
                    label = names[cls_id] if isinstance(names, (list, tuple)) and cls_id < len(names) else str(cls_id)
                preds.append({"label": label, "prob": float(cf), "box": [x1, y1, x2, y2]})

        # ===== Classification: không có bbox → trả top-k label/prob =====
        elif getattr(r, "probs", None) is not None:
            # topk 5 nhãn
            tk = r.probs.topk(5)
            vals = tk.values.tolist()
            idxs = tk.indices.tolist()
            for v, i in zip(vals, idxs):
                cls_id = int(i)
                if isinstance(names, dict):
                    label = names.get(cls_id, str(cls_id))
                else:
                    label = names[cls_id] if isinstance(names, (list, tuple)) and cls_id < len(names) else str(cls_id)
                preds.append({"label": label, "prob": float(v)})

        # annotated từ Ultralytics (đã vẽ nếu có boxes)
        annotated_nd = r.plot()  # ndarray BGR
        annotated_pil = _bgr_ndarray_to_pil(annotated_nd)

    else:
        # ===== YOLOv5 hub =====
        # cấu hình
        try:
            model.conf = conf
            model.iou = iou
        except Exception:
            pass

        results = model(str(p), size=imgsz)
        names = getattr(model, "names", {})

        # Detection
        if hasattr(results, "xyxy") and len(results.xyxy) and results.xyxy[0] is not None:
            for *xyxy_vals, confv, cls_id in results.xyxy[0].tolist():
                x1, y1, x2, y2 = [float(x) for x in xyxy_vals]
                label = names[int(cls_id)] if isinstance(names, dict) else str(int(cls_id))
                preds.append({"label": label, "prob": float(confv), "box": [x1, y1, x2, y2]})
        # (YOLOv5 hub classification support hạn chế; bỏ qua)

        # annotated
        ann_list = results.render()  # list BGR ndarray
        annotated_pil = _bgr_ndarray_to_pil(ann_list[0])

    # Sắp xếp theo xác suất giảm dần
    preds.sort(key=lambda x: x.get("prob", 0.0), reverse=True)
    return preds, annotated_pil
