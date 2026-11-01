import Markdown, { type Components } from "react-markdown";

const components: Components = {
  h2: ({ children }) => <h4 className="mb-2 mt-7 font-serif text-lg font-semibold text-brand first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mb-1.5 mt-5 font-semibold">{children}</h5>,
  p: ({ children }) => <p className="my-2 text-sm leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">{children}</ul>,
  ol: ({ children, start }) => (
    <ol start={start} className="my-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
      {children}
    </ol>
  ),
};

/** Renders the stored Markdown. Raw HTML in the content is not rendered. */
export default function PrayerBurdensContent({ content }: { content: string }) {
  return <Markdown components={components}>{content}</Markdown>;
}
