import axios from "axios";

const GITHUB_API_TIMEOUT = 10000;
const GITHUB_USER_AGENT = "TON-IDE-Bot";

export interface GitHubSourceFile {
  path: string;
  content: string;
  extension: string;
}

const SUPPORTED_EXTENSIONS = [".fc", ".func", ".tact"];

function getExtension(filePath: string): string {
  return filePath.slice(filePath.lastIndexOf("."));
}

function isSupportedFile(filePath: string): boolean {
  const extension = getExtension(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(extension);
}

interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}

export class GitHubService {
  constructor(private githubToken = "") {}

  private get headers() {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": GITHUB_USER_AGENT,
    };

    if (this.githubToken) {
      headers.Authorization = `Bearer ${this.githubToken}`;
    }

    return headers;
  }

  async extractTonFiles(githubUrl: string): Promise<GitHubSourceFile[]> {
    const parsed = this.parseGithubUrl(githubUrl);
    const ref = parsed.ref || (await this.getDefaultBranch(parsed.owner, parsed.repo));
    return this.fetchContents(parsed.owner, parsed.repo, parsed.path, ref);
  }

  private parseGithubUrl(githubUrl: string): ParsedGitHubUrl {
    const url = new URL(githubUrl.trim());
    if (url.hostname === "raw.githubusercontent.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 4) {
        throw new Error("Invalid GitHub raw URL");
      }
      const [owner, repo, ref, ...rest] = parts;
      return { owner, repo, path: rest.join("/"), ref };
    }

    if (!url.hostname.endsWith("github.com")) {
      throw new Error("Only GitHub links are supported");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Invalid GitHub repository URL");
    }

    const [owner, repo, type, ref, ...rest] = parts;
    if (type === "blob" || type === "tree") {
      return {
        owner,
        repo,
        path: rest.join("/"),
        ref,
      };
    }

    if (type === "raw") {
      return {
        owner,
        repo,
        path: rest.join("/"),
        ref,
      };
    }

    return {
      owner,
      repo,
      path: rest.join("/"),
    };
  }

  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: this.headers,
      timeout: GITHUB_API_TIMEOUT,
    });
    return response.data.default_branch;
  }

  private async fetchContents(owner: string, repo: string, path: string, ref: string): Promise<GitHubSourceFile[]> {
    const encodedPath = encodeURIComponent(path || "");
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}${path ? `?ref=${encodeURIComponent(ref)}` : `?ref=${encodeURIComponent(ref)}`}`;
    const response = await axios.get(url, {
      headers: this.headers,
      timeout: GITHUB_API_TIMEOUT,
    });

    const payload = response.data;
    if (Array.isArray(payload)) {
      const results = await Promise.all(payload.map((item) => this.fetchItem(owner, repo, item, ref)));
      return results.flat().filter(Boolean) as GitHubSourceFile[];
    }

    if (payload.type === "file") {
      if (!isSupportedFile(payload.path)) {
        return [];
      }
      return [await this.loadGitHubFile(payload)];
    }

    return [];
  }

  private async fetchItem(owner: string, repo: string, item: any, ref: string): Promise<GitHubSourceFile[] | GitHubSourceFile> {
    if (item.type === "dir") {
      return this.fetchContents(owner, repo, item.path, ref);
    }

    if (item.type === "file" && isSupportedFile(item.path)) {
      return this.loadGitHubFile(item);
    }

    return [];
  }

  private async loadGitHubFile(item: any): Promise<GitHubSourceFile> {
    if (!item.content) {
      const response = await axios.get(item.url, {
        headers: this.headers,
        timeout: GITHUB_API_TIMEOUT,
      });
      item = response.data;
    }

    const content = Buffer.from(item.content, item.encoding).toString("utf8");
    return {
      path: item.path,
      content,
      extension: getExtension(item.path).toLowerCase(),
    };
  }
}
