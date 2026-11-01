import { Fragment } from "react";

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"]+|\b(?:[a-z0-9-]+\.)+(?:com|org|net|cc|gle|so|sg|ly|io|me)\/[^\s<>"]*)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}”’'"]+$/;

/** Renders text with any web addresses as clickable links. */
export default function Linkify({ text }: { text: string }) {
  return text.split(URL_PATTERN).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;

    const url = part.replace(TRAILING_PUNCTUATION, "");
    return (
      <Fragment key={i}>
        <a
          href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-brand underline underline-offset-2"
        >
          {url}
        </a>
        {part.slice(url.length)}
      </Fragment>
    );
  });
}
