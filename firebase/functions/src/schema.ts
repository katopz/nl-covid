// https://github.com/firebase/extensions/blob/next/firestore-bigquery-export/firestore-bigquery-change-tracker/src/bigquery/schema.ts
/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type BigQueryFieldMode = 'NULLABLE' | 'REPEATED' | 'REQUIRED'
export type BigQueryFieldType = 'BOOLEAN' | 'INTEGER' | 'RECORD' | 'STRING' | 'DATE'
export type BigQueryField = {
  fields?: BigQueryField[]
  mode: BigQueryFieldMode
  name: string
  type: BigQueryFieldType
}

export const bigQueryField = (
  name: string,
  type: BigQueryFieldType,
  mode?: BigQueryFieldMode,
  fields?: BigQueryField[]
): BigQueryField => ({
  fields,
  mode: mode || 'NULLABLE',
  name,
  type
})

export const TREND_FIELDS = ['date', 'deaths', 'confirmed', 'recovered']
export const WORLD_FIELDS = ['name', 'alpha2', 'alpha3', 'numeric', 'deaths', 'confirmed', 'recovered', 'travel']
export const CASES_FIELDS = [
  'id',
  'number',
  'age',
  'gender',
  'job',
  'origin',
  'type',
  'meta',
  'status',
  'statementDate',
  'recoveredDate',
  'nationality',
  'nationalityAlpha2',
  'detectedAt',
  'treatAt',
  'references'
]

export const schema: any = {
  trend: [
    bigQueryField('date', 'DATE', 'REQUIRED'),
    bigQueryField('deaths', 'INTEGER', 'NULLABLE'),
    bigQueryField('confirmed', 'INTEGER', 'NULLABLE'),
    bigQueryField('recovered', 'INTEGER', 'NULLABLE')
  ],
  world: [
    bigQueryField('name', 'STRING', 'REQUIRED'),
    bigQueryField('alpha2', 'STRING', 'NULLABLE'),
    bigQueryField('alpha3', 'STRING', 'NULLABLE'),
    bigQueryField('numeric', 'STRING', 'NULLABLE'),
    bigQueryField('deaths', 'INTEGER', 'NULLABLE'),
    bigQueryField('confirmed', 'INTEGER', 'NULLABLE'),
    bigQueryField('recovered', 'INTEGER', 'NULLABLE'),
    bigQueryField('travel', 'STRING', 'NULLABLE')
  ],
  cases: [
    bigQueryField('id', 'STRING', 'REQUIRED'),
    bigQueryField('number', 'INTEGER', 'NULLABLE'),
    bigQueryField('age', 'INTEGER', 'NULLABLE'),
    bigQueryField('gender', 'STRING', 'NULLABLE'),
    bigQueryField('job', 'STRING', 'NULLABLE'),
    bigQueryField('origin', 'STRING', 'NULLABLE'),
    bigQueryField('type', 'STRING', 'NULLABLE'),
    bigQueryField('meta', 'STRING', 'NULLABLE'),
    bigQueryField('status', 'STRING', 'NULLABLE'),
    bigQueryField('statementDate', 'DATE', 'NULLABLE'),
    bigQueryField('recoveredDate', 'DATE', 'NULLABLE'),
    bigQueryField('nationality', 'STRING', 'NULLABLE'),
    bigQueryField('nationalityAlpha2', 'STRING', 'NULLABLE'),
    bigQueryField('detectedAt', 'STRING', 'NULLABLE'),
    bigQueryField('treatAt', 'STRING', 'NULLABLE'),
    {
      name: 'references',
      type: 'RECORD',
      mode: 'REPEATED',
      fields: [
        {
          name: 'url',
          type: 'STRING',
          mode: 'NULLABLE'
        }
      ]
    }
  ]
}
