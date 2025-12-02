# backend/app/services/image_optimizer.py
"""
Image optimization service - Convert images to WebP format
Reduces file size while maintaining quality
"""
import os
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image
from io import BytesIO

def convert_to_webp(
    image_path: str,
    quality: int = 85,
    max_width: Optional[int] = None,
    max_height: Optional[int] = None,
    output_path: Optional[str] = None
) -> Tuple[str, int]:
    """
    Convert image to WebP format with optional resizing
    
    Args:
        image_path: Path to input image file
        quality: WebP quality (1-100, default: 85)
        max_width: Maximum width for resizing (None = no resize)
        max_height: Maximum height for resizing (None = no resize)
        output_path: Output path (None = same directory with .webp extension)
    
    Returns:
        Tuple of (output_path, original_size, optimized_size)
    """
    try:
        # Open image
        with Image.open(image_path) as img:
            # Convert RGBA to RGB if needed (WebP supports RGBA but RGB is smaller)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize if needed
            original_size = img.size
            if max_width or max_height:
                img.thumbnail(
                    (max_width or 9999, max_height or 9999),
                    Image.Resampling.LANCZOS
                )
            
            # Generate output path
            if output_path is None:
                base_path = Path(image_path)
                output_path = str(base_path.with_suffix('.webp'))
            
            # Save as WebP
            img.save(
                output_path,
                'WEBP',
                quality=quality,
                method=6  # Best quality compression
            )
            
            # Get file sizes
            original_file_size = os.path.getsize(image_path)
            optimized_file_size = os.path.getsize(output_path)
            
            print(f"✅ Image optimized: {original_file_size / 1024:.2f}KB → {optimized_file_size / 1024:.2f}KB "
                  f"({(1 - optimized_file_size / original_file_size) * 100:.1f}% reduction)")
            
            return output_path, original_file_size, optimized_file_size
            
    except Exception as e:
        print(f"❌ Image optimization error: {e}")
        raise

def optimize_image_bytes(
    image_bytes: bytes,
    quality: int = 85,
    max_width: Optional[int] = None,
    max_height: Optional[int] = None
) -> bytes:
    """
    Optimize image bytes and return optimized WebP bytes
    
    Args:
        image_bytes: Original image bytes
        quality: WebP quality (1-100)
        max_width: Maximum width for resizing
        max_height: Maximum height for resizing
    
    Returns:
        Optimized WebP image bytes
    """
    try:
        # Open image from bytes
        img = Image.open(BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if needed
        if max_width or max_height:
            img.thumbnail(
                (max_width or 9999, max_height or 9999),
                Image.Resampling.LANCZOS
            )
        
        # Convert to WebP bytes
        output = BytesIO()
        img.save(
            output,
            'WEBP',
            quality=quality,
            method=6
        )
        output.seek(0)
        
        return output.read()
        
    except Exception as e:
        print(f"❌ Image bytes optimization error: {e}")
        raise

def should_optimize_image(image_path: str) -> bool:
    """
    Check if image should be optimized
    Returns True if image is large enough to benefit from optimization
    """
    try:
        # Check file size (optimize if > 100KB)
        file_size = os.path.getsize(image_path)
        if file_size < 100 * 1024:  # < 100KB
            return False
        
        # Check if already WebP
        if image_path.lower().endswith('.webp'):
            return False
        
        return True
    except Exception:
        return False

