export type ApplyQueue<Command> = {
  enqueue: (command: Command) => void;
  get pending(): number;
};

/** Every TTS apply entry replies `{ ok, error? }`; the PCs tab's reply also carries the fresh sheet. */
export type ApplyReply = { readonly ok: boolean; readonly error?: string };

type Options<Command, Reply extends ApplyReply> = {
  send: (commands: readonly Command[]) => Promise<Reply>;
  onSettled: (reply: Reply) => void;
  onFailure: (error: Error) => void;
  onPendingChange: (pending: number) => void;
};

/**
 * Serial TTS apply queue. Callers paint locally first; this only talks to Tabletop Simulator.
 * While a send is in flight, later clicks accumulate. The next send flushes the whole waiting
 * list in one round-trip so three rapid Health clicks become at most two TTS calls, not three.
 */
export const createApplyQueue = <Command, Reply extends ApplyReply>(options: Options<Command, Reply>): ApplyQueue<Command> => {
  const waiting: Command[] = [];
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
        const reply = await options.send(batch);
        if (!reply.ok) {
          failAndClear(new Error(reply.error ?? "Apply failed."));
          return;
        }
        if (waiting.length === 0) {
          options.onSettled(reply);
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
    enqueue(command: Command): void {
      waiting.push(command);
      notify();
      void drain();
    },
    get pending() {
      return pendingCount();
    }
  };
};
