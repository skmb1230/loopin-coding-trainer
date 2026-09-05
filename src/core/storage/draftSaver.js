/** Keep field failures separate and wait for edits queued while a save is running. */
export function createDraftSaver(write, onChange = () => {}) {
  const drafts = new Map();
  let tail = Promise.resolve();
  let pendingCount = 0;

  const status = () => {
    const unsaved = [...drafts.values()].filter((draft) => draft.savedVersion < draft.version);
    return { pendingCount, dirty: unsaved.length > 0, error: unsaved.find((draft) => draft.error)?.error || null };
  };

  const save = (store, key, value) => {
    const id = JSON.stringify([store, key]);
    const previous = drafts.get(id);
    const version = (previous?.version || 0) + 1;
    drafts.set(id, { store, key, value, version, savedVersion: previous?.savedVersion || 0, error: previous?.error || null });
    pendingCount += 1;
    onChange(status());
    const pending = tail.catch(() => {}).then(() => write(store, key, value)).then(() => {
      const draft = drafts.get(id);
      draft.savedVersion = version;
      draft.error = null;
    }, (error) => {
      drafts.get(id).error = error;
      throw error;
    }).finally(() => {
      pendingCount -= 1;
      onChange(status());
    });
    tail = pending;
    // Autosave callers may rely on status without awaiting each keystroke.
    pending.catch(() => {});
    return pending;
  };

  const waitForIdle = async () => {
    let observed;
    do {
      observed = tail;
      await observed.catch(() => {});
    } while (observed !== tail);
    const latest = status();
    if (latest.dirty) throw latest.error || new Error('아직 저장하지 못한 입력이 있습니다.');
  };

  const retryFailed = () => {
    const failed = [...drafts.values()].filter((draft) => draft.error && draft.savedVersion < draft.version);
    for (const draft of failed) save(draft.store, draft.key, draft.value);
  };

  return { save, status, waitForIdle, retryFailed };
}
