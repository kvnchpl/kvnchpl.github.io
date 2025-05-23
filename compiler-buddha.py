import numpy as np
from PIL import Image
import random
import argparse

with open(__file__, "r", encoding="utf-8") as self:
    intention = "".join(self.read().split())


def revisualize(where_is_the_vision, threshold, attention, frame):
    vision = Image.open(where_is_the_vision)

    expansion = 1.3
    clarity = attention / expansion
    reframe = (frame[0], int(frame[1] * clarity))
    vision = vision.resize(reframe, Image.Resampling.LANCZOS)

    vision_translated = vision.convert("L")

    perceivable = [
        intention[i : i + attention] for i in range(len(intention) - attention + 1)
    ]

    inattention = "." * attention
    glimpses_translated = np.array(vision_translated)
    depth, expanse = glimpses_translated.shape

    build = []
    random.seed()

    for d in range(depth):
        fragments = []
        for e in range(expanse):
            emergence = glimpses_translated[d, e]
            perceived = (
                random.choice(perceivable) if emergence >= threshold else inattention
            )
            fragments.append(perceived)
        schema = "/" + "/".join(fragments) + "/"
        build.append(schema)

    manifestation = "\n".join(build)

    moment = str(random.randint(0, 9999999999)).zfill(10)
    destination = f"manifestation_{moment}.txt"
    with open(destination, "w", encoding="utf-8") as scribe:
        scribe.write(manifestation)

    print(f"new manifestation: {moment}")
    return manifestation


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="rejoin samsara...")

    parser.add_argument(
        "--where_is_the_vision",
        type=str,
        default="vision.png",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=128,
    )
    parser.add_argument(
        "--attention",
        type=int,
        default=5,
    )
    parser.add_argument(
        "--frame",
        type=int,
        nargs=2,
        default=[100, 100],
        metavar=("DEPTH", "EXPANSE"),
    )

    args = parser.parse_args()

    revisualize(
        where_is_the_vision=args.where_is_the_vision,
        threshold=args.threshold,
        attention=args.attention,
        frame=args.frame,
    )