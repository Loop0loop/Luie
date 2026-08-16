interface WindowBarProps {
  title?: string;
}

export default function WindowBar({ title }: WindowBarProps) {
  const isMacOS = navigator.platform.toLowerCase().includes("mac");
  if (!isMacOS) {
    return null;
  }

  return (
    <div
      className="h-10 w-full flex items-center justify-center bg-transparent select-none relative z-50"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {title && <span className="text-[13px] font-medium text-muted opacity-80">{title}</span>}
    </div>
  );
}
