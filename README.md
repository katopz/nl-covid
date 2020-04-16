# nl-covid

😷 Side project in response to covid-19

## Purpose

- To provide, collect and reflect about `covid-19` in Data Science perspective.
- This is a `POC` for learning purpose, not ready for production. Please see `TODO` list below.

## Data Studio

- https://datastudio.google.com/s/o8bfzfFBkek
  ![image](https://user-images.githubusercontent.com/97060/78535721-d5cfcb00-7816-11ea-958f-99d9938b5cfc.png)

### How to

1. Go to `Data Studio` select JSON connector 👉 https://datastudio.google.com/data?search=json

2. Add data source from 👉 https://covid19.th-stat.com/api/open/timeline

3. Choose metric, dimension

4. Share report 👉 https://datastudio.google.com/s/o8bfzfFBkek

## BigQuery

- https://console.cloud.google.com/bigquery?project=nl-covid&p=nl-covid&d=covid19&page=dataset
  ![image](https://user-images.githubusercontent.com/97060/76939014-38296000-692a-11ea-8e1a-aa741eccdc92.png)

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
npm run serve
npm run dev
```

## TODO

- [x] Merge data instead of manually delete.
- [x] Present to `Data Studio`.
- [x] Auto fetch data with `Cloud Schedule` via Cloud Function.
- [ ] Made prediction with `BigQuery ML`.

## Credit

- https://covid19.workpointnews.com/
- https://github.com/COVID19-TCDG/datasets
