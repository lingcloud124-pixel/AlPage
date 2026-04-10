export class ImageHandler {
  private cache: Map<string, string>;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.cache = new Map();
    this.projectRoot = projectRoot || '';
  }

  resolveImageUrl(absolutePath: string): string {
    if (!absolutePath) {
      return '';
    }

    const cached = this.cache.get(absolutePath);
    if (cached !== undefined) {
      return cached;
    }

    let result: string;

    if (absolutePath.startsWith('/@fs/')) {
      result = absolutePath;
    } else if (absolutePath.startsWith('http://') || absolutePath.startsWith('https://')) {
      result = absolutePath;
    } else if (this.projectRoot && !absolutePath.startsWith('/')) {
      const resolved = `${this.projectRoot}/${absolutePath}`;
      result = `/@fs${resolved}`;
    } else {
      result = `/@fs${absolutePath}`;
    }

    this.cache.set(absolutePath, result);
    return result;
  }

  async preload(urls: string[]): Promise<void> {
    const promises = urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        if (!url) {
          resolve();
          return;
        }

        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });
    });

    await Promise.all(promises);
  }

  extractImagePaths(node: any): string[] {
    const paths = new Set<string>();

    const extract = (node: any) => {
      if (!node) return;

      if (node.fill) {
        const fill = node.fill;
        if (fill.type === 'image') {
          if (fill.enabled !== false && fill.url) {
            paths.add(fill.url);
          }
        }
      }

      if (node.children) {
        for (const child of node.children) {
          extract(child);
        }
      }

      if (node.descendants) {
        for (const descendant of Object.values(node.descendants)) {
          extract(descendant);
        }
      }
    };

    extract(node);
    return Array.from(paths);
  }
}