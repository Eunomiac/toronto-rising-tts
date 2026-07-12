# Regenerate project editor stake rows: advantage Dropdown -> Button + shared picker.
from pathlib import Path
import re

path = Path(__file__).resolve().parents[2] / "ui" / "storyteller" / "project_editor_modal.xml"
text = path.read_text(encoding="utf-8")
ADV = 20
ROWS = 8


def stake_row(r: int) -> str:
    active = "true" if r == 1 else "false"
    return f"""        <HorizontalLayout id="projectEditor_stakeRow_{r}" class="projectEditor_stake_row" active="{active}">
          <Dropdown id="projectEditor_stake_{r}_source" class="projectEditor_dropdown" preferredWidth="120" onValueChanged="HUD_projectStakeDropdown(selectedIndex)">
            <Option selected="true"> </Option>
            <Option>Lord Lucien</Option>
            <Option>Rashid</Option>
            <Option>Aishe</Option>
            <Option>Fomorach</Option>
            <Option>Black Caesar</Option>
            <Option>Coterie</Option>
          </Dropdown>
          <Button id="projectEditor_stake_{r}_advantage" class="projectEditor_adv_button" text="—" onClick="HUD_projectStakeAdvOpen" />
          <InputField id="projectEditor_stake_{r}_qty" class="projectEditor_integer_field" text="" />
        </HorizontalLayout>"""


pick_btns = []
for a in range(1, ADV + 1):
    nn = f"{a:02d}"
    pick_btns.append(
        f'          <Button id="projectEditor_advPick_{nn}" class="projectEditor_adv_pick_button" text="—" onClick="HUD_projectAdvPick" />'
    )

picker = (
    """        <Panel id="projectEditor_advPicker" class="projectEditor_adv_picker" active="false">
          <VerticalLayout class="projectEditor_adv_picker_list" spacing="2">
            <Text id="projectEditor_advPicker_title" class="projectEditor_text_wide" text="Select advantage" fontSize="12" color="#FFD700" />
"""
    + "\n".join(pick_btns)
    + """
            <Button id="projectEditor_advPick_cancel" class="projectEditor_cancel_button" preferredWidth="120" text="Close" onClick="HUD_projectAdvPickCancel" />
          </VerticalLayout>
        </Panel>"""
)

pat = re.compile(
    r'        <HorizontalLayout id="projectEditor_stakeRow_1".*?</HorizontalLayout>\n        <Text id="projectEditor_stakeValidation"',
    re.S,
)
rows = "\n".join(stake_row(r) for r in range(1, ROWS + 1))
replacement = rows + "\n" + picker + '\n        <Text id="projectEditor_stakeValidation"'
new_text, n = pat.subn(replacement, text, count=1)
if n != 1:
    raise SystemExit(f"failed to locate stake rows (n={n})")

if "projectEditor_adv_button" not in new_text:
    needle = '    <HorizontalLayout class="projectEditor_stake_row" spacing="6" preferredHeight="36" />'
    insert = """    <HorizontalLayout class="projectEditor_stake_row" spacing="6" preferredHeight="36" />

    <Button class="projectEditor_adv_button" preferredWidth="280" preferredHeight="32" fontSize="12" colors="#222222|#333333|#444444|#111111" textColor="#FFFFFF" textAlignment="MiddleLeft" />

    <Panel class="projectEditor_adv_picker" rectAlignment="MiddleCenter" width="420" height="420" color="rgba(0.02,0.02,0.05,0.98)" padding="8 8 8 8" />

    <VerticalLayout class="projectEditor_adv_picker_list" spacing="2" childForceExpandHeight="false" />

    <Button class="projectEditor_adv_pick_button" preferredHeight="28" fontSize="11" colors="#1a1a22|#2a2a33|#3a3a44|#111111" textColor="#FFFFFF" textAlignment="MiddleLeft" />"""
    new_text = new_text.replace(needle, insert, 1)

path.write_text(new_text, encoding="utf-8")
print("wrote", path)
