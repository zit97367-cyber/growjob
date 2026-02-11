export type FeedJob = {
  title: string;
  company: string;
  location?: string;
  isRemote: boolean;
  matchReason: string;
};

export function filterJobsByTags<T extends FeedJob>(jobs: T[], selectedTags: string[], remoteOnly: boolean): T[] {
  const normalizedTags = selectedTags.map((tag) => tag.toLowerCase());

  return jobs.filter((job) => {
    if (remoteOnly && !job.isRemote) {
      return false;
    }

    if (normalizedTags.length === 0) {
      return true;
    }

    const haystack = `${job.title} ${job.company} ${job.location ?? ""} ${job.matchReason}`.toLowerCase();
    return normalizedTags.some((tag) => haystack.includes(tag));
  });
}
