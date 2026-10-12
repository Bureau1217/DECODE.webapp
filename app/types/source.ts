// Shape of a rated source, as returned by the `tool` KQL select's
// `sources` relation (app/kql/page-selects.ts) — editors manage these as
// child pages of tools/source-reliability-plugin in the CMS (template:
// source, DECODE.cms/site/blueprints/pages/source.yml).
export interface Source {
  slug: string
  title: string
  source_domain: string
  source_type: string
  country_or_region: string
  topic_area: string
  trust_score_100: number
  trust_level: string
  trust_score_explanation?: string
  bias_notes?: string
  authority_sources?: string
}
