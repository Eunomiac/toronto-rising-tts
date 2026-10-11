// Dump every text layer of the active Photoshop document (PSD / PSB).
//
// Run in Photoshop: File > Scripts > Browse... and pick this file, with the document open.
// Writes two UTF-8 files next to the document:
//   <name>.text-layers.txt   one readable block per text layer
//   <name>.text-layers.json  the same data for import scripts
// Each entry: running index (top of the Layers panel = 1), group path, layer name, visibility, text.
// Hidden layers and layers in hidden groups are included. A layer whose text cannot be read gets an
// "error" entry instead of being dropped.

#target photoshop

(function () {
    if (app.documents.length === 0) {
        alert("Open the document first, then run this script.");
        return;
    }
    var doc = app.activeDocument;
    var entries = [];

    function jsonString(value) {
        var out = '"';
        for (var i = 0; i < value.length; i++) {
            var ch = value.charAt(i);
            var code = value.charCodeAt(i);
            if (ch === '"') out += '\\"';
            else if (ch === "\\") out += "\\\\";
            else if (ch === "\n") out += "\\n";
            else if (ch === "\t") out += "\\t";
            else if (code < 32) out += "\\u" + ("0000" + code.toString(16)).slice(-4);
            else out += ch;
        }
        return out + '"';
    }

    function walk(container, path) {
        for (var i = 0; i < container.layers.length; i++) {
            var layer = container.layers[i];
            if (layer.typename === "LayerSet") {
                walk(layer, path.concat([layer.name]));
            } else if (layer.kind === LayerKind.TEXT) {
                var entry = { index: entries.length + 1, path: path.join(" / "), name: layer.name, visible: layer.visible };
                try {
                    entry.text = String(layer.textItem.contents).replace(/\r\n?|\u0003/g, "\n");
                } catch (e) {
                    entry.error = String(e);
                }
                entries.push(entry);
            }
        }
    }

    walk(doc, []);

    var base = doc.name.replace(/\.[^.]+$/, "");
    var folder = doc.path;

    var txt = [];
    for (var t = 0; t < entries.length; t++) {
        var en = entries[t];
        txt.push("#" + en.index + "  [" + (en.path || "(top level)") + "]  " + en.name + (en.visible ? "" : "  (hidden)"));
        txt.push(en.error ? "ERROR: " + en.error : en.text);
        txt.push("");
    }

    var json = ["["];
    for (var j = 0; j < entries.length; j++) {
        var e2 = entries[j];
        var fields = [
            '"index": ' + e2.index,
            '"path": ' + jsonString(e2.path),
            '"name": ' + jsonString(e2.name),
            '"visible": ' + (e2.visible ? "true" : "false"),
            e2.error ? '"error": ' + jsonString(e2.error) : '"text": ' + jsonString(e2.text)
        ];
        json.push("  {" + fields.join(", ") + "}" + (j < entries.length - 1 ? "," : ""));
    }
    json.push("]");

    function write(name, content) {
        var file = new File(folder + "/" + name);
        file.encoding = "UTF-8";
        file.lineFeed = "Unix";
        if (!file.open("w")) {
            throw new Error("Could not write " + file.fsName);
        }
        file.write(content);
        file.close();
        return file.fsName;
    }

    var txtPath = write(base + ".text-layers.txt", txt.join("\n"));
    var jsonPath = write(base + ".text-layers.json", json.join("\n") + "\n");

    var errors = 0;
    for (var k = 0; k < entries.length; k++) {
        if (entries[k].error) errors++;
    }
    alert(entries.length + " text layers written" + (errors ? " (" + errors + " could not be read)" : "") + ":\n" + txtPath + "\n" + jsonPath);
})();
