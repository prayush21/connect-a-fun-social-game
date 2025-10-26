import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <div className="mx-auto max-w-md px-4 text-center">
        <h1 className="mb-4 text-9xl font-bold text-white">404</h1>
        <h2 className="mb-4 text-3xl font-semibold text-white">
          Page Not Found
        </h2>
        <p className="mb-8 text-lg text-white/90">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-white px-8 py-3 font-semibold text-purple-600 transition-all hover:bg-white/90 hover:scale-105"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
