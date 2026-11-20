#target illustrator

/* Run in Illustrator: File > Scripts > Other Script.
 * Creates a NEW, unsaved document; source SVGs are never changed.
 * Defaults to ../public/assets/icons/sites relative to this script.
 * Names use the exact filename, including .svg.
 * Adjust these settings to change the artboard grid (Illustrator points).
 */
(function () {
    var SIZE = 96;
    var GAP = 24;
    var PADDING = 12;
    var COLUMNS = 8;
    var scriptFolder = new File($.fileName).parent;
    var folder = new Folder(scriptFolder + "/../public/assets/icons/sites");
    if (!folder.exists) folder = Folder.selectDialog("Select the folder containing your SVG icons");
    if (!folder) return;

    var files = folder.getFiles(function (file) {
        return file instanceof File && /\.svg$/i.test(file.name);
    });
    files.sort(function (a, b) {
        var left = a.name.toLowerCase(), right = b.name.toLowerCase();
        return left < right ? -1 : left > right ? 1 : 0;
    });
    if (!files.length) { alert("No SVG files found in " + folder.fsName); return; }
    if (files.length > 1000) { alert("Please use at most 1,000 SVG files per document."); return; }

    var destination = null;
    var completed = 0;
    var currentName = "";
    var step = "creating the document";
    var logFile = new File(Folder.temp + "/toronto-rising-icon-import.log");

    function report(message) {
        step = message;
        if (!logFile.open("a")) throw new Error("Cannot write import progress to " + logFile.fsName);
        logFile.writeln(currentName + ": " + message);
        logFile.close();
    }

    // Traverse direct children only, so compound subpaths are collected once.
    // Refuse artwork whose appearance would be lost by flattening to paths.
    function collectPaths(container, paths) {
        var items = container.pageItems;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.parent !== container) continue;
            if (item.hidden || item.locked || item.opacity !== 100) {
                throw new Error("Hidden, locked or translucent artwork requires manual handling.");
            }
            if (item.typename === "PathItem") {
                if (item.clipping || item.guides) throw new Error("Clipping paths or guides require manual handling.");
                if (item.filled || item.stroked) paths.push(item);
            } else if (item.typename === "CompoundPathItem") {
                for (var j = 0; j < item.pathItems.length; j++) {
                    if (item.pathItems[j].clipping) throw new Error("Clipping paths require manual handling.");
                    paths.push(item.pathItems[j]);
                }
            } else if (item.typename === "GroupItem") {
                if (item.clipped) throw new Error("Clipped groups require manual handling.");
                collectPaths(item, paths);
            } else {
                throw new Error("Unsupported artwork: " + item.typename + ". Expected vector paths.");
            }
        }
    }

    function sameColor(a, b) {
        if (a.typename !== b.typename) return false;
        var fields;
        if (a.typename === "RGBColor") fields = ["red", "green", "blue"];
        else if (a.typename === "GrayColor") fields = ["gray"];
        else if (a.typename === "CMYKColor") fields = ["cyan", "magenta", "yellow", "black"];
        else if (a.typename === "NoColor") return true;
        else return false;
        for (var i = 0; i < fields.length; i++) if (a[fields[i]] !== b[fields[i]]) return false;
        return true;
    }

    try {
        report("starting a new import");
        destination = app.documents.add(DocumentColorSpace.RGB, SIZE, SIZE);
        var firstLayer = destination.layers[0];
        for (var index = 0; index < files.length; index++) {
            currentName = File.decode(files[index].name);
            report("creating the artboard and layer");
            var x = (index % COLUMNS) * (SIZE + GAP);
            var y = -Math.floor(index / COLUMNS) * (SIZE + GAP);
            var rect = [x, y, x + SIZE, y - SIZE];
            var board;
            if (index === 0) {
                board = destination.artboards[0];
                board.artboardRect = rect;
            } else board = destination.artboards.add(rect);
            board.name = currentName;
            var layer = index === 0 ? firstLayer : destination.layers.add();
            layer.name = currentName;
            destination.activeLayer = layer;

            // Import in-place: no source document, cross-document copies, or
            // document close calls. embed() replaces the linked item with vectors.
            report("placing the SVG");
            var placed = layer.placedItems.add();
            placed.file = files[index];
            report("embedding the SVG as editable vectors");
            placed.embed();
            report("reading the embedded paths");
            var importedRoots = [];
            for (var ri = 0; ri < layer.pageItems.length; ri++) {
                if (layer.pageItems[ri].parent === layer) importedRoots.push(layer.pageItems[ri]);
            }
            var paths = [];
            collectPaths(layer, paths);
            if (!paths.length) throw new Error("No visible vector paths found.");
            // A compound path shares one appearance. Material icons are flat,
            // single-colour fills. Stop rather than silently recolour other SVGs.
            if (paths.length > 1) {
                for (var pi = 0; pi < paths.length; pi++) {
                    if (!paths[pi].filled || paths[pi].stroked ||
                        !sameColor(paths[0].fillColor, paths[pi].fillColor) ||
                        paths[pi].evenodd !== paths[0].evenodd) {
                        throw new Error("Multiple paths must have the same solid fill and fill rule, with no strokes.");
                    }
                }
            }

            report("building the named vector object");
            var artwork;
            if (paths.length > 1) {
                artwork = layer.compoundPathItems.add();
                for (var p = 0; p < paths.length; p++) {
                    paths[p].duplicate(artwork, ElementPlacement.PLACEATEND);
                }
            } else artwork = paths[0].duplicate(layer, ElementPlacement.PLACEATEND);
            artwork.name = currentName;
            // Snapshot above prevents iteration over a live collection while
            // duplicating/removing items. Keep only the new named object.
            report("removing the original import wrappers");
            for (var root = 0; root < importedRoots.length; root++) importedRoots[root].remove();

            report("sizing and centering the artwork");
            var bounds = artwork.geometricBounds;
            var width = bounds[2] - bounds[0];
            var height = bounds[1] - bounds[3];
            if (width <= 0 || height <= 0) throw new Error("Artwork has empty bounds.");
            var scale = 100 * (SIZE - 2 * PADDING) / Math.max(width, height);
            artwork.resize(scale, scale);
            bounds = artwork.geometricBounds;
            artwork.translate(x + SIZE / 2 - (bounds[0] + bounds[2]) / 2,
                y - SIZE / 2 - (bounds[1] + bounds[3]) / 2);
            completed++;
            report("finished icon " + completed + " of " + files.length);
        }
        destination.selection = null;
        destination.artboards.setActiveArtboardIndex(0);
        destination.views[0].centerPoint = [SIZE / 2, -SIZE / 2];
        destination.views[0].zoom = 2;
        app.redraw();
        alert("Imported " + completed + " icons, each with a named object, layer and artboard.\n\nNames include .svg. Artwork colours are preserved.\nUse File > Save As to save your new Illustrator document.");
    } catch (error) {
        if (destination) app.activeDocument = destination;
        alert("Stopped at " + currentName + " while " + step + ":\n" + error.message +
            (error.line ? "\nScript line: " + error.line : "") +
            "\n\nCompleted icons: " + completed + ". The partial document remains open for inspection. Source SVGs were not changed." +
            "\n\nProgress log: " + logFile.fsName);
    }
}());
