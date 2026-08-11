import type { ProjectCreateInput } from "@/types/project";
import { useRef, useEffect } from "react";
import { SectionCard } from "@/features/project-setup/SectionCard";
import { Button } from "@/components/ui/button";
import { useCoverTilt } from "@/hooks/useCoverTilt";
import { useI18n } from "@/hooks/useI18n";
import type { IconType } from "react-icons";
import { getPlatformIcon } from "@/lib/platformIcons";
import { SiDeezer } from "react-icons/si";
import { FileText, Users, Link, Headphones } from "lucide-react";

interface ProjectDetailsModalProps {
  project: ProjectCreateInput;
  onClose: () => void;
  /** Override the default modal title */
  title?: string;
  /** Extra data shown only in lookup mode (lyrics count, sync status, extra artists) */
  lookupExtras?: {
    rawLyrics: string;
    lrcResult?: { syncedLyrics?: string | null };
    typedArtistCount: number;
  };
  /** If provided, shows Apply/Dismiss buttons at the bottom */
  onApply?: () => void;
  onDismiss?: () => void;
}

type ArtistSection = { artist: string; links: { platform: string; url: string; artistName?: string }[]; deezerLink?: { name: string; url: string } };

function MetaRow({ label, value, mono, icon: Icon }: { label: string; value: string; mono?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="font-label-md text-on-surface-variant shrink-0 flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className={`font-body-md text-on-surface text-right ${mono ? "font-mono text-sm" : ""}`}>{value}</span>
    </div>
  );
}

function LinkRow({ icon: Icon, label, url }: { icon: IconType; label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-3 rounded-xl bg-surface-container hover:bg-surface-container-highest transition-colors group">
      <Icon className="size-5 text-on-surface-variant shrink-0" />
      <span className="flex-1 font-body-md text-on-surface group-hover:text-primary transition-colors truncate">{label}</span>
      <span className="text-on-surface-variant text-xs">↗</span>
    </a>
  );
}

