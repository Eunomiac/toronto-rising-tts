const fs = require("fs");
const path = "ui/storyteller/panel_pcs.xml";
let text = fs.readFileSync(path, "utf8");
const colors = ["Brown", "Orange", "Red", "Pink", "Purple"];
for (const c of colors) {
  const needle = `<Text class="pcs_char_title" id="pcs_charFullName_${c}">—</Text>`;
  if (!text.includes(needle)) {
    throw new Error("missing " + c);
  }
  if (text.includes(`pcs_desire_${c}`)) {
    console.log("skip", c);
    continue;
  }
  const insert =
    needle +
    `
        <HorizontalLayout class="pcs_stat_row">
          <Text class="pcs_prefix_wide">Desire:</Text>
          <Text class="pcs_desire_text" id="pcs_desire_${c}">—</Text>
          <Button class="pcs_btn pcs_btn_clear_52 pcs_btn_palette_hum_dark" id="pcs_${c}_desireClear" />
        </HorizontalLayout>`;
  text = text.replace(needle, insert);
  console.log("added", c);
}
fs.writeFileSync(path, text);
console.log("done");
