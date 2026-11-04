// Athlete profile data that the Settings form does not hold: scholarship interests and the
// profile showcase (photo + highlight video). Kept in its own store so the existing profile store,
// its tests and everything that reads it stay exactly as they were.
//
// PROTOTYPE LIMIT: like profileStore, this lives in this browser's localStorage. It survives
// logging out and back in on the same browser, but it does not follow the athlete to another
// device and can be edited in devtools. Swap the storage for an API (and run the same validators
// on the server) when real accounts own this data. There is no moderation service yet, so
// "approved" below means "passed the checks in this file"; `setMediaStatus` is the hook a future
// reviewer would use to mark something "rejected" (which never counts toward completion).

import { useSyncExternalStore } from "react";
import { scholarships } from "@/data/mock";
import { scopeStamp, scopedKey } from "@/lib/accountScope";

const BASE_KEY = "sportal.profileExtras.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const COVERAGE_OPTIONS = ["Full tuition", "Partial tuition", "Stipend / allowance", "Open to any"] as const;
export type CoveragePreference = (typeof COVERAGE_OPTIONS)[number];

/** Universities an athlete can say they are interested in: the ones that list scholarships. */
export const UNIVERSITY_OPTIONS: string[] = [...new Set(scholarships.map((s) => s.university))];

export const EXTRAS_LIMITS = {
  course: 80,
  photoDataUrl: 400_000, // characters; a 512px JPEG is far below this
  photoUploadBytes: 5 * 1024 * 1024,
  videoUrl: 300,
} as const;

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** "approved": passed our checks. "pending": waiting on a review. "rejected": must be replaced. */
export type MediaStatus = "approved" | "pending" | "rejected";

export interface ShowcaseMedia {
  /** photo: a small `data:image/...` URL; video: an https link */
  value: string;
  status: MediaStatus;
}

export interface ScholarshipInterests {
  universities: string[];
  coverage: CoveragePreference | "";
  course: string;
}

export interface ProfileExtras {
  scholarship: ScholarshipInterests;
  photo: ShowcaseMedia | null;
  video: ShowcaseMedia | null;
}

export const EMPTY_EXTRAS: ProfileExtras = {
  scholarship: { universities: [], coverage: "", course: "" },
  photo: null,
  video: null,
};

export type ScholarshipErrors = Partial<Record<keyof ScholarshipInterests, string>>;

export class ExtrasValidationError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super(Object.values(errors)[0] ?? "Invalid value");
    this.name = "ExtrasValidationError";
  }
}

// ---------- validation ----------

/**
 * Partial saves are allowed (an empty field is just "not done yet"), but anything that IS filled
 * in must be valid. Completion then counts only fields that are filled in and valid.
 */
export function validateScholarship(s: ScholarshipInterests): ScholarshipErrors {
  const e: ScholarshipErrors = {};
  if (s.universities.some((u) => !UNIVERSITY_OPTIONS.includes(u)) || new Set(s.universities).size !== s.universities.length)
    e.universities = "Choose universities from the list.";
  if (s.coverage !== "" && !(COVERAGE_OPTIONS as readonly string[]).includes(s.coverage))
    e.coverage = "Choose a coverage preference from the list.";
  if (s.course.trim().length > EXTRAS_LIMITS.course)
    e.course = `Course must be ${EXTRAS_LIMITS.course} characters or fewer.`;
  return e;
}

const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "facebook.com", "fb.watch"];

/** Returns an error message, or null when `raw` is an https link to a supported video site. */
export function validateVideoUrl(raw: string): string | null {
  const t = raw.trim();
  if (t.length > EXTRAS_LIMITS.videoUrl) return "That link is too long.";
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return "Enter a full link starting with https://";
  }
  if (u.protocol !== "https:") return "Enter a full link starting with https://";
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (!VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)))
    return "Use a YouTube, Vimeo or Facebook video link.";
  if (u.pathname.replace(/\/+$/, "") === "" && !u.search) return "Link to the video itself, not the site's home page.";
  return null;
}

/** Checks a file before it is read. Returns an error message, or null when the file is acceptable. */
export function validatePhotoFile(f: { type: string; size: number }): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(f.type)) return "Use a JPG, PNG or WebP image.";
  if (f.size <= 0) return "That file is empty.";
  if (f.size > EXTRAS_LIMITS.photoUploadBytes) return "Photos can be up to 5 MB.";
  return null;
}

const PHOTO_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export function validatePhotoDataUrl(v: string): string | null {
  if (!PHOTO_DATA_URL.test(v)) return "That doesn't look like a valid image.";
  if (v.length > EXTRAS_LIMITS.photoDataUrl) return "That image is too large after resizing.";
  return null;
}

