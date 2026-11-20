#target illustrator

/* Select whole icon objects/groups, then run File > Scripts > Other Script.
 * Copies each selected object to a NEW 24 x 24 point artboard in this document.
 * Original artwork and artboards are retained. No files or clipboard are used.
 * Artwork keeps its size unless it exceeds 24 x 24, when it is scaled to fit.
 */
(function () {
    var SIZE = 24;
    var GAP = 12;
    var COLUMNS = 8;
    if (!app.documents.length) { alert("Open a document and select your icons first."); return; }
    var doc = app.activeDocument;
    var selection = doc.selection;
    if (!selection || !selection.length) { alert("Select the whole objects or groups you want to copy first."); return; }

    // Snapshot the selection before adding artwork to Illustrator's live lists.
    var objects = [];
    for (var i = 0; i < selection.length; i++) {
        var item = selection[i];
        if (!item.typename || item.typename === "TextRange" || !item.duplicate || !item.geometricBounds) {
            alert("Select whole objects with the Selection tool, rather than text or individual anchor points.");
            return;
        }
        if (item.typename === "PathItem" && item.selectedPathPoints &&
            item.selectedPathPoints.length !== item.pathPoints.length) {
            alert("Select whole paths or icon groups with the Selection tool first.");
            return;
        }
        objects.push(item);
    }
    if (doc.artboards.length + objects.length > 1000) {
        alert("This selection would exceed 1,000 artboards. Select fewer objects.");
        return;
    }

    var previousArtboard = doc.artboards.getActiveArtboardIndex();
    var previousLayer = doc.activeLayer;
    var completed = 0;
    var step = "checking the layout";
    var pendingBoard = null;
    var pendingLayer = null;
    try {
        // Place new boards below all existing boards AND artwork to keep the
        // duplicates away from the source grid, even if it extends off-canvas.
        var left = doc.artboards[0].artboardRect[0];
        var bottom = doc.artboards[0].artboardRect[3];
        for (var a = 0; a < doc.artboards.length; a++) {
            var rect = doc.artboards[a].artboardRect;
            left = Math.min(left, rect[0]);
            bottom = Math.min(bottom, rect[3]);
        }
        for (var p = 0; p < doc.pageItems.length; p++) {
            bottom = Math.min(bottom, doc.pageItems[p].geometricBounds[3]);
        }
        var top = bottom - GAP;
        doc.selection = null;
        for (var index = 0; index < objects.length; index++) {
            var source = objects[index];
            var name = source.name || ("Icon " + (index + 1));
            step = "creating the artboard for " + name;
            var x = left + (index % COLUMNS) * (SIZE + GAP);
            var y = top - Math.floor(index / COLUMNS) * (SIZE + GAP);
            pendingBoard = doc.artboards.add([x, y, x + SIZE, y - SIZE]);
            pendingBoard.name = name;
            pendingLayer = doc.layers.add();
            pendingLayer.name = name;
            doc.activeLayer = pendingLayer;
            step = "copying " + name;
            // Same-document duplication avoids document switching and SVG import.
            var copy = source.duplicate(pendingLayer, ElementPlacement.PLACEATEND);
            copy.name = name;
            var bounds = copy.geometricBounds;
            var width = bounds[2] - bounds[0], height = bounds[1] - bounds[3];
            if (Math.max(width, height) <= 0) throw new Error("The selected object has empty bounds.");
            step = "centering " + name;
            if (Math.max(width, height) > SIZE) {
                var scale = 100 * SIZE / Math.max(width, height);
                copy.resize(scale, scale);
                bounds = copy.geometricBounds;
            }
            copy.translate(x + SIZE / 2 - (bounds[0] + bounds[2]) / 2,
                y - SIZE / 2 - (bounds[1] + bounds[3]) / 2);
            completed++;
            pendingBoard = null;
            pendingLayer = null;
        }
        doc.selection = null;
        doc.activeLayer = previousLayer;
        doc.artboards.setActiveArtboardIndex(previousArtboard);
        app.redraw();
        alert("Copied " + completed + " selected objects onto new 24 x 24 artboards.\n\nThe copies, layers and artboards use the object names. Originals remain in place. New artboards are below the existing artwork.");
    } catch (error) {
        // Roll back only the unfinished icon; completed copies remain available.
        if (pendingLayer) pendingLayer.remove();
        if (pendingBoard) pendingBoard.remove();
        doc.activeLayer = previousLayer;
        doc.artboards.setActiveArtboardIndex(previousArtboard);
        alert("Stopped while " + step + ":\n" + error.message +
            (error.line ? "\nScript line: " + error.line : "") +
            "\n\nCompleted copies: " + completed + ". Original artwork remains in place.");
    }
}());
