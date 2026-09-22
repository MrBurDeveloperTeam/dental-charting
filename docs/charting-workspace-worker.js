// Insert inside the main Worker's fetch handler, after corsHeaders is defined.
// Uses the existing Supabase Bearer authentication and workspace resolver helpers.
if (url.pathname === '/api/company/workspace-context' && request.method === 'GET') {
  try {
    const profile = await getProfileFromSupabaseBearer(env, request);
    if (!profile) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    const requested = getRequestedWorkspace(request);
    const workspace = await resolveWorkspaceContext(env, profile, requested.workspaceType, requested.companyOwnerUserId);
    return Response.json({
      ok: true, actorUserId: workspace.actorUserId,
      workspaceUserId: workspace.workspaceUserId,
      workspaceType: workspace.workspaceType,
      clinicId: workspace.clinicId,
      actorType: workspace.actorType, role: workspace.role,
    }, { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: error.status || 500, headers: corsHeaders });
  }
}
// Also include 'charting' in the existing workspace-forwarding condition in /sso/login.
// Allow origin https://charting.snabbb.com (no trailing slash) in main API CORS.
// Allow X-Snabbb-Workspace-Type and X-Snabbb-Workspace-User-Id request headers.
