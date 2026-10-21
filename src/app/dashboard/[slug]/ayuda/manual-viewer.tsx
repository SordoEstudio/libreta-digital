'use client'

import ReactMarkdown from 'react-markdown'

interface Props { content: string }

export default function ManualViewer({ content }: Props) {
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Manual no disponible.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="prose prose-sm prose-gray dark:prose-invert max-w-none
        [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mb-2
        [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:border-b [&_h2]:pb-2
        [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-2
        [&_p]:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-3
        [&_ul]:text-sm [&_ul]:text-muted-foreground [&_ul]:pl-5 [&_ul]:mb-3 [&_ul_li]:mb-1
        [&_ol]:text-sm [&_ol]:text-muted-foreground [&_ol]:pl-5 [&_ol]:mb-3 [&_ol_li]:mb-1
        [&_strong]:text-foreground [&_strong]:font-medium
        [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:my-3
        [&_hr]:border-border [&_hr]:my-6
        [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse
        [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:uppercase [&_th]:tracking-wide [&_th]:px-3 [&_th]:py-2 [&_th]:border-b [&_th]:border-border
        [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border/50 [&_td]:text-muted-foreground
        [&_tr:last-child_td]:border-0
        [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-foreground
      ">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
