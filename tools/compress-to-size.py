import os
from PIL import Image
from io import BytesIO

def get_format_and_save_kwargs(ext, quality, min_quality, max_quality):
    ext = ext.lower()
    save_kwargs = {}
    image_format = None

    if ext in ['.jpg', '.jpeg']:
        image_format = 'JPEG'
        save_kwargs = {"quality": quality, "optimize": True}
    elif ext == '.webp':
        image_format = 'WEBP'
        save_kwargs = {"quality": quality}
    elif ext == '.png':
        image_format = 'PNG'
        compression_level = max(0, min(9, 9 - int((quality - min_quality) / (max_quality - min_quality) * 9)))
        save_kwargs = {"optimize": True, "compress_level": compression_level}
    elif ext == '.gif':
        image_format = 'GIF'
        save_kwargs = {}
    else:
        return None, None
    return image_format, save_kwargs

def compress_image_to_target_size(input_path, output_path, target_kb, tolerance=5, min_quality=5, max_quality=95, fixed_quality=None):
    target_bytes = target_kb * 1024
    image = Image.open(input_path)
    ext = os.path.splitext(output_path)[1].lower()

    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    if fixed_quality is not None:
        image_format, save_kwargs = get_format_and_save_kwargs(ext, fixed_quality, min_quality, max_quality)
        if image_format is None:
            print("Unsupported format.")
            return
        image.save(output_path, format=image_format, **save_kwargs)
        print(f"✅ Compressed with fixed quality={fixed_quality} to {output_path}")
        return

    low = min_quality
    high = max_quality
    best_quality = low
    best_result = None

    while low <= high:
        mid = (low + high) // 2
        image_format, save_kwargs = get_format_and_save_kwargs(ext, mid, min_quality, max_quality)
        if image_format is None:
            print("Unsupported format.")
            return

        if ext == '.gif' and mid < 50:
            low = mid + 1
            continue  # Skip low-quality attempts for GIF

        buffer = BytesIO()
        image.save(buffer, format=image_format, **save_kwargs)
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

    parser = argparse.ArgumentParser(description="Compress an image to a target file size or quality.")
    parser.add_argument("input", help="Input image path")
    parser.add_argument("output", help="Output image path")
    parser.add_argument("--target-kb", type=int, help="Target size in kilobytes")
    parser.add_argument("--quality", type=int, help="Fixed quality value (overrides target size)")

    args = parser.parse_args()

    if (args.quality is None) == (args.target_kb is None):
        parser.error("You must specify exactly one of --quality or --target-kb.")

    compress_image_to_target_size(args.input, args.output, args.target_kb or 0, fixed_quality=args.quality)