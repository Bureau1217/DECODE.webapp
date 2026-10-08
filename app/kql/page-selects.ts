/**
 * KQL `select` maps for each Kirby page template defined in
 * DECODE.cms/site/blueprints/pages/*.yml, used by app/pages/guide/**,
 * app/pages/resources/**, and the other section routes.
 *
 * First pass built by reading the blueprints — verify against real
 * content as it gets added. Things worth re-checking:
 *  - `content` (default template) is a `blocks` field (fieldsets:
 *    citation, cta, gallery, resources, text — see
 *    DECODE.cms/site/blueprints/blocks/*.yml). `toBlocks().toArray()` gives
 *    raw block data; image/page relations *inside* a block still need
 *    resolving per block type on top of this.
 *  - `url` (tool/tools) collides with Kirby's native Page::url() — reached
 *    here via `page.content.url` (Content::get) instead of `page.url`.
 *  - `about`'s own `teams` field (site/blueprints/pages/about.yml) isn't
 *    selected/rendered yet — TemplateAbout.vue doesn't show it.
 */

// `id` is the full root-relative path (e.g. `parent/child` for a nested
// `default` page) — needed for links into trees that can nest; `slug` is
// just the leaf segment, fine for non-nestable templates (tool, tag, …).
const summary = {
  title: true,
  slug: true,
  id: true,
}

// Reached via `page.content.<field>` (Content::get), never `page.<field>` —
// Page has core methods named `image`, `url`, `files`, `title`, etc., and a
// same-named content field silently resolves to those instead (e.g.
// `page.image` hits Page::image() — the first *uploaded file* — not a
// content field called `image`; with no files that's `null`, and
// `.toFile` on it is a hard KQL error, not an empty result).

/** A single-file relation field, resolved to its public URL. */
const fileUrl = (field: string) => ({
  query: `page.content.${field}.toFile`,
  select: { url: true, alt: true },
})

/** A multi-file relation field, resolved to public URLs. */
const filesUrls = (field: string) => ({
  query: `page.content.${field}.toFiles`,
  select: { url: true, alt: true },
})

/** A `pages` relation field (editor-picked links, not structural children). */
const pagesRelation = (field: string) => ({
  query: `page.content.${field}.toPages`,
  select: summary,
})

/** A single-file relation field, resolved for a downloadable link (e.g. a PDF). */
const fileLink = (field: string) => ({
  query: `page.content.${field}.toFile`,
  select: { url: true, filename: true },
})

export const pageSelects: Record<string, Record<string, unknown>> = {
  default: {
    ...summary,
    header_subtitle: true,
    header_image: fileUrl('header_image'),
    page_image_preview: fileUrl('page_image_preview'),
    content: 'page.content.content.toBlocks.toArray',
    // Structural children (template: default), not a relation field.
    subpages: {
      query: "page.children.filterBy('intendedTemplate', 'default')",
      select: summary,
    },
    // `themes`/`concepts`/`platforms`/`questions`/`tools` are `pages`
    // fields — the editor picks from a candidate list, so resolve the
    // stored picks with `toPages`, not re-run the picker's own candidate
    // query. Together, themes/concepts/platforms/questions are the site's
    // "Keywords" taxonomy (four parallel root tag pools, not nested).
    themes: pagesRelation('themes'),
    concepts: pagesRelation('concepts'),
    platforms: pagesRelation('platforms'),
    questions: pagesRelation('questions'),
    tools: pagesRelation('tools'),
  },

  ressources: {
    ...summary,
    ressources: {
      query: 'page.children',
      select: { ...summary, subtitle: true, description: true },
    },
  },

  ressource: {
    ...summary,
    subtitle: true,
    authors: true,
    source: true,
    description: true,
    file: fileLink('file'),
    // Same "type" trick as resources/index.vue's flattened list — the CMS
    // has no separate type field, the parent theme page's own title
    // (Articles/Papers/Podcasts/Videos) doubles as it.
    type: 'page.parent.title',
  },

  tags: {
    ...summary,
    tags: {
      query: 'page.children',
      select: { ...summary, description: true, image: filesUrls('image') },
    },
  },

  tag: {
    ...summary,
    description: true,
    image: filesUrls('image'),
  },

  tools: {
    ...summary,
    tools: {
      query: 'page.children',
      select: {
        ...summary,
        subtitle: true,
        description: true,
        image: fileUrl('image'),
        url: 'page.content.url.value',
        themes: pagesRelation('themes'),
        concepts: pagesRelation('concepts'),
        platforms: pagesRelation('platforms'),
        questions: pagesRelation('questions'),
      },
    },
  },

  tool: {
    ...summary,
    subtitle: true,
    description: true,
    image: fileUrl('image'),
    url: 'page.content.url.value',
    themes: pagesRelation('themes'),
    concepts: pagesRelation('concepts'),
    platforms: pagesRelation('platforms'),
    questions: pagesRelation('questions'),
  },

  site_infos: {
    ...summary,
    // `true` on a `structure` field returns its raw, unparsed YAML string
    // — `.toStructure` resolves it into actual row objects.
    sentences: 'page.content.sentences.toStructure',
    header_subtitle: true,
    long_description: true,
    informations: true,
  },

  about: {
    ...summary,
    header_subtitle: true,
    // No header_image — TemplateAbout.vue doesn't show a cover image.
    // Each paragraph_N_content is its own `blocks` field (same shape as
    // `default`'s own `content` — see this file's header comment) — only
    // `text` blocks are rendered (TemplateAbout.vue), same scope boundary
    // as TemplateDefault.vue; paragraph_1_content's own `image` block
    // isn't resolved/shown yet.
    paragraph_1_title: true,
    paragraph_1_content: 'page.content.paragraph_1_content.toBlocks.toArray',
    paragraph_2_title: true,
    paragraph_2_content: 'page.content.paragraph_2_content.toBlocks.toArray',
    paragraph_3_title: true,
    paragraph_3_content: 'page.content.paragraph_3_content.toBlocks.toArray',
  },
}

/**
 * Used when a page's `intendedTemplate` has no entry above.
 */
export const fallbackSelect: Record<string, unknown> = {
  ...summary,
}
