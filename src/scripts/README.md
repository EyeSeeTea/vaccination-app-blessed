## Rename campaigns

```shell
$ yarn run-script src/scripts/rename-campaigns.ts campaigns.xlsx http://localhost:8080 admin:district
```

Expected format on the XSLX file:

-   The first sheet will be used.
-   Headers (at row 2): "Current", "Name", "Id", "Year", "Month", "PRE/REAC", "Mission", "Project".
