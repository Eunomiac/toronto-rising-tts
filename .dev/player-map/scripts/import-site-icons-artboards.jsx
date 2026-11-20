#target illustrator

/* Open the SVGs yourself, then activate a blank Untitled document containing
 * one 24 x 24 artboard. Run File > Scripts > Other Script and select this file.
 * Imports OPEN SVG documents only. Never opens, closes or saves any document.
 * Uses the clipboard. Exact filenames, including .svg, become all three names.
 */
(function () {
    var SIZE = 24;
    var GAP = 12;
    var COLUMNS = 8;
    var destination = app.documents.length ? app.activeDocument : null;
    var sources = [];
    var completed = 0;
    var currentName = "";
    var step = "checking the open documents";
    var logFile = new File(Folder.temp + "/toronto-rising-icon-import.log");

    function isUntitled(doc) { return /^Untitled(?:[ -]\d+)?$/i.test(doc.name); }
    function report(message) {
        step = message;
        if (!logFile.open("a")) throw new Error("Cannot write progress log: " + logFile.fsName);
        logFile.writeln(currentName + ": " + message);
        logFile.close();
    }

    // Snapshot before switching documents; ignore unrelated AI/PDF documents.
    for (var i = 0; i < app.documents.length; i++) {
        if (/\.svg$/i.test(app.documents[i].name)) sources.push(app.documents[i]);
    }
    if (!destination || !isUntitled(destination)) {
        alert("Activate your empty Untitled document, then run this script again.\nLeave your SVG documents open.");
        return;
    }
    if (destination.artboards.length !== 1 || destination.pageItems.length !== 0 || destination.layers.length !== 1) {
        alert("The destination must be an empty Untitled document with one artboard and one layer.");
        return;
    }
    if (!sources.length || sources.length > 1000) {
        alert("Please open between 1 and 1,000 SVG documents first.");
        return;
    }
    sources.sort(function (a, b) {
        var left = a.name.toLowerCase(), right = b.name.toLowerCase();
        return left < right ? -1 : left > right ? 1 : 0;
    });
    for (var n = 1; n < sources.length; n++) {
        if (sources[n].name === sources[n - 1].name) {
            alert("Two open SVG documents share the name " + sources[n].name + ". Close one before importing.");
            return;
        }
    }

    function collectPaths(container, paths) {
        var items = container.pageItems;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.parent !== container) continue;
            if (item.hidden || item.locked || item.opacity !== 100) throw new Error("Hidden, locked or translucent artwork requires manual handling.");
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
            } else throw new Error("Expected vector paths; found " + item.typename);
        }
    }

    function sameColor(a, b) {
        if (a.typename !== b.typename) return false;
        var fields;
        if (a.typename === "RGBColor") fields = ["red", "green", "blue"];
        else if (a.typename === "GrayColor") fields = ["gray"];
        else if (a.typename === "CMYKColor") fields = ["cyan", "magenta", "yellow", "black"];
        else return false;
        for (var i = 0; i < fields.length; i++) if (a[fields[i]] !== b[fields[i]]) return false;
        return true;
    }

    try {
        report("starting import from open documents");
        var origin = destination.artboards[0].artboardRect;
        var left = origin[0], top = origin[1];
        for (var index = 0; index < sources.length; index++) {
            var source = sources[index];
            currentName = source.name;
            report("selecting the source artwork");
            app.activeDocument = source;
            var previousSelection = source.selection;
            source.selection = null;
            source.selectObjectsOnActiveArtboard();
            if (!source.selection || !source.selection.length) throw new Error("No selectable artwork in the source SVG.");
            report("copying the source artwork");
            app.copy();
            source.selection = previousSelection;

            app.activeDocument = destination;
            report("creating the artboard and layer");
            var x = left + (index % COLUMNS) * (SIZE + GAP);
            var y = top - Math.floor(index / COLUMNS) * (SIZE + GAP);
            var rect = [x, y, x + SIZE, y - SIZE];
            var board = index === 0 ? destination.artboards[0] : destination.artboards.add(rect);
            board.artboardRect = rect;
            board.name = currentName;
            var layer = index === 0 ? destination.layers[0] : destination.layers.add();
            layer.name = currentName;
            destination.activeLayer = layer;
            destination.artboards.setActiveArtboardIndex(index);
            destination.selection = null;

            // Identify layers created by Paste Remembers Layers, so empty ones
            // can be removed after moving the pasted artwork to its named layer.
            var oldLayers = [];
            for (var li = 0; li < destination.layers.length; li++) oldLayers.push(destination.layers[li]);
            report("pasting the artwork");
            app.paste();
            if (!destination.selection || !destination.selection.length) throw new Error("Illustrator pasted no artwork.");
            var pasted = [];
            for (var si = 0; si < destination.selection.length; si++) pasted.push(destination.selection[si]);
            for (var mi = 0; mi < pasted.length; mi++) {
                if (pasted[mi].parent !== layer) pasted[mi].move(layer, ElementPlacement.PLACEATEND);
            }
            destination.selection = null;
            for (var dl = destination.layers.length - 1; dl >= 0; dl--) {
                var candidate = destination.layers[dl], existed = false;
                for (var ol = 0; ol < oldLayers.length; ol++) if (candidate === oldLayers[ol]) existed = true;
                if (!existed && candidate.pageItems.length === 0 && candidate.layers.length === 0) candidate.remove();
            }

            report("reading the pasted paths");
            var roots = [];
            for (var ri = 0; ri < layer.pageItems.length; ri++) {
                if (layer.pageItems[ri].parent === layer) roots.push(layer.pageItems[ri]);
            }
            var paths = [];
            collectPaths(layer, paths);
            if (!paths.length) throw new Error("No visible vector paths found.");
            if (paths.length > 1) {
                for (var pi = 0; pi < paths.length; pi++) {
                    if (!paths[pi].filled || paths[pi].stroked ||
                        !sameColor(paths[0].fillColor, paths[pi].fillColor) ||
                        paths[pi].evenodd !== paths[0].evenodd) {
                        throw new Error("A compound path requires matching solid fills and fill rules, without strokes.");
                    }
                }
            }

            report("building the named vector object");
            var artwork;
            if (paths.length > 1) {
                artwork = layer.compoundPathItems.add();
                for (var p = 0; p < paths.length; p++) paths[p].duplicate(artwork, ElementPlacement.PLACEATEND);
            } else artwork = paths[0].duplicate(layer, ElementPlacement.PLACEATEND);
            artwork.name = currentName;
            for (var r = 0; r < roots.length; r++) roots[r].remove();

            report("centering the artwork");
            var bounds = artwork.geometricBounds;
            var width = bounds[2] - bounds[0], height = bounds[1] - bounds[3];
            if (width <= 0 || height <= 0) throw new Error("Artwork has empty bounds.");
            // Preserve imported size unless it exceeds the 24 x 24 artboard.
            if (Math.max(width, height) > SIZE) {
                var scale = 100 * SIZE / Math.max(width, height);
                artwork.resize(scale, scale);
                bounds = artwork.geometricBounds;
            }
            artwork.translate(x + SIZE / 2 - (bounds[0] + bounds[2]) / 2,
                y - SIZE / 2 - (bounds[1] + bounds[3]) / 2);
            completed++;
            report("finished icon " + completed + " of " + sources.length);
        }
        destination.selection = null;
        destination.artboards.setActiveArtboardIndex(0);
        destination.views[0].centerPoint = [left + SIZE / 2, top - SIZE / 2];
        destination.views[0].zoom = 8;
        app.redraw();
        alert("Imported " + completed + " icons. Each object, layer and 24 x 24 artboard uses its SVG filename.\n\nAll source documents remain open. Save the destination as an .ai file when ready.");
    } catch (error) {
        app.activeDocument = destination;
        alert("Stopped at " + currentName + " while " + step + ":\n" + error.message +
            (error.line ? "\nScript line: " + error.line : "") +
            "\n\nCompleted icons: " + completed + ". The partial import remains in Untitled. Source artwork has not been changed." +
            "\n\nProgress log: " + logFile.fsName);
    }
}());
