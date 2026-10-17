// Files in /public are served from the site root locally but from /glass2go on GitHub Pages.
// Anything fetched or put in an <img> by hand goes through here; <Link> and next/* handle the base path themselves.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (path: string) => `${BASE_PATH}${path}`;

/** True on the static GitHub Pages build, where there is no server for the live question generator. */
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC === "1";
