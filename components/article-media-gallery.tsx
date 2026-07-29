type Media = { id: string; media_url: string; media_type: "image" | "video" };

export function ArticleMediaGallery({ media }: { media: Media[] }) {
  if (!media || media.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-8">
      {media.map((m) => (
        <div key={m.id} className="rounded-lg overflow-hidden border border-black/10 bg-black/5 aspect-square">
          {m.media_type === "video" ? (
            <video src={m.media_url} controls className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.media_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}
