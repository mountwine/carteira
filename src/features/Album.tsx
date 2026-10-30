import { useEffect, useRef, useState } from "react";
import { useTravel } from "../data/TravelContext";
import { Page, Modal, Empty, Segments, AddButton } from "../components/forms";
import { DatePicker } from "../components/local";
import { MediaImage } from "../components/MediaImage";
import {
  importPhoto,
  migrateAlbum,
  photos,
  savePhoto,
  type Photo,
} from "../data/media";
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Info,
  Pencil,
  Trash2,
} from "lucide-react";
export function Album() {
  const t = useTravel(),
    [items, setItems] = useState<Photo[]>([]),
    [view, setView] = useState<"date" | "immersive">("date"),
    [viewer, setViewer] = useState<string | null>(null),
    [info, setInfo] = useState(false),
    [edit, setEdit] = useState<Photo | null>(null),
    [deleting, setDeleting] = useState(false),
    [clean, setClean] = useState(false),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null),
    start = useRef<number | null>(null);
  async function load() {
    setItems(await photos(t.trip.id));
  }
  useEffect(() => {
    void migrateAlbum(t.trip.id, t.user.id)
      .then(load)
      .catch((e) => t.notify(e.message));
    const fn = () => void load();
    window.addEventListener("travel-os-media", fn);
    return () => window.removeEventListener("travel-os-media", fn);
  }, [t.trip.id]);
  const index = items.findIndex((p) => p.id === viewer),
    selected = items[index];
  useEffect(() => {
    if (t.activeScreen !== "Álbum") return;
    setViewer(items.some((p) => p.id === t.focus) ? t.focus : null);
    setInfo(false);
    setClean(false);
  }, [t.focus, t.activeScreen, items.length]);
  useEffect(() => {
    if (selected) {
      dialog.current?.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        dialog.current?.close();
        document.body.style.overflow = previous;
      };
    }
  }, [!!selected]);
  const groups = items.reduce<Record<string, Photo[]>>((g, p) => {
    (g[p.date] ??= []).push(p);
    return g;
  }, {});
  function move(delta: number) {
    if (items.length)
      setViewer(items[(index + delta + items.length) % items.length].id);
    setInfo(false);
  }
  async function share(p: Photo) {
    const file = new File([p.blob], p.name.replace(/\.[^.]+$/, ".jpg"), {
      type: p.blob.type,
    });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: p.caption || t.trip.name,
        });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(p.blob),
      a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    t.notify(
      "Foto preparada para salvar. Compartilhe pelo aplicativo Fotos ou Arquivos.",
    );
  }
  return (
    <Page
      title="Álbum"
      action={
        <AddButton
          label="Adicionar fotos"
          onClick={() => input.current?.click()}
        />
      }
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          setBusy(true);
          let count = 0;
          for (const file of files) {
            try {
              await importPhoto(file, t.trip.id, t.user.id, "album", t.date);
              count++;
            } catch (err) {
              t.notify((err as Error).message);
            }
          }
          await load();
          setBusy(false);
          if (count) t.notify(`${count} foto(s) adicionada(s)`);
        }}
      />
      {busy && <p role="status">Importando e preparando fotos…</p>}
      <Segments
        value={view}
        onChange={setView}
        label="Visualização do álbum"
        options={[
          { value: "date", label: "Por data" },
          { value: "immersive", label: "Imersivo" },
        ]}
      />
      {!items.length ? (
        <Empty
          title="Álbum vazio"
          text="Adicione fotos desta viagem."
          action={
            <button
              className="button primary"
              onClick={() => input.current?.click()}
            >
              + Adicionar fotos
            </button>
          }
        />
      ) : view === "date" ? (
        Object.entries(groups).map(([date, group]) => (
          <section key={date}>
            <h2 className="album-day">
              {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
              })}
              {group.find((p) => p.location)?.location
                ? ` · ${group.find((p) => p.location)!.location}`
                : ""}
            </h2>
            <div className="photo-mosaic">
              {group.map((p) => (
                <button
                  key={p.id}
                  onClick={() => t.navigate("Álbum", p.id)}
                  aria-label={`Abrir foto ${p.caption || p.name}`}
                >
                  <MediaImage id={p.id} thumb alt={p.caption || p.name} />
                </button>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div
          className="photo-immersive"
          aria-label="Fotos em sequência horizontal"
        >
          {items.map((p) => (
            <button
              key={p.id}
              className="photo-immersive-item"
              aria-label={`Abrir foto ${p.caption || p.name}`}
              onClick={() => t.navigate("Álbum", p.id)}
            >
              <MediaImage id={p.id} alt={p.caption || p.name} />
              <span>
                <strong>{p.caption || p.location || "Foto da viagem"}</strong>
                <small>{p.date} · Toque para ampliar</small>
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <dialog
          ref={dialog}
          className="photo-viewer"
          onCancel={(e) => {
            e.preventDefault();
            t.back();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de foto"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") move(1);
            if (e.key === "ArrowLeft") move(-1);
          }}
        >
          <header className={clean ? "controls-hidden" : ""}>
            <button aria-label="Fechar foto" onClick={() => t.back()}>
              <ChevronLeft size={19} /> Álbum
            </button>
            <span>
              {index + 1} / {items.length}
            </span>
          </header>
          <div
            className="photo-stage"
            onPointerDown={(e) => {
              start.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (start.current !== null) {
                const delta = e.clientX - start.current;
                if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1);
                else setClean(!clean);
                start.current = null;
              }
            }}
          >
            <MediaImage
              id={selected.id}
              alt={selected.caption || selected.name}
            />
          </div>
          <div className={`photo-controls ${clean ? "controls-hidden" : ""}`}>
            <button aria-label="Foto anterior" onClick={() => move(-1)}>
              <ChevronLeft size={21} />
            </button>
            <button onClick={() => void share(selected)}>
              <Share2 size={19} />
              Compartilhar
            </button>
            <button onClick={() => setInfo(!info)}>
              <Info size={19} />
              Informações
            </button>
            <button onClick={() => setEdit({ ...selected })}>
              <Pencil size={19} />
              Editar
            </button>
            <button onClick={() => setDeleting(true)}>
              <Trash2 size={19} />
              Excluir
            </button>
            <button aria-label="Próxima foto" onClick={() => move(1)}>
              <ChevronRight size={21} />
            </button>
          </div>
          {info && (
            <section className="photo-info">
              <p>
                {selected.date} {selected.time}
              </p>
              <p>
                {selected.location || "Local não informado"} · {t.trip.name}
              </p>
              <p>{selected.caption}</p>
              <small>
                {selected.metadataDate
                  ? "Data obtida do arquivo"
                  : "Data de importação ou definida por você"}
              </small>
            </section>
          )}
        </dialog>
      )}
      {edit && (
        <Modal title="Editar foto" onClose={() => setEdit(null)}>
          <form
            className="record-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await savePhoto(edit);
              setEdit(null);
            }}
          >
            <DatePicker
              label="Data"
              value={edit.date}
              onChange={(date) =>
                setEdit({ ...edit, date, metadataDate: false })
              }
            />
            <label>
              Local
              <input
                value={edit.location}
                onChange={(e) => setEdit({ ...edit, location: e.target.value })}
              />
            </label>
            <label>
              Legenda
              <textarea
                value={edit.caption}
                onChange={(e) => setEdit({ ...edit, caption: e.target.value })}
              />
            </label>
            <button className="button primary">Concluir</button>
          </form>
        </Modal>
      )}
      {deleting && selected && (
        <Modal title="Excluir foto?" onClose={() => setDeleting(false)}>
          <p>A foto será removida do álbum desta viagem.</p>
          <button
            className="button secondary"
            onClick={() => setDeleting(false)}
          >
            Cancelar
          </button>
          <button
            className="button primary"
            onClick={async () => {
              await savePhoto({ ...selected, deleted: true });
              setDeleting(false);
              t.back();
            }}
          >
            Excluir foto
          </button>
        </Modal>
      )}
    </Page>
  );
}
