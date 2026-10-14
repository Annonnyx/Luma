import { Fragment } from "react";

/** A scene title whose `\n` are deliberate line breaks. */
export function TitleLines({ title }: { title: string }) {
  return title.split("\n").map((line, i) => (
    <Fragment key={line}>
      {i > 0 && (
        <>
          {" "}
          <br />
        </>
      )}
      {line}
    </Fragment>
  ));
}
