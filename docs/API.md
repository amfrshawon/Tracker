# API Reference (Foundation)

## `GET /api/workspaces`

Returns workspaces for the current authenticated user.

## `POST /api/workspaces`

Request body:

```json
{
  "name": "Engineering",
  "slug": "engineering",
  "description": "Core product workspace"
}
```

## `GET /api/projects?workspaceId=<workspace-id>`

Lists projects for a workspace (requires membership + `project:view`).

## `POST /api/projects`

Request body:

```json
{
  "workspaceId": "ck...",
  "name": "Website Revamp",
  "key": "WEB",
  "description": "Q2 initiative",
  "categoryId": null,
  "startDate": "2026-04-20T00:00:00.000Z",
  "dueDate": "2026-06-30T00:00:00.000Z",
  "color": "#3b82f6"
}
```

## `GET /api/health`

Returns health + DB connectivity status.
