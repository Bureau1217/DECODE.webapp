// Shared by every article-card variant (GuideCard, and whatever the
// horizontal tools / resources cards end up being named) — one page's
// template (site/blueprints/pages/default.yml), so one shape.
export interface KeywordRef {
  id: string
}

// Just the site's 4 parallel keyword pools — what useArticleCardHighlight
// actually reads. Separate from Article (below) so a card whose content
// type isn't a full article (ResourceCard) can still use that composable
// without faking fields (header_image, slug, ...) it doesn't have.
export interface KeywordBearing {
  themes?: KeywordRef[]
  concepts?: KeywordRef[]
  platforms?: KeywordRef[]
  questions?: KeywordRef[]
}

export interface Article extends KeywordBearing {
  title: string
  slug: string
  id: string
  header_subtitle?: string
  header_image?: { url: string, alt?: string } | null
}
