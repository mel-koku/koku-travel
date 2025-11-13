# Dependency Resolution Notes

## Issue
When trying to update `@sanity/cli`, npm encountered peer dependency conflicts:
- `next-sanity@5.5.9` expected `@sanity/icons@^2.0.0`, but Sanity v3 uses `@sanity/icons@^3.0.0`
- React 19 conflicts with some Sanity packages expecting React 18
- `@sanity/client` version mismatches

## Solution
Updated `next-sanity` from `^5.5.9` to `^7.0.0` (installed as `7.1.4`), which is compatible with:
- Sanity v3 (`sanity@^3.60.0`)
- React 19
- `@sanity/icons@^3.0.0`

## Installation
Dependencies were installed using `--legacy-peer-deps` flag to handle remaining peer dependency warnings:

```bash
npm install --legacy-peer-deps
```

## Current Versions
- `next-sanity`: `7.1.4`
- `sanity`: `^3.60.0`
- `@sanity/client`: `^6.21.3`
- `react`: `19.2.0`

## Notes
- The `--legacy-peer-deps` flag may be needed for future installations
- Some peer dependency warnings may persist but shouldn't affect functionality
- Consider adding `.npmrc` file with `legacy-peer-deps=true` to avoid specifying the flag each time

## Future Updates
When updating Sanity packages, use:
```bash
npm install --legacy-peer-deps
```

Or create `.npmrc` file:
```
legacy-peer-deps=true
```

