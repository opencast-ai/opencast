import React from "react";

export function Icon(props: { name: string; className?: string; title?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${props.className ?? ""}`}
      aria-hidden={props.title ? undefined : true}
      title={props.title}
    >
      {props.name}
    </span>
  );
}
