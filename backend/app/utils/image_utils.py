# 
from pathlib import Path
import uuid
import cv2
import numpy as np
from werkzeug.utils import secure_filename

def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)

def safe_filename(original: str) -> str:
    name = secure_filename(original)
    ext = Path(name).suffix or ".jpg"
    return f"{uuid.uuid4().hex[:12]}{ext}"

def resize_inplace(image_path: Path, max_size: int = 1024) -> None:
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError("Không đọc được ảnh.")
    h, w = img.shape[:2]
    m = max(h, w)
    if m > max_size:
        scale = max_size / float(m)
        new_w, new_h = int(w*scale), int(h*scale)
        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(image_path), resized)

def annotate_bboxes(image_bgr: np.ndarray, boxes, labels, confs, names) -> np.ndarray:
    out = image_bgr.copy()
    for i, b in enumerate(boxes):
        x1,y1,x2,y2 = map(int, b)
        label = names[int(labels[i])]
        conf = float(confs[i])
        cv2.rectangle(out, (x1,y1), (x2,y2), (0,255,0), 2)
        cv2.putText(out, f"{label} {conf:.2f}", (x1, max(y1-8, 12)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,255,0), 2, lineType=cv2.LINE_AA)
    if len(boxes) == 0:
        cv2.putText(out, "No findings", (18, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
    return out

def save_image(image_bgr: np.ndarray, out_path: Path) -> None:
    ensure_dir(out_path.parent)
    cv2.imwrite(str(out_path), image_bgr)
