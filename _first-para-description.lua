--[[
  Fill in `description` from the post's opening prose when the document doesn't
  set one, so link-preview cards (og:description / twitter:description) carry a
  real summary instead of the site-wide fallback. Quarto derives og:image from
  the first image on its own, but never reads the body for the text.

  Skips documents that already declare `description` or `subtitle` — both feed
  og:description, so an explicit one always wins.
]]

local LIMIT = 200      -- characters; scrapers truncate around here anyway
local MIN   = 40       -- ignore short leading lines (captions, one-word intros)

local function truncate(s)
  if #s <= LIMIT then return s end
  local cut = s:sub(1, LIMIT)
  -- back off to the last word boundary so we don't slice mid-word
  local trimmed = cut:gsub("%s+%S*$", "")
  if #trimmed < MIN then trimmed = cut end
  return trimmed .. "…"
end

-- Walks nested blocks too: posts often open with an image, a callout div, or a
-- pull quote, and the first real prose sits inside one of those rather than at
-- the top level. gramsci-of-life opens on a blockquote, which is a fine summary.
local function first_prose(blocks)
  for _, block in ipairs(blocks) do
    if block.t == "Para" or block.t == "Plain" then
      local text = pandoc.utils.stringify(block)
      text = text:gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", "")
      -- a paragraph holding only an image stringifies to its alt text (or ""),
      -- which is why the length floor matters more than a type check.
      -- A lone URL clears the length floor but makes a useless summary — the
      -- generative-art posts open on a bare Bluesky link.
      local is_bare_url = text:match("^https?://%S*$") ~= nil
      -- The generative-art posts (in-our-thousands, freedom-and-proscription)
      -- have no markdown body at all — the sketch lives in the frontmatter — and
      -- Quarto folds the page footer into the AST of such empty documents. Without
      -- this they'd advertise "Built with Quarto… CC BY-SA" as their summary.
      local is_site_footer = text:match("License: CC BY%-SA") ~= nil
      if #text >= MIN and not is_bare_url and not is_site_footer then
        return text
      end
    elseif block.content and type(block.content) == "table" then
      local found = first_prose(block.content)
      if found then return found end
    end
  end
  return nil
end

function Pandoc(doc)
  if doc.meta.description or doc.meta.subtitle then return nil end
  -- Listing pages (blog.qmd) have no prose of their own; their first "paragraph"
  -- is the generated table, so they'd advertise the newest post's title as the
  -- whole blog's summary. Let the site-level description stand instead.
  if doc.meta.listing then return nil end

  local text = first_prose(doc.blocks)
  if text then
    doc.meta.description = pandoc.MetaString(truncate(text))
    return doc
  end
end
