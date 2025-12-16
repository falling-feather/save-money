export class GithubAPI {
    constructor() {
        this.token = localStorage.getItem('gh_token') || '';
        this.repo = localStorage.getItem('gh_repo') || '';
    }

    setCredentials(token, repo) {
        this.token = token;
        this.repo = repo;
        localStorage.setItem('gh_token', token);
        localStorage.setItem('gh_repo', repo);
    }

    async fetchFile(fileName) {
        if (!this.token || !this.repo) throw new Error('Auth Missing');
        
        const url = `https://api.github.com/repos/${this.repo}/contents/${fileName}`;
        const res = await fetch(url, {
            headers: { 
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (res.status === 404) return null; // 文件不存在
        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        // 处理中文编码问题
        const content = decodeURIComponent(escape(window.atob(data.content.replace(/\n/g, ""))));
        return { content: JSON.parse(content), sha: data.sha };
    }

    async saveFile(fileName, contentObj, sha) {
        const url = `https://api.github.com/repos/${this.repo}/contents/${fileName}`;
        // 处理中文编码问题
        const contentBase64 = window.btoa(unescape(encodeURIComponent(JSON.stringify(contentObj))));
        
        const body = {
            message: "Update from Starry Finance",
            content: contentBase64,
            sha: sha // 新建时为 undefined
        };

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }
}