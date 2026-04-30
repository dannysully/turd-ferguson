import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-[1100px] px-6 py-24 text-center">
        <h2
          className="text-white font-heading text-3xl md:text-4xl mb-6 max-w-2xl mx-auto"
          style={{ fontFamily: "Georgia, 'Times New Roman', Times, serif" }}
        >
          If your competitors are cited by ChatGPT and you&apos;re not, that gap is widening every week.
        </h2>
        <p className="text-[#b4c5d6] text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          Book a 30-minute call and we&apos;ll show you exactly which AI surfaces your brand is missing from, and what it would take to fix that.
        </p>
        <Link
          href="/contact"
          className="inline-block bg-coral text-white px-8 py-4 rounded-lg text-base font-medium hover:bg-[#c24e26] hover:no-underline transition-colors"
        >
          Book a call
        </Link>
      </div>
    </section>
  );
}