export function ProjectDetailsModal({ project, onClose, title, lookupExtras, onApply, onDismiss }: ProjectDetailsModalProps) {
  const { t } = useI18n();
  const { tilt: coverTilt, handlers: { onMouseMove: handleCoverMouseMove, onMouseLeave: handleCoverMouseLeave } } = useCoverTilt();

  const artistSections: ArtistSection[] = (() => {
    if (!project.artistLinks?.length && !project.recommendedSocialLinks?.length) return [];
    return (project.artistName || []).map(artist => {
      const links = project.recommendedSocialLinks?.filter(l => l.artistName === artist || !l.artistName) || [];
      const deezerLink = project.artistLinks?.find(l => l.name === artist);
      if (links.length === 0 && !deezerLink) return null;
      return { artist, links, deezerLink } as ArtistSection;
    }).filter((s): s is ArtistSection => s !== null);
  })();

  const hasLookupExtras = lookupExtras && onApply;
  const modalTitle = title ?? t("share.infoTitle");

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Artist color palette: first 5 are hand-picked distinct colors, rest are randomized
  const artistColorCache = useRef<string[]>([]);
  const getArtistColor = (index: number): string => {
    if (artistColorCache.current[index]) return artistColorCache.current[index]!;
    const presets = [
      "bg-primary-container text-on-primary-container",
      "bg-secondary-container text-on-secondary-container",
      "bg-tertiary-container text-on-tertiary-container",
      "bg-error-container text-on-error-container",
      "bg-[#E8DEF8] text-[#4A4458]",
    ];
    if (index < presets.length) {
      artistColorCache.current[index] = presets[index]!;
      return presets[index]!;
    }
    // Generate a random pastel color for extra artists
    const hue = (index * 137 + 42) % 360;
    const color = `bg-[hsl(${hue},40%,88%)] text-[hsl(${hue},30%,30%)]`;
    artistColorCache.current[index] = color;
    return color;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-container-high rounded-[24px] shadow-2xl border border-outline-variant/20 max-w-7xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-6 sticky top-0 bg-surface-container-high z-10 rounded-t-[24px]">
          <h2 className="font-title-lg text-title-lg text-on-surface">{modalTitle}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors">✕</button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto">
          {hasLookupExtras ? (
            /* Lookup mode: two-column — cover left, details right, actions below */
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  {project.coverUrl && (
                    <div className="bg-surface-container rounded-section p-4 border border-outline-variant/10">
                      <div
                        className="w-full aspect-square rounded-3xl overflow-hidden bg-surface-container-highest"
                        onMouseMove={handleCoverMouseMove}
                        onMouseLeave={handleCoverMouseLeave}
                        style={{
                          transform: `perspective(1800px) rotateX(${coverTilt.x}deg) rotateY(${coverTilt.y}deg)`,
                          transition: coverTilt.x === 0 && coverTilt.y === 0 ? "transform 0.6s ease" : "none",
                        }}
                      >
                        <img src={project.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  <SectionCard title={t("share.details")}>
                    {project.trackName && <MetaRow label={t("share.track")} value={project.trackName} />}
                    {project.albumName && <MetaRow label={t("share.album")} value={project.albumName} />}
                    {(project.artistName?.length ?? 0) > 0 && (
                      <div className="flex justify-between gap-4 py-1">
                        <span className="font-label-md text-on-surface-variant shrink-0">{t("share.artist")}</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {(project.artistName ?? []).map((a, i) => {
                            const color = getArtistColor(i);
                            return (
                              <span key={a} className={`px-3 py-1 rounded-full font-label-md text-sm ${color}`}>{a}</span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {lookupExtras.rawLyrics && (
                      <MetaRow
                        icon={FileText}
                        label="Lyrics"
                        value={`${t("setup.lookupLines").replace("{count}", String(lookupExtras.rawLyrics.split("\n").filter((l) => l.trim()).length))} · ${lookupExtras.lrcResult?.syncedLyrics ? t("setup.lookupSynced") : t("setup.lookupPlainText")}`}
                      />
                    )}
                    {project.isrcs && (
                      <MetaRow label="ISRC" value={project.isrcs} mono />
                    )}
                    {(() => {
                      const foundCount = (project.artistName ?? []).length;
                      if (foundCount > lookupExtras.typedArtistCount) {
                        const extra = (project.artistName ?? []).slice(lookupExtras.typedArtistCount);
                        return (
                          <MetaRow icon={Users} label="Artists" value={`${extra.join(", ")}`} />
                        );
                      }
                      return null;
                    })()}
                    {project.recommendedSocialLinks && project.recommendedSocialLinks.length > 0 && (
                      <div className="flex justify-between gap-4 py-1">
                        <span className="font-label-md text-on-surface-variant shrink-0 flex items-start gap-1.5 pt-0.5">
                          <Link className="size-3.5" />
                          Social
                        </span>
                        <div className="ml-12 flex flex-wrap gap-1.5 justify-end">
                          {[...project.recommendedSocialLinks]
                            .sort((a, b) => a.platform.localeCompare(b.platform))
                            .map((l, i) => {
                            const Icon = getPlatformIcon(l.platform);
                            const artistIdx = Math.max(0, (project.artistName ?? []).indexOf(l.artistName ?? ""));
                            const color = getArtistColor(artistIdx);
                            return (
                              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                                className={`size-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity ${color}`}>
                                <Icon className="size-4" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {project.streamingSites && Object.keys(project.streamingSites).filter((k) => project.streamingSites![k]).length > 0 && (
                      <div className="flex justify-between gap-4 py-1">
                        <span className="font-label-md text-on-surface-variant shrink-0 flex items-center gap-1.5">
                          <Headphones className="size-3.5" />
                          Streaming
                        </span>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {Object.keys(project.streamingSites).filter((k) => project.streamingSites![k]).map((k) => {
                            const Icon = getPlatformIcon(k);
                            const url = project.streamingSites![k]!;
                            return (
                              <a key={k} href={url} target="_blank" rel="noopener noreferrer"
                                className="size-8 rounded-full bg-secondary-container/30 text-secondary flex items-center justify-center hover:bg-secondary-container/50 transition-colors">
                                <Icon className="size-4" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={onDismiss}
                  className="bg-surface-container-highest text-on-surface-variant font-label-md px-3 py-3 rounded-l-lg rounded-r-sm hover:bg-surface-container-high transition-all h-auto"
                >
                  {t("setup.lookupDismiss")}
                </Button>
                <Button
                  onClick={onApply}
                  className="bg-primary-container text-on-primary-container font-label-md px-3 py-3 rounded-l-sm rounded-r-lg hover:bg-primary hover:text-on-primary transition-all h-auto"
                >
                  {t("setup.lookupApply")}
                </Button>
              </div>
            </div>
          ) : (
            /* View mode: original two-column layout */
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                {project.coverUrl && (
                  <div className="bg-surface-container rounded-section p-4 border border-outline-variant/10">
                    <div
                      className="w-full aspect-square rounded-3xl overflow-hidden bg-surface-container-highest"
                      onMouseMove={handleCoverMouseMove}
                      onMouseLeave={handleCoverMouseLeave}
                      style={{
                        transform: `perspective(1800px) rotateX(${coverTilt.x}deg) rotateY(${coverTilt.y}deg)`,
                        transition: coverTilt.x === 0 && coverTilt.y === 0 ? "transform 0.6s ease" : "none",
                      }}
                    >
                      <img src={project.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                <SectionCard title={t("share.details")}>
                  {project.trackName && <MetaRow label={t("share.track")} value={project.trackName} />}
                  {project.albumName && <MetaRow label={t("share.album")} value={project.albumName} />}
                  {(project.artistName?.length ?? 0) > 0 && (
                    <div className="flex justify-between gap-4 py-1">
                      <span className="font-label-md text-on-surface-variant shrink-0">{t("share.artist")}</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(project.artistName ?? []).map(a => (
                          <span key={a} className="px-3 py-1 bg-primary-container/30 text-primary rounded-full font-label-md text-sm">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const streams = Object.entries(project.streamingSites ?? {}).filter(([, url]) => url);
                    if (streams.length === 0) return null;
                    return (
                      <div className="flex justify-between gap-4 py-1">
                        <span className="font-label-md text-on-surface-variant shrink-0">{t("share.streaming")}</span>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {streams.map(([k, url]) => {
                            const label = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
                            return (
                              <a key={k} href={url!} target="_blank" rel="noopener noreferrer"
                                className="px-3 py-1 bg-secondary-container/30 text-secondary rounded-full font-label-md text-sm hover:bg-secondary-container/50 transition-colors">
                                {label}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  {project.isrcs && <MetaRow label={t("share.isrcs")} value={project.isrcs} mono />}
                </SectionCard>
              </div>
              <div className="flex flex-col gap-4">
                {artistSections.map(({ artist, links, deezerLink }) => (
                  <SectionCard key={artist} title={artist}>
                    <div className="grid grid-cols-2 gap-2">
                      {deezerLink && <LinkRow icon={SiDeezer} label="Deezer" url={deezerLink.url} />}
                      {links.map((l: any, i: number) => <LinkRow key={i} icon={getPlatformIcon(l.platform)} label={l.platform} url={l.url} />)}
                    </div>
                  </SectionCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
