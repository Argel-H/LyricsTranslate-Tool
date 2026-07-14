import type { ProjectCreateInput } from "@/types/project";
import { SectionCard } from "@/features/project-setup/SectionCard";
import { useCoverTilt } from "@/hooks/useCoverTilt";
import { useI18n } from "@/hooks/useI18n";
import type { IconType } from "react-icons";
import { getPlatformIcon } from "@/lib/platformIcons";
import { SiDeezer } from "react-icons/si";

interface ProjectInfoModalProps {
  project: ProjectCreateInput;
  onClose: () => void;
}

type ArtistSection = { artist: string; links: { platform: string; url: string; artistName?: string }[]; deezerLink?: { name: string; url: string } };

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="font-label-md text-on-surface-variant shrink-0">{label}</span>
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

export function ProjectInfoModal({ project, onClose }: ProjectInfoModalProps) {
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-container-high rounded-[24px] shadow-2xl border border-outline-variant/20 max-w-7xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-6 sticky top-0 bg-surface-container-high z-10 rounded-t-[24px]">
          <h2 className="font-title-lg text-title-lg text-on-surface">{t("share.infoTitle")}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors">✕</button>
        </div>
        <div className="px-6 pb-6 grid grid-cols-2 gap-4 overflow-y-auto">
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
      </div>
    </div>
  );
}
