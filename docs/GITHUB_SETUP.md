# GitHub Setup

## Create Repository and Push

```bash
cd /Users/fazlayrabby/Downloads/Tracer
git init
git add .
git commit -m "chore: bootstrap tracer foundation"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Enable CI Protection

In GitHub repository settings:

1. Go to Branches -> Add rule for `main`
2. Require pull request before merging
3. Require status checks to pass
4. Select `CI / quality`

## Recommended Secrets (if using OAuth/deploy)

- `AUTH_SECRET`
- `GITHUB_ID`
- `GITHUB_SECRET`
