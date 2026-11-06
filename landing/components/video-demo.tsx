export default function VideoDemo() {
  return (
    <section id="video" className="bg-harvi-dark py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-8 text-center text-2xl font-bold text-white md:text-3xl">
          Mirá cómo funciona
        </h2>
        <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src="https://www.youtube-nocookie.com/embed/MjD5BZo_kmg"
            title="Demo Libreta Digital"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
