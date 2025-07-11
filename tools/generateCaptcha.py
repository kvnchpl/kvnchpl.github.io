import argparse
from captcha.image import ImageCaptcha

parser = argparse.ArgumentParser(description="Generate a CAPTCHA-style image from input text.")
parser.add_argument("text", help="The text to render into the CAPTCHA image")
parser.add_argument("-o", "--output", default="captcha.png", help="Output filename (default: captcha.png)")
parser.add_argument("--width", type=int, default=300, help="Width of the CAPTCHA image (default: 300)")
parser.add_argument("--height", type=int, default=100, help="Height of the CAPTCHA image (default: 100)")
parser.add_argument("--font", type=str, default="/System/Library/Fonts/Supplemental/Times New Roman.ttf", help="Font file to use (default: Times New Roman)")
parser.add_argument("--font-size", type=int, default=40, help="Font size to use (default: 40)")

args = parser.parse_args()

image = ImageCaptcha(
    width=args.width,
    height=args.height,
    fonts=[args.font],
    font_sizes=[args.font_size]
)

image.write(args.text, args.output)