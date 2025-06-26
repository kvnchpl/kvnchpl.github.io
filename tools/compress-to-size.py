import os
from PIL import Image
from io import BytesIO

def compress_image_to_target_size(input_path, output_path, target_kb, tolerance=5, min_quality=5, max_quality=95):
    target_bytes = target_kb * 1024
    image = Image.open(input_path)
    
    # Convert to RGB to avoid issues with PNGs or other formats
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    low = min_quality
    high = max_quality
    best_quality = low
    best_result = None

    ext = os.path.splitext(output_path)[1].lower()

    while low <= high:
        mid = (low + high) // 2
        buffer = BytesIO()

        format = None
        save_kwargs = {}

        if ext in ['.jpg', '.jpeg']:
            format = 'JPEG'
            save_kwargs = {"quality": mid, "optimize": True}
        elif ext == '.webp':
            format = 'WEBP'
            save_kwargs = {"quality": mid}
        elif ext == '.png':
            format = 'PNG'
            compression_level = max(0, min(9, 9 - int((mid - min_quality) / (max_quality - min_quality) * 9)))
            save_kwargs = {"optimize": True, "compress_level": compression_level}
        elif ext == '.gif':
            format = 'GIF'
            if mid < 50:
                low = mid + 1
                continue  # Skip low-quality attempts
            save_kwargs = {}
        else:
            print("Unsupported format.")
            return

        image.save(buffer, format=format, **save_kwargs)
        size = buffer.tell()

        if abs(size - target_bytes) <= tolerance * 1024:
            best_quality = mid
            best_result = buffer
            break
        elif size > target_bytes:
            high = mid - 1
        else:
            best_quality = mid
            best_result = buffer
            low = mid + 1

    if best_result:
        with open(output_path, "wb") as f:
            f.write(best_result.getvalue())
        print(f"✅ Compressed to {output_path} at quality={best_quality}")
    else:
        print("❌ Couldn't compress to the desired size.")

# Example usage:
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Compress an image to a target file size.")
    parser.add_argument("input", help="Input image path")
    parser.add_argument("output", help="Output image path")
    parser.add_argument("target_kb", type=int, help="Target size in kilobytes")

    args = parser.parse_args()
    compress_image_to_target_size(args.input, args.output, args.target_kb)