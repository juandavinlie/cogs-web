"use client";

import { useRef } from "react";
import Linkify from "@/components/Linkify";

type Props = {
  title: string;
  body: string;
  dateLabel: string | null;
  deadlineLabel: string | null;
  registrationLink: string | null; // Only set while registration is open
};

function RegisterLink({ href, deadlineLabel }: { href: string; deadlineLabel: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Register
      </a>
      {deadlineLabel && <span className="text-sm text-muted">by {deadlineLabel}</span>}
    </div>
  );
}

export default function AnnouncementCard({ title, body, dateLabel, deadlineLabel, registrationLink }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = () => dialog.current?.showModal();
  const close = () => dialog.current?.close();

  return (
    <li
      onClick={body ? open : undefined}
      className={`flex flex-col rounded-xl border border-line bg-white p-5 ${body ? "cursor-pointer hover:border-brand/40" : ""}`}
    >
      {dateLabel && <p className="text-xs font-semibold uppercase tracking-wide text-accent">{dateLabel}</p>}
      <h3 className={`font-semibold ${dateLabel ? "mt-1" : ""}`}>{title}</h3>
      {body && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted">{body}</p>}

      {(registrationLink || body) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          {registrationLink ? <RegisterLink href={registrationLink} deadlineLabel={deadlineLabel} /> : <span />}
          {body && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="text-sm font-medium text-brand underline-offset-2 hover:underline"
            >
              Read more
            </button>
          )}
        </div>
      )}

      {body && (
        <dialog
          ref={dialog}
          aria-label={title}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === dialog.current) close(); // Clicked the backdrop
          }}
          className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 text-ink shadow-xl backdrop:bg-black/50"
        >
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                {dateLabel && <p className="text-xs font-semibold uppercase tracking-wide text-accent">{dateLabel}</p>}
                <h3 className={`font-serif text-xl font-semibold ${dateLabel ? "mt-1" : ""}`}>{title}</h3>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 shrink-0 rounded-full px-2 text-2xl leading-none text-muted hover:text-ink"
              >
                ×
              </button>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">
              <Linkify text={body} />
            </p>
            {registrationLink && (
              <div className="mt-5">
                <RegisterLink href={registrationLink} deadlineLabel={deadlineLabel} />
              </div>
            )}
          </div>
        </dialog>
      )}
    </li>
  );
}
