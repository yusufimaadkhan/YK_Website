#!/usr/bin/env python3
"""
Copy each page's <meta name="description"> into og:description / twitter:description.

Why this exists: _first-para-description.lua derives a description from the post's
opening paragraph, but Quarto resolves social metadata from front-matter *before*
pandoc filters run, so the filter's value never reaches the og tags — they keep the
site-wide fallback from `website.description`. This runs after render and syncs them.

Only pages that actually have a page-level description are touched, so a post using
`subtitle:` (which Quarto already feeds into og:description) is left alone.
"""

import html
import pathlib
import re
import sys

SITE = pathlib.Path(__file__).parent / "_site"

PAGE_DESC = re.compile(r'<meta name="description" content="([^"]*)"')
OG_DESC = re.compile(r'(<meta property="og:description" content=")([^"]*)(")')
TW_DESC = re.compile(r'(<meta name="twitter:description" content=")([^"]*)(")')
OG_TITLE = re.compile(r'<meta property="og:title" content="[^"]*"\s*/?>')
TW_TITLE = re.compile(r'<meta name="twitter:title" content="[^"]*"\s*/?>')


_SITE_DESC = None   # cached; plain assignment keeps this valid on Python 3.9


def site_description() -> str:
    """The `website.description` from _quarto.yml, HTML-escaped, cached."""
    global _SITE_DESC
    if _SITE_DESC is None:
        config = (pathlib.Path(__file__).parent / "_quarto.yml").read_text(encoding="utf-8")
        found = re.search(r'^\s{2}description:\s*"([^"]*)"', config, re.M)
        _SITE_DESC = html.escape(found.group(1), quote=True) if found else ""
    return _SITE_DESC


def sync(doc: str, desc_re, title_re, new_tag: str, desc: str, force: bool) -> str:
    """Rewrite the description tag, or insert one after the title tag.

    Quarto only emits og:/twitter: description when front-matter supplied one, so
    on a post whose description comes from the filter there is no tag to rewrite —
    it has to be added next to the sibling title tag.

    `force` is true only when the page has its own description. Otherwise we are
    backfilling with the site description and must not clobber a real value —
    a post using `subtitle:` already has a good one that Quarto put there.
    """
    existing = desc_re.search(doc)
    if existing:
        if not force and existing.group(2).strip():
            return doc
        return desc_re.sub(lambda m: m.group(1) + desc + m.group(3), doc)
    anchor = title_re.search(doc)
    if anchor:
        return doc[: anchor.end()] + "\n" + new_tag + doc[anchor.end() :]
    return doc


def main() -> int:
    changed = 0
    for path in SITE.rglob("*.html"):
        try:
            doc = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue

        found = PAGE_DESC.search(doc)
        # No page-level description (listing pages, the prose-less art posts):
        # make sure the social tags at least carry the site description rather
        # than the empty string Quarto leaves behind.
        force = found is not None
        desc = found.group(1) if found else site_description()
        if not desc:
            continue
        # the page description is already HTML-escaped; compare on the decoded form
        # so we don't rewrite a tag that already matches
        if not html.unescape(desc).strip():
            continue

        updated = sync(doc, OG_DESC, OG_TITLE, f'<meta property="og:description" content="{desc}">', desc, force)
        updated = sync(updated, TW_DESC, TW_TITLE, f'<meta name="twitter:description" content="{desc}">', desc, force)

        if updated != doc:
            path.write_text(updated, encoding="utf-8")
            changed += 1

    print(f"[social-description] synced {changed} page(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
