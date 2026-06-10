// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Remote Rocketship OpenClaw provider — hits the POST /api/openclaw/jobs endpoint.
// Requires RR_API_KEY env var (Bearer token from remoterocketship.com/account).
// Set `provider: remoterocketship` on a tracked_companies entry to activate.
//
// Optional portals.yml fields on the entry (under `rr_filters:`):
//   minSalaryFilter               number   Minimum annual USD salary (null = no floor)
//   showJobsWithoutSalaryWithMinSalaryFilter  boolean  Include listings that omit salary
//   seniorityFilters              string[] ["entry-level","junior","mid","senior","expert"]
//   jobTitleFilters               string[] Override canonical RR title list (default: all)
//   locationFilters               string[] Country names, e.g. ["Canada","United States"]
//   techStackFilters              string[] e.g. ["Go","Python","TypeScript"]
//   industriesFilters             string[] e.g. ["SaaS","Artificial Intelligence"]
//   excludeIndustriesFilters      string[] Industries to block
//   keywordFilters                string[] Extra include keywords
//   excludedKeywordFilters        string[] Extra exclude keywords
//   sortBy                        string   "DateAdded" | "Salary"
//   itemsPerPage                  number   1–50 (default 50)

const API_URL = 'https://www.remoterocketship.com/api/openclaw/jobs';
const MAX_PAGES = 10;

/** @type {Provider} */
export default {
  id: 'remoterocketship',

  detect(entry) {
    return entry.provider === 'remoterocketship' ? { url: API_URL } : null;
  },

  async fetch(entry, ctx) {
    const apiKey = process.env.RR_API_KEY;
    if (!apiKey) {
      throw new Error(
        'remoterocketship: RR_API_KEY env var not set — ' +
        'add it to your .env file (get key from remoterocketship.com/account)'
      );
    }

    const rr = entry.rr_filters ?? {};
    const baseFilters = {
      showRemoteJobs: true,
      showOnsiteJobs: false,
      showHybridJobs: false,
      employmentTypeFilters: ['full-time'],
      sortBy: 'DateAdded',
      itemsPerPage: 50,
      ...rr,
    };

    const jobs = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const json = await ctx.fetchJson(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          filters: { ...baseFilters, page },
          includeJobDescription: false,
        }),
      });

      const postings = Array.isArray(json?.jobOpenings) ? json.jobOpenings : [];
      for (const j of postings) {
        if (!j.url) continue;
        jobs.push({
          title: j.roleTitle ?? '',
          url: j.url,
          company: j.company?.name ?? entry.name,
          location: '',
        });
      }

      if (!json?.pagination?.hasNextPage || postings.length === 0) break;
    }

    return jobs;
  },
};
