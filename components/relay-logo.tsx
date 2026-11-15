import Image from "next/image";

export function RelayLogo() {
  return (
    <Image
      src="/brand/relay-logo.png"
      alt="Relay"
      width={960}
      height={285}
      priority
      className="h-10 w-auto shrink-0"
    />
  );
}
