export default function SignaturePreview({ form }) {
  const accent = form?.theme?.accent || "#0ea5e9";
  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex gap-4">
        {form?.avatarUrl ? (
          <img
            src={form.avatarUrl}
            alt=""
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : null}
        <div>
          <div className="text-lg font-semibold" style={{ color: accent }}>
            {form?.name || "Your Name"}
          </div>
          <div className="text-sm opacity-80">{form?.title || "Title"}</div>
          <div className="mt-2 text-xs leading-5">
            <div>
              <b>e:</b> {form?.email || "you@company.com"}
            </div>
            <div>
              <b>p:</b> {form?.phone || "+00 0000 0000"}
            </div>
            <div>
              <b>w:</b> {form?.website || "company.com"}
            </div>
          </div>
          {form?.logoUrl ? (
            <img
              src={form.logoUrl}
              alt=""
              className="mt-2 h-6 object-contain"
            />
          ) : null}
        </div>
      </div>
      <div className="mt-3 h-1 rounded" style={{ background: accent }} />
    </div>
  );
}
