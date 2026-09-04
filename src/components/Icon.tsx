import type { ReactNode, SVGProps } from "react";

/**
 * The interface's icon set: one 24-unit grid, one stroke weight, `currentColor`
 * throughout, so an icon inherits whatever the text beside it is doing.
 *
 * Emoji stay where they're *content* — subject glyphs, achievement badges, the
 * cheer reactions people send each other. Anything that is a control, a status
 * or a label is drawn here instead, because a row of emoji buttons never lines
 * up on the baseline and never matches the weight of the type around it.
 */
export type IconName =
  | "bell"
  | "bellOff"
  | "bolt"
  | "book"
  | "calendar"
  | "chart"
  | "check"
  | "chevronRight"
  | "clock"
  | "cloudOff"
  | "close"
  | "coffee"
  | "download"
  | "flame"
  | "list"
  | "lock"
  | "mail"
  | "note"
  | "pencil"
  | "share"
  | "sun"
  | "target"
  | "trophy"
  | "users";

const PATHS: Record<IconName, ReactNode> = {
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.4 2.2H4.6z" />
      <path d="M9.6 21.4a2.6 2.6 0 0 0 4.8 0" />
    </>
  ),
  bellOff: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 9.2-5.1M18 12v4.5l1.4 2.2H8" />
      <path d="M4 4l16 16" />
    </>
  ),
  bolt: <path d="M13.6 3 6 13.6h5l-.6 7.4L18 10.4h-5z" />,
  book: (
    <>
      <path d="M12 7.4C10.5 5.9 8.4 5.1 5 5.1v13c3.4 0 5.5.8 7 2.3 1.5-1.5 3.6-2.3 7-2.3v-13c-3.4 0-5.5.8-7 2.3z" />
      <path d="M12 7.4v13" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10.2h16M8.8 3.4v4.2M15.2 3.4v4.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7.6 20v-5.6M12 20V8.2m4.4 11.8v-8.4" />
    </>
  ),
  check: <path d="M5 12.4l4.6 4.6L19 7.4" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3.4 2" />
    </>
  ),
  cloudOff: (
    <>
      <path d="M18.4 18.4H7.2a4.1 4.1 0 0 1-.7-8.1M9.4 6.6A6 6 0 0 1 18 10.6" />
      <path d="M4 4l16 16" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  coffee: (
    <>
      <path d="M5 8.4h11v5a5.5 5.5 0 0 1-11 0z" />
      <path d="M16 9.9h1.6a2.6 2.6 0 0 1 0 5.2H16" />
      <path d="M4.2 20.4h12.6" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11.4m0 0-3.7-3.7M12 15.4l3.7-3.7" />
      <path d="M5.6 14v4.4a2 2 0 0 0 2 2h8.8a2 2 0 0 0 2-2V14" />
    </>
  ),
  flame: (
    <>
      <path d="M12 21c3.3 0 6-2.4 6-5.6 0-4.4-6-9.4-6-9.4S6 11 6 15.4C6 18.6 8.7 21 12 21z" />
      <path d="M12 17.6c1.1 0 2-.8 2-1.9 0-1.4-2-3.2-2-3.2s-2 1.8-2 3.2c0 1.1.9 1.9 2 1.9z" />
    </>
  ),
  list: (
    <>
      <path d="M4.4 7.4 5.9 8.9l2.5-2.6M4.4 12l1.5 1.5 2.5-2.6M4.4 16.6l1.5 1.5 2.5-2.6" />
      <path d="M11.6 7.2h8M11.6 11.8h8M11.6 16.4h8" />
    </>
  ),
  lock: (
    <>
      <rect x="5.4" y="10.4" width="13.2" height="9.2" rx="2.4" />
      <path d="M8.6 10.4V8a3.4 3.4 0 0 1 6.8 0v2.4" />
    </>
  ),
  mail: (
    <>
      <rect x="2.9" y="4.9" width="18.2" height="14.2" rx="2.4" />
      <path d="M3.6 6.7 12 12.5l8.4-5.8" />
    </>
  ),
  note: (
    <>
      <path d="M6.6 3.6h7.2L19 8.8v11.6H6.6z" />
      <path d="M13.6 3.6v5.4H19" />
      <path d="M9.6 13.4h6.2M9.6 16.8h4.4" />
    </>
  ),
  pencil: (
    <>
      <path d="M4.6 19.4h4L20 8a2.1 2.1 0 0 0-3-3L5.6 16.4z" />
      <path d="M15.4 6.6l2 2" />
    </>
  ),
  share: (
    <>
      <path d="M12 15.4V4m0 0L8.3 7.7M12 4l3.7 3.7" />
      <path d="M5.6 14v4.4a2 2 0 0 0 2 2h8.8a2 2 0 0 0 2-2V14" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8v2.2M12 19v2.2M2.8 12H5m14 0h2.2M5.5 5.5l1.6 1.6m9.8 9.8 1.6 1.6M18.5 5.5l-1.6 1.6m-9.8 9.8-1.6 1.6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.6 4.6h8.8v4a4.4 4.4 0 0 1-8.8 0z" />
      <path d="M7.6 6.2H5.2v1a3 3 0 0 0 2.8 3M16.4 6.2h2.4v1a3 3 0 0 1-2.8 3" />
      <path d="M12 13v3.6M8.4 20.2h7.2" />
    </>
  ),
  users: (
    <>
      <circle cx="9.2" cy="9" r="3.3" />
      <path d="M3.6 19.6c0-3 2.5-5.1 5.6-5.1s5.6 2.1 5.6 5.1" />
      <path d="M15.8 6.2a3.3 3.3 0 0 1 0 5.6M17.4 14.9c1.9.7 3 2.4 3 4.7" />
    </>
  ),
};

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** Edge length in px. 16 sits with 13px body text; 18–20 with headings. */
  size?: number;
}

export default function Icon({ name, size = 16, strokeWidth = 1.75, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
