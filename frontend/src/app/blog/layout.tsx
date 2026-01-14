"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Menu, X, Zap, Twitter, Github } from "lucide-react";

const navLinks = [
  { href: "/beta", label: "Game" },
  { href: "/blog", label: "Blog", active: true },
  { href: "/beta/tour", label: "Rules" },
];

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b-2 border-black bg-surface">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/beta"
            className="flex-shrink-0 transition-opacity hover:opacity-80"
          >
            <div className="flex items-center gap-2">
              <Logo height={32} fontSize={18} iconSize={14} />
              <span className="hidden font-bold text-primary sm:block">
                Connect Signull
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex sm:space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors ${
                  link.active
                    ? "border-primary font-bold text-primary"
                    : "border-transparent text-gray-500 hover:border-primary hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-primary hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t-2 border-black sm:hidden" id="mobile-menu">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md px-3 py-2 text-base font-medium ${
                  link.active
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t-2 border-black bg-white py-12">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="font-bold text-primary">Connect</span>
          <Zap className="h-5 w-5 text-yellow-500" />
          <span className="font-bold text-primary">Signull</span>
        </div>

        {/* Social Links */}
        <div className="mb-8 flex justify-center space-x-6">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-colors hover:text-gray-500"
          >
            <span className="sr-only">Twitter</span>
            <Twitter className="h-6 w-6" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-colors hover:text-gray-500"
          >
            <span className="sr-only">GitHub</span>
            <Github className="h-6 w-6" />
          </a>
        </div>

        {/* Copyright */}
        <p className="text-sm text-gray-500">
          © {currentYear} Connect Signull. A Collaborative Word Guessing Game.
        </p>
      </div>
    </footer>
  );
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
