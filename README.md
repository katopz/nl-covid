# nl-covid

😷 Side project in response to covid-19

## Purpose

- To provide, collect and reflect about `covid-19` in Data Science perspective.
- This is a `POC` for learning purpose, not ready for production. Please see `TODO` list below.

![image](https://user-images.githubusercontent.com/97060/76939014-38296000-692a-11ea-8e1a-aa741eccdc92.png)

## BigQuery

- https://console.cloud.google.com/bigquery?project=nl-covid&p=nl-covid&d=covid19&page=dataset

```SQL
SELECT
  *,
  ROUND(100 * deaths/confirmed, 2) AS death_percent
FROM
  `nl-covid.covid19.trend`
ORDER BY
  date DESC
```

## Dev

```
cd firebase/functions
# See : https://cloud.google.com/docs/authentication/getting-started
export GOOGLE_APPLICATION_CREDENTIALS=.credential.json
npm run dev
```

## TODO

- [x] Merge data instead of manually delete.
- [ ] Present to `Data Studio`.
- [ ] Made prediction with `BigQuery ML`.
- [ ] Auto fetch data with `Cloud Schedule`.

## Credit

- https://covid19.workpointnews.com/
