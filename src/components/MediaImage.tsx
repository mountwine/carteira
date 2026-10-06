import { useEffect, useRef, useState } from "react";
import { mediaBlob } from "../data/media";
export function MediaImage({
  id,
  thumb = false,
  alt = "",
  className = "",
  position = 50,
}: {
  id: string;
  thumb?: boolean;
  alt?: string;
  className?: string;
  position?: number;
}) {
  const [url, setUrl] = useState(""),
    ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setUrl("");
    let live = true,
      object = "",
      loading = false,
      visible = false;
    async function load() {
      if (loading || object) return;
      loading = true;
      try {
        const blob = await mediaBlob(id, thumb);
        if (live && visible) {
          object = URL.createObjectURL(blob);
          setUrl(object);
        }
      } catch {
      } finally {
        loading = false;
      }
    }
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              visible = entries.some((e) => e.isIntersecting);
              if (visible) void load();
              else if (object) {
                URL.revokeObjectURL(object);
                object = "";
                setUrl("");
              }
            },
            { rootMargin: "180px" },
          )
        : null;
    if (observer && ref.current) observer.observe(ref.current);
    else {
      visible = true;
      void load();
    }
    return () => {
      live = false;
      observer?.disconnect();
      if (object) URL.revokeObjectURL(object);
    };
  }, [id, thumb]);
  return (
    <img
      ref={ref}
      className={className}
      style={{ objectPosition: `50% ${position}%` }}
      src={url || undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
export function TripCover({
  cover,
  position = 50,
}: {
  cover: string;
  position?: number;
}) {
  return !cover ? null : cover.startsWith("media:") ? (
    <MediaImage id={cover.slice(6)} position={position} />
  ) : (
    <img src={cover} alt="" style={{ objectPosition: `50% ${position}%` }} />
  );
}
