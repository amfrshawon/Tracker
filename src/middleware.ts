export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/w/:path*", "/api/workspaces/:path*", "/api/projects/:path*"],
};
