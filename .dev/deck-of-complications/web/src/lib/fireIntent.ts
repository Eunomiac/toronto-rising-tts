import type { GameIntent } from "../protocol";
import { playSfx, unlockAudio } from "../audio/sfx";

export async function fireIntent(
  intent: GameIntent,
  onIntent: (i: GameIntent) => void,
) {
  await unlockAudio();
  switch (intent.op) {
    case "enhance":
      playSfx("enhance");
      break;
    case "negate":
      playSfx("negate");
      break;
    case "discard":
      playSfx("discard");
      break;
    case "stop":
      playSfx("stop");
      break;
    case "confirmEnd":
      playSfx("confirm");
      break;
    case "adjust":
      playSfx("tick");
      break;
    case "flip":
      playSfx("burn");
      break;
    default:
      break;
  }
  onIntent(intent);
}