/** A media entry counts toward completion only when it is approved AND still passes its checks. */
export function isMediaUsable(kind: "photo" | "video", m: ShowcaseMedia | null): boolean {
  if (!m || m.status !== "approved") return false;
  return (kind === "photo" ? validatePhotoDataUrl(m.value) : validateVideoUrl(m.value)) === null;
}

// ---------- reading saved data defensively ----------

function readMedia(raw: unknown): ShowcaseMedia | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["value"] !== "string") return null;
  const status = r["status"];
  if (status !== "approved" && status !== "pending" && status !== "rejected") return null;
  return { value: r["value"], status };
}

function readExtras(raw: unknown): ProfileExtras {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return EMPTY_EXTRAS;
  const r = raw as Record<string, unknown>;
  let scholarship = EMPTY_EXTRAS.scholarship;
  const s = r["scholarship"];
  if (s && typeof s === "object" && !Array.isArray(s)) {
    const o = s as Record<string, unknown>;
    const candidate: ScholarshipInterests = {
      universities: Array.isArray(o["universities"])
        ? (o["universities"] as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
      coverage: typeof o["coverage"] === "string" ? (o["coverage"] as CoveragePreference | "") : "",
      course: typeof o["course"] === "string" ? o["course"] : "",
    };
    // keep the good parts, drop any field that fails validation
    const errs = validateScholarship(candidate);
    scholarship = {
      universities: errs.universities ? [] : candidate.universities,
      coverage: errs.coverage ? "" : candidate.coverage,
      course: errs.course ? "" : candidate.course,
    };
  }
  return { scholarship, photo: readMedia(r["photo"]), video: readMedia(r["video"]) };
}

// ---------- store ----------

export function createProfileExtrasStore(storage: StorageLike | null) {
  let cache: ProfileExtras | null = null;
  let cacheStamp = "";
  const listeners = new Set<() => void>();

  function load(): ProfileExtras {
    if (!storage) return EMPTY_EXTRAS;
    try {
      const raw = storage.getItem(scopedKey(BASE_KEY));
      return raw ? readExtras(JSON.parse(raw)) : EMPTY_EXTRAS;
    } catch {
      return EMPTY_EXTRAS;
    }
  }
  const getSnapshot = () => {
    if (cache === null || cacheStamp !== scopeStamp()) {
      cache = load();
      cacheStamp = scopeStamp();
    }
    return cache;
  };

  function commit(next: ProfileExtras) {
    cache = next;
    cacheStamp = scopeStamp();
    try {
      storage?.setItem(scopedKey(BASE_KEY), JSON.stringify(next));
    } catch {
      // storage full or blocked: keep working in memory
    }
    listeners.forEach((l) => l());
  }

  return {
    getSnapshot,
    getServerSnapshot: () => EMPTY_EXTRAS,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },

    /** Re-read from storage (used right after a new account is created). */
    refresh() {
      cache = null;
      listeners.forEach((l) => l());
    },

    /** Validates and saves. Throws ExtrasValidationError (nothing is saved) when anything is invalid. */
    saveScholarship(draft: ScholarshipInterests): ProfileExtras {
      const errors = validateScholarship(draft);
      if (Object.keys(errors).length) throw new ExtrasValidationError(errors as Record<string, string>);
      const next = {
        ...getSnapshot(),
        scholarship: { universities: [...draft.universities], coverage: draft.coverage, course: draft.course.trim() },
      };
      commit(next);
      return next;
    },

    /** `dataUrl` should be the already-resized image. Invalid images are refused and nothing changes. */
    setPhoto(dataUrl: string): ProfileExtras {
      const err = validatePhotoDataUrl(dataUrl);
      if (err) throw new ExtrasValidationError({ photo: err });
      const next = { ...getSnapshot(), photo: { value: dataUrl, status: "approved" as const } };
      commit(next);
      return next;
    },
    removePhoto() {
      commit({ ...getSnapshot(), photo: null });
    },

    setVideo(url: string): ProfileExtras {
      const err = validateVideoUrl(url);
      if (err) throw new ExtrasValidationError({ video: err });
      const next = { ...getSnapshot(), video: { value: url.trim(), status: "approved" as const } };
      commit(next);
      return next;
    },
    removeVideo() {
      commit({ ...getSnapshot(), video: null });
    },

    /** Hook for a future reviewer: mark an uploaded item approved / pending / rejected. */
    setMediaStatus(kind: "photo" | "video", status: MediaStatus) {
      const cur = getSnapshot();
      const m = cur[kind];
      if (!m) throw new Error(`There is no ${kind} to review.`);
      commit({ ...cur, [kind]: { ...m, status } });
    },
  };
}

const browserStorage = (): StorageLike | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const profileExtrasStore = createProfileExtrasStore(browserStorage());

export function useProfileExtras(): ProfileExtras {
  return useSyncExternalStore(
    profileExtrasStore.subscribe,
    profileExtrasStore.getSnapshot,
    profileExtrasStore.getServerSnapshot,
  );
}
