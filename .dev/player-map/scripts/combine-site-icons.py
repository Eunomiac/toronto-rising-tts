"""Combine site SVGs into a grid without changing their path data.

Run from anywhere: python <path-to-this-script>
Defaults: public/assets/icons/sites -> dev/site-icons-grid.svg.
Use --force to replace an existing output; source files are never changed.
"""

import argparse
import copy
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)


def positive(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("must be a finite positive number")
    return number


def main():
    project = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=project / "public/assets/icons/sites")
    parser.add_argument("--output", type=Path, default=project / "dev/site-icons-grid.svg")
    parser.add_argument("--columns", type=int, default=8)
    parser.add_argument("--size", type=positive, default=24)
    parser.add_argument("--gap", type=positive, default=12)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if args.columns <= 0:
        parser.error("--columns must be positive")
    output = args.output.resolve()
    if output.exists() and not args.force:
        parser.error(f"Output already exists: {output}. Use --force to replace it.")
    files = sorted((p for p in args.input.iterdir()
                    if p.is_file() and p.suffix.lower() == ".svg" and p.resolve() != output),
                   key=lambda p: p.name.lower())
    if not files:
        parser.error("No SVG files found")
    columns = min(args.columns, len(files))
    rows = math.ceil(len(files) / columns)
    margin = args.gap
    width = columns * args.size + (columns - 1) * args.gap + margin * 2
    height = rows * args.size + (rows - 1) * args.gap + margin * 2
    combined = ET.Element(f"{{{SVG}}}svg", {
        "width": f"{width:g}", "height": f"{height:g}",
        "viewBox": f"0 0 {width:g} {height:g}",
    })
    ET.SubElement(combined, f"{{{SVG}}}title").text = "Site icons"
    for index, file in enumerate(files):
        source = ET.parse(file).getroot()
        if source.tag != f"{{{SVG}}}svg":
            raise ValueError(f"Not an SVG document: {file}")
        if "viewBox" not in source.attrib:
            raise ValueError(f"Missing viewBox: {file}")
        viewbox = [float(v) for v in re.split(r"[\s,]+", source.attrib["viewBox"].strip())]
        if len(viewbox) != 4 or not all(math.isfinite(v) for v in viewbox) or min(viewbox[2:]) <= 0:
            raise ValueError(f"Invalid viewBox: {file}")
        x = margin + (index % columns) * (args.size + args.gap)
        y = margin + (index // columns) * (args.size + args.gap)
        group = ET.SubElement(combined, f"{{{SVG}}}g", {
            "id": f"icon-{index + 1:03d}-{file.stem}",
            "data-filename": file.name,
            "transform": f"translate({x:g} {y:g})",
        })
        ET.SubElement(group, f"{{{SVG}}}title").text = file.name
        # A nested viewport handles scaling and negative viewBox origins, while
        # retaining original fills, transforms, and every path's d attribute.
        icon = copy.deepcopy(source)
        icon.set("x", "0")
        icon.set("y", "0")
        icon.set("width", f"{args.size:g}")
        icon.set("height", f"{args.size:g}")
        # Scope internal IDs so gradients/masks in different icons cannot collide.
        ids = {e.attrib["id"]: f"icon-{index + 1:03d}-{e.attrib['id']}"
               for e in icon.iter() if "id" in e.attrib}
        for element in icon.iter():
            if "id" in element.attrib:
                element.set("id", ids[element.attrib["id"]])
            for key, value in list(element.attrib.items()):
                if key == "id" or key == "d":
                    continue
                value = re.sub(r"url\(\s*(['\"]?)#([^)'\"\s]+)\1\s*\)",
                               lambda m: f"url(#{ids.get(m[2], m[2])})", value)
                if key.endswith("href") and value.startswith("#"):
                    value = "#" + ids.get(value[1:], value[1:])
                element.set(key, value)
        group.append(icon)
    output.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(combined).write(output, encoding="utf-8", xml_declaration=True)
    print(f"Combined {len(files)} icons into {columns} columns x {rows} rows: {output}")


if __name__ == "__main__":
    main()
