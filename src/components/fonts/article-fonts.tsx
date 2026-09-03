import { customFontStylesheets, FONT_FILE_ORIGIN, resolveArticleFonts } from "@/lib/fonts/css";
import type { SiteFont } from "@/lib/fonts/types";

/**
 * Loads exactly the webfonts one article needs — nothing more.
 *
 * Performance contract:
 *   - An article that uses only system fonts renders **zero** font requests.
 *   - Google families arrive as one CSS2 request with `display=swap`, so text
 *     paints immediately in the fallback and swaps when the file lands.
 *   - `preconnect` to the font-file origin overlaps DNS/TLS with the CSS fetch.
 *
 * `precedence` lets React 19 hoist these into `<head>` and de-duplicate them
 * even though they are rendered deep inside the page tree.
 */
export function ArticleFonts({
  families,
  library,
}: {
  families: string[];
  library: SiteFont[];
}) {
  const { googleCssUrl, customCss, customStylesheets, needsPreconnect } =
    resolveArticleFonts(families, library);

  if (!googleCssUrl && !customCss && !customStylesheets.length) return null;

  return (
    <>
      {needsPreconnect && (
        <>
          <link rel="preconnect" href={FONT_FILE_ORIGIN} crossOrigin="anonymous" />
        </>
      )}

      {googleCssUrl && (
        <link rel="stylesheet" href={googleCssUrl} precedence="article-fonts" />
      )}

      {customStylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="article-fonts" />
      ))}

      {customCss && (
        <style
          href="article-custom-fonts"
          precedence="article-fonts"
          // Server-generated from URL-validated, family-escaped library rows —
          // no author-supplied HTML or CSS reaches this string.
          dangerouslySetInnerHTML={{ __html: customCss }}
        />
      )}
    </>
  );
}

/**
 * Same job, but for the whole library rather than one article: the editor needs
 * every family available so the picker can preview them.
 *
 * Only used inside /admin, which is `noindex` and behind auth, so the extra
 * bytes never touch a public page.
 */
export function EditorFonts({ library }: { library: SiteFont[] }) {
  const google = library.filter((f) => f.source === "google");
  const custom = library.filter((f) => f.source === "custom");

  const { googleCssUrl, customCss } = resolveArticleFonts(
    library.map((f) => f.family),
    library,
  );

  if (!google.length && !custom.length) return null;

  return (
    <>
      {googleCssUrl && (
        <>
          <link rel="preconnect" href={FONT_FILE_ORIGIN} crossOrigin="anonymous" />
          <link rel="stylesheet" href={googleCssUrl} precedence="editor-fonts" />
        </>
      )}

      {customFontStylesheets(custom).map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="editor-fonts" />
      ))}

      {customCss && (
        <style
          href="editor-custom-fonts"
          precedence="editor-fonts"
          dangerouslySetInnerHTML={{ __html: customCss }}
        />
      )}
    </>
  );
}
