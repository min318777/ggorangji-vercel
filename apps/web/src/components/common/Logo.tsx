import Link from 'next/link';
import Image from 'next/image';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center no-underline">
      <div style={{ position: 'relative', width: 120, height: 40, flexShrink: 0 }}>
        <Image
          src="/logo.png"
          alt="꼬랑지 로고"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </Link>
  );
}
