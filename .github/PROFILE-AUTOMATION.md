# Profile automation

- **Generate profile visuals** updates the Snake animation and 3D contribution calendar daily at 06:41 UTC (03:41 in Sao Paulo).
- **Update profile activity** refreshes recent public activity every six hours.
- Both workflows support manual runs from the repository's Actions tab and share a concurrency group to avoid simultaneous automated commits.

## First run

Push the workflow files to the default branch (main or master) of CodaxiKing/CodaxiKing. The visuals workflow runs on that push. You can also select Actions > Generate profile visuals > Run workflow.

The images referenced by README.md are generated and committed by the first successful run; they will not exist before then. No personal access token or additional secrets are required. GitHub Actions must be enabled, and repository rules must allow the workflow token to push generated commits to the default branch.

## Sources

- Snake: https://github.com/Platane/snk
- 3D calendar: https://github.com/yoshi389111/github-profile-3d-contrib
- Recent activity: https://github.com/jamesgeorge007/github-activity-readme
