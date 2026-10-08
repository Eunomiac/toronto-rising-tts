import type { ApplyCommand, SheetSnapshot } from "./types.js";

export type ApplyQueue = {
  enqueue: (command: ApplyCommand) => void;
  get pending(): number;
};

type Options = {
  send: (commands: readonly ApplyCommand[]) => Promise<SheetSnapshot>;
  onSettled: (snapshot: SheetSnapshot) => void;
  onFailure: (error: Error) => void;
  onPendingChange: (pending: number) => void;
};

/**
 * Serial TTS apply queue. Callers paint locally first; this only talks to Tabletop Simulator.
 * While a send is in flight, later clicks accumulate. The next send flushes the whole waiting
 * list in one round-trip so three rapid Health clicks become at most two TTS calls, not three.
 */
export const createApplyQueue = (options: Options): ApplyQueue => {
  const waiting: ApplyCommand[] = [];
  let running = false;

  const pendingCount = (): number => waiting.length + (running ? 1 : 0);

  const notify = (): void => {
    options.onPendingChange(pendingCount());
  };

  const failAndClear = (error: Error): void => {
    waiting.length = 0;
    running = false;
    notify();
    options.onFailure(error);
  };

  const drain = async (): Promise<void> => {
    if (running) {
      return;
    }
    running = true;
    notify();
    try {
      while (waiting.length > 0) {
        const batch = waiting.splice(0, waiting.length);
        notify();
        const snapshot = await options.send(batch);
        if (!snapshot.ok) {
          failAndClear(new Error(snapshot.error ?? "Apply failed."));
          return;
        }
        if (waiting.length === 0) {
          options.onSettled(snapshot);
        }
      }
    } catch (error: unknown) {
      failAndClear(error instanceof Error ? error : new Error(String(error)));
      return;
    } finally {
      if (running) {
        running = false;
        notify();
      }
    }
    if (waiting.length > 0) {
      void drain();
    }
  };

  return {
    enqueue(command: ApplyCommand): void {
      waiting.push(command);
      notify();
      void drain();
    },
    get pending() {
      return pendingCount();
    }
  };
};
