const TYPE_KEY = 'snabbb.charting.workspaceType';
const OWNER_KEY = 'snabbb.charting.workspaceOwnerUserId';
export function captureWorkspaceFromUrl() {
  const url = new URL(window.location.href);
  const type = url.searchParams.get('workspace_type');
  if (type !== 'personal' && type !== 'company') return;
  const owner = url.searchParams.get('workspace_owner_id');
  sessionStorage.setItem(TYPE_KEY, type);
  if (type === 'company' && owner) sessionStorage.setItem(OWNER_KEY, owner);
  else sessionStorage.removeItem(OWNER_KEY);
  url.searchParams.delete('workspace_type');
  url.searchParams.delete('workspace_owner_id');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}
export function getWorkspaceSelection() {
  const type = sessionStorage.getItem(TYPE_KEY) === 'company' ? 'company' : 'personal';
  const owner = type === 'company' ? sessionStorage.getItem(OWNER_KEY) : null;
  if (type === 'company' && !owner) throw new Error('Select a company in Snabbb and reopen Dental Charting.');
  const headers: Record<string, string> = { 'X-Snabbb-Workspace-Type': type };
  if (owner) headers['X-Snabbb-Workspace-User-Id'] = owner;
  return { type, owner, key: type + ':' + (owner || ''), headers };
}
