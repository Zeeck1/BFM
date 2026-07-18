export async function runAdminSave(
  id: string,
  setSavingId: (value: string) => void,
  setError: (value: string) => void,
  save: () => Promise<void>,
  refresh: () => Promise<void>,
) {
  setSavingId(id);
  setError("");
  try {
    await save();
    await refresh();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Could not save change.");
  } finally {
    setSavingId("");
  }
}
