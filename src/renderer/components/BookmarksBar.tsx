import React from 'react';

export type BookmarkRow = { id: string; title: string; url: string };

export function BookmarksBar(props: {
  bookmarks: BookmarkRow[];
  onOpen: (url: string) => void;
}) {
  if (props.bookmarks.length === 0) {
    return <div className="nb-bookmarksBar nb-bookmarksBar--empty" aria-label="Bookmarks" />;
  }

  return (
    <div className="nb-bookmarksBar" role="navigation" aria-label="Bookmarks">
      {props.bookmarks.map((b) => (
        <button
          key={b.id}
          type="button"
          className="nb-bookmarkChip"
          title={b.url}
          onClick={() => props.onOpen(b.url)}
        >
          {b.title || b.url}
        </button>
      ))}
    </div>
  );
}
