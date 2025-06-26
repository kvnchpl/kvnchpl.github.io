import os
from PIL import Image
from io import BytesIO

def get_format_and_save_kwargs(ext):
    ext = ext.lower()
    if ext == '.gif':
        image_format = 'GIF'
        save_kwargs = {"save_all": True, "optimize": True}
        return image_format, save_kwargs
    else:
        return None, None

def compress_image_to_target_size(input_path, output_path, target_kb, tolerance=5):
    target_bytes = target_kb * 1024
    image = Image.open(input_path)
    ext = os.path.splitext(output_path)[1].lower()

    if ext != '.gif':
        print("Unsupported format. Only GIF is supported.")
        return

    image_format, save_kwargs = get_format_and_save_kwargs(ext)
    if image_format is None:
        print("Unsupported format.")
        return

    # Ensure image is in palette mode for GIF
    if image.mode != "P":
        image = image.convert("P", palette=Image.ADAPTIVE)

    buffer = BytesIO()
    image.save(buffer, format=image_format, **save_kwargs)
    size = buffer.tell()

    with open(output_path, "wb") as f:
        f.write(buffer.getvalue())

    if size <= target_bytes + tolerance * 1024:
        print(f"✅ Compressed GIF saved to {output_path} ({size / 1024:.2f} KB)")
    else:
        print(f"⚠️ Compressed GIF saved to {output_path} but size is {size / 1024:.2f} KB which is larger than target {target_kb} KB")

# Example usage:
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Compress a GIF image to a target file size using optimization.")
    parser.add_argument("input", help="Input GIF image path")
    parser.add_argument("output", help="Output GIF image path")
    parser.add_argument("--target-kb", type=int, required=True, help="Target size in kilobytes")

    args = parser.parse_args()

    compress_image_to_target_size(args.input, args.output, args.target_kb)