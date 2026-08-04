export type HandbookVideoKind = 'file' | 'embed';

export interface HandbookVideoSection {
  partNumber: number;
  sectionNumber?: number;
  title: string;
  duration: string;
  posterUrl: string;
  sourceUrl: string | null;
  kind: HandbookVideoKind;
}

const DEFAULT_POSTER_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBshVaRzF-d4q2MwqtPNHups0sJL4vP55I_Cld2Ys0CmWVkjoyFfvsee30o-jAgKjdFFO0nEK_BYfwjNEwNgQlifa8TRPDMbduG4kb-QZEc2mIJ3muKpq6TNpB_1lsvNGRmaJe2vcZy9z4kFdpJlYm2tOQnGuwnieXjThuelP5v-m9M5vtssch_hXqjBriqL1njDnb35r3XZYuwduFVEcwIo6jSTlxQqVsAmoAZ3bqbqVJ4-ftEkJgJqY_W2B5bqBarfwJ_u7uoY';

const VIDEO_TITLES: Record<number, string> = {
  1: 'Introduction and RedPoint Culture',
  2: 'Employment Administration Essentials',
  3: 'Probation and Employee Lifecycle',
  4: 'Working Hours and Attendance',
  5: 'Leave Administration',
  6: 'Compensation and Benefits',
  7: 'Statutory and Tax Compliance',
  8: 'Performance Management',
  9: 'Code of Conduct and Ethics',
  10: 'IT Security and Data Protection',
  11: 'Workplace Health, Safety and Wellbeing',
  12: 'Company Property and Facilities',
  13: 'Discipline and Grievance',
  14: 'Separation of Employment',
  15: 'Final Provisions and Acknowledgement',
};

const VIDEO_DURATIONS: Record<number, string> = {
  1: '3:15',
  2: '4:20',
  3: '3:50',
  4: '4:45',
  5: '5:10',
  6: '4:15',
  7: '3:30',
  8: '4:00',
  9: '5:30',
  10: '4:50',
  11: '4:05',
  12: '3:40',
  13: '4:30',
  14: '4:15',
  15: '2:30',
};

const env = import.meta.env as Record<string, string | undefined>;
const baseUrl = env.VITE_HANDBOOK_VIDEO_BASE_URL?.trim().replace(/\/$/, '') || '';

function isEmbedUrl(url: string) {
  return /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(url);
}

function normalizeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (/youtu\.be$/i.test(parsed.hostname)) {
      const videoId = parsed.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    if (/youtube\.com$/i.test(parsed.hostname) && parsed.pathname === '/watch') {
      const videoId = parsed.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    if (/vimeo\.com$/i.test(parsed.hostname)) {
      const videoId = parsed.pathname.split('/').filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
  } catch {
    return url;
  }
  return url;
}

function getPartEnvPrefix(partNumber: number) {
  return `VITE_HANDBOOK_VIDEO_PART_${partNumber}`;
}

function getSectionEnvPrefix(partNumber: number, sectionNumber: number) {
  return `${getPartEnvPrefix(partNumber)}_SECTION_${sectionNumber}`;
}

function getSourceUrl(partNumber: number, sectionNumber?: number): string | null {
  if (sectionNumber != null) {
    const sectionPrefix = getSectionEnvPrefix(partNumber, sectionNumber);
    const explicitSectionUrl = env[sectionPrefix]?.trim();
    if (explicitSectionUrl) {
      return isEmbedUrl(explicitSectionUrl) ? normalizeEmbedUrl(explicitSectionUrl) : explicitSectionUrl;
    }
    if (!baseUrl) return null;
    return `${baseUrl}/part-${String(partNumber).padStart(2, '0')}-section-${String(sectionNumber).padStart(2, '0')}.mp4`;
  }

  const explicitUrl = env[`VITE_HANDBOOK_VIDEO_PART_${partNumber}`]?.trim();
  if (explicitUrl) return isEmbedUrl(explicitUrl) ? normalizeEmbedUrl(explicitUrl) : explicitUrl;
  if (!baseUrl) return null;
  return `${baseUrl}/part-${String(partNumber).padStart(2, '0')}.mp4`;
}

export const HANDBOOK_VIDEO_SECTIONS: HandbookVideoSection[] = Array.from(
  { length: 15 },
  (_, index) => {
    const partNumber = index + 1;
    const sourceUrl = getSourceUrl(partNumber);
    return {
      partNumber,
      title: VIDEO_TITLES[partNumber],
      duration: VIDEO_DURATIONS[partNumber],
      posterUrl: DEFAULT_POSTER_URL,
      sourceUrl,
      kind: sourceUrl && isEmbedUrl(sourceUrl) ? 'embed' : 'file',
    };
  }
);

export function getHandbookVideoSection(
  partNumber: number,
  sectionNumber?: number,
  fallbackTitle?: string,
  fallbackDuration?: string
): HandbookVideoSection {
  if (sectionNumber != null) {
    const sectionPrefix = getSectionEnvPrefix(partNumber, sectionNumber);
    const sourceUrl = getSourceUrl(partNumber, sectionNumber);
    const title =
      env[`${sectionPrefix}_TITLE`]?.trim() ||
      fallbackTitle ||
      `Part ${partNumber} - Section ${sectionNumber} Briefing`;
    const duration =
      env[`${sectionPrefix}_DURATION`]?.trim() ||
      fallbackDuration ||
      'Video';
    const posterUrl =
      env[`${sectionPrefix}_POSTER_URL`]?.trim() ||
      DEFAULT_POSTER_URL;

    return {
      partNumber,
      sectionNumber,
      title,
      duration,
      posterUrl,
      sourceUrl,
      kind: sourceUrl && isEmbedUrl(sourceUrl) ? 'embed' : 'file',
    };
  }

  return (
    HANDBOOK_VIDEO_SECTIONS.find((section) => section.partNumber === partNumber) || {
      partNumber,
      title: `Part ${partNumber} briefing`,
      duration: fallbackDuration || 'Video',
      posterUrl: DEFAULT_POSTER_URL,
      sourceUrl: null,
      kind: 'file',
    }
  );
}
