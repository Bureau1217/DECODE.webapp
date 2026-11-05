// A CMS `blocks` field's entry (only `text` blocks are rendered).
export interface ContentBlock {
  type: string
  isHidden?: boolean
  content?: { title?: string, text?: string }
}
