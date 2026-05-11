"use client";

export default function FooterLinks() {
  return (
    <div className="flex items-center gap-5">
      <a
        href="#"
        aria-disabled="true"
        onClick={(event) => event.preventDefault()}
        className="cursor-not-allowed transition hover:text-[#F5EFE0]"
      >
        Privacy Policy
      </a>
      <a
        href="#"
        aria-disabled="true"
        onClick={(event) => event.preventDefault()}
        className="cursor-not-allowed transition hover:text-[#F5EFE0]"
      >
        Terms of Service
      </a>
    </div>
  );
}
