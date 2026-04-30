import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy text-[#b4c5d6]">
      <div className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <p className="text-white font-heading text-lg mb-3">AlwaysCited</p>
            <p className="text-sm leading-relaxed mb-4">
              The AI Search Agency. We engineer brand visibility across Google&apos;s AI
              Overview, ChatGPT, Perplexity, and other LLMs.
            </p>
            <p className="text-xs text-[#6b8099]">
              A sub-brand of{" "}
              <a
                href="https://nomadadigital.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#b4c5d6] hover:text-white underline"
              >
                Nomada Digital
              </a>{" "}
              — 5-star Google-reviewed B2B search agency, York, UK.
            </p>
          </div>

          {/* Pages */}
          <div>
            <p className="text-white text-sm font-medium mb-4 uppercase tracking-wider">
              Pages
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <Link href="/how-it-works" className="hover:text-white hover:no-underline transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/what-is-aeo" className="hover:text-white hover:no-underline transition-colors">
                  What is AEO?
                </Link>
              </li>
              <li>
                <Link href="/case-studies/vibe-retail" className="hover:text-white hover:no-underline transition-colors">
                  Case study
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white hover:no-underline transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white hover:no-underline transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white hover:no-underline transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-white text-sm font-medium mb-4 uppercase tracking-wider">
              Get in touch
            </p>
            <p className="text-sm mb-3">
              <a
                href="mailto:hello@alwayscited.com"
                className="hover:text-white hover:no-underline transition-colors"
              >
                hello@alwayscited.com
              </a>
            </p>
            {/* PLACEHOLDER: Add social links before publication */}
            <p className="text-xs text-[#6b8099]">{/* Social links — to be added */}</p>
          </div>
        </div>

        <div className="border-t border-[#1a2d42] pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#6b8099]">
          <p>
            &copy; {new Date().getFullYear()} AlwaysCited. Part of{" "}
            <a
              href="https://nomadadigital.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#b4c5d6]"
            >
              Nomada Digital Ltd
            </a>
            .
          </p>
          <p>Registered in England and Wales.</p>
        </div>
      </div>
    </footer>
  );
}
